import { __ } from "@wordpress/i18n";
import { TEXT_DOMAIN } from "../constants";
import "./view.css";

type FlowGallerySwipeState = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
};

type FlowGalleryRecord = {
  element: HTMLElement;
  slides: HTMLElement[];
  stageElement: HTMLElement;
  slidesElement: HTMLElement;
  defaultIndex: number;
  activeIndex: number;
  loop: boolean;
  showCounter: boolean;
  showThumbnails: boolean;
  showCaptions: boolean;
  counterElement: HTMLElement;
  captionElement: HTMLElement;
  thumbnailsElement: HTMLElement;
  thumbnailButtons: HTMLButtonElement[];
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  swipeState?: FlowGallerySwipeState;
  suppressClick: boolean;
  transitionTimeoutId?: number;
};

type FlowModalOpenEventDetail = {
  modalElement?: HTMLDialogElement;
  triggerElement?: HTMLElement;
};

const GALLERY_SELECTOR = '[data-wps-flow-gallery="true"]';
const SWIPE_START_THRESHOLD = 12;
const SWIPE_COMMIT_THRESHOLD = 56;
const MAX_DRAG_OFFSET = 120;
const ENTER_TRANSITION_DURATION = 220;
const records = new WeakMap<HTMLElement, FlowGalleryRecord>();
let galleryRuntimeInitialized = false;

function normalizeGalleryId(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePositiveInteger(
  value: string | null | undefined,
  fallbackValue: number,
): number {
  const parsedValue = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallbackValue;
  }

  return parsedValue;
}

function parseBoolean(
  value: string | null | undefined,
  fallbackValue: boolean,
): boolean {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallbackValue;
}

function getClassTokenValue(element: HTMLElement, prefix: string): string {
  const matchingToken = Array.from(element.classList).find((token) =>
    token.startsWith(prefix),
  );

  return matchingToken ? matchingToken.slice(prefix.length).trim() : "";
}

function clampIndex(index: number, length: number, loop: boolean): number {
  if (length < 1) {
    return 0;
  }

  if (loop) {
    return ((index % length) + length) % length;
  }

  return Math.max(0, Math.min(index, length - 1));
}

function getTriggerGalleryId(triggerElement?: HTMLElement): string {
  if (!triggerElement) {
    return "";
  }

  return normalizeGalleryId(
    triggerElement.dataset.wpsFlowGalleryTarget ||
      getClassTokenValue(triggerElement, "wps-flow-gallery-target--"),
  );
}

function getTriggerGalleryIndex(triggerElement?: HTMLElement): number | null {
  if (!triggerElement) {
    return null;
  }

  const rawValue =
    triggerElement.dataset.wpsFlowGalleryIndex ||
    triggerElement.dataset.wpsFlowGalleryStart ||
    getClassTokenValue(triggerElement, "wps-flow-gallery-index--") ||
    getClassTokenValue(triggerElement, "wps-flow-gallery-start--");

  if (!rawValue) {
    return null;
  }

  return parsePositiveInteger(rawValue, 1) - 1;
}

function createNavigationButton(direction: "prev" | "next"): HTMLButtonElement {
  const button = document.createElement("button");
  const icon = document.createElement("span");

  button.type = "button";
  button.className = `wps-flow-gallery__nav wps-flow-gallery__nav--${direction}`;
  button.dataset.wpsFlowGalleryAction = direction;
  button.setAttribute(
    "aria-label",
    direction === "prev"
      ? __("Previous image", TEXT_DOMAIN)
      : __("Next image", TEXT_DOMAIN),
  );

  icon.className = "wps-flow-gallery__nav-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = direction === "prev" ? "‹" : "›";
  button.appendChild(icon);

  return button;
}

function isPlaceholderImageSource(value: string | null | undefined): boolean {
  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalizedValue === "") {
    return true;
  }

  return normalizedValue.startsWith("data:image/");
}

function getFirstSrcsetCandidate(value: string | null | undefined): string {
  const candidates = String(value ?? "")
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0] || "")
    .filter(Boolean);

  return (
    candidates.find((candidate) => !isPlaceholderImageSource(candidate)) || ""
  );
}

function resolveThumbnailSource(image: HTMLImageElement): string {
  const candidates = [
    image.currentSrc,
    image.getAttribute("data-src"),
    image.getAttribute("data-lazy-src"),
    image.getAttribute("data-orig-file"),
    image.getAttribute("data-large-file"),
    getFirstSrcsetCandidate(image.getAttribute("data-srcset")),
    getFirstSrcsetCandidate(image.getAttribute("data-lazy-srcset")),
    getFirstSrcsetCandidate(image.getAttribute("srcset")),
    image.getAttribute("src"),
  ];

  return (
    candidates.find((candidate) => !isPlaceholderImageSource(candidate)) ||
    String(image.currentSrc || image.src || "")
  );
}

function syncThumbnailSource(
  image: HTMLImageElement,
  thumbnailImage: HTMLImageElement,
): void {
  const resolvedSource = resolveThumbnailSource(image);

  if (resolvedSource !== "") {
    thumbnailImage.src = resolvedSource;
  }

  const sizesValue = image.getAttribute("sizes");
  if (sizesValue) {
    thumbnailImage.setAttribute("sizes", sizesValue);
  }
}

function observeThumbnailSource(
  image: HTMLImageElement,
  thumbnailImage: HTMLImageElement,
): void {
  syncThumbnailSource(image, thumbnailImage);
  image.addEventListener("load", () => {
    syncThumbnailSource(image, thumbnailImage);
  });

  const observer = new MutationObserver(() => {
    syncThumbnailSource(image, thumbnailImage);
  });

  observer.observe(image, {
    attributes: true,
    attributeFilter: [
      "src",
      "srcset",
      "sizes",
      "data-src",
      "data-lazy-src",
      "data-srcset",
      "data-lazy-srcset",
      "data-orig-file",
      "data-large-file",
    ],
  });
}

function createThumbnailButton(
  slide: HTMLElement,
  slideIndex: number,
): HTMLButtonElement {
  const button = document.createElement("button");
  const image = slide.querySelector<HTMLImageElement>("img");
  const thumbnailImage = document.createElement("img");
  const captionText =
    slide.querySelector("figcaption")?.textContent?.trim() || "";
  const altText = image?.alt?.trim() || captionText;

  button.type = "button";
  button.className = "wps-flow-gallery__thumbnail";
  button.dataset.wpsFlowGalleryThumbnailIndex = String(slideIndex);
  button.setAttribute(
    "aria-label",
    `${__("Show image", TEXT_DOMAIN)} ${slideIndex + 1}`,
  );

  if (image) {
    thumbnailImage.alt = altText;
    thumbnailImage.loading = "eager";
    thumbnailImage.decoding = "async";
    thumbnailImage.className = "wps-flow-gallery__thumbnail-image";
    observeThumbnailSource(image, thumbnailImage);
    button.appendChild(thumbnailImage);
  } else {
    button.textContent = String(slideIndex + 1);
  }

  return button;
}

function getSwipeThreshold(record: FlowGalleryRecord): number {
  const proportionalThreshold = Math.round(
    record.stageElement.clientWidth * 0.12,
  );

  return Math.min(
    MAX_DRAG_OFFSET,
    Math.max(SWIPE_COMMIT_THRESHOLD, proportionalThreshold),
  );
}

function setDragOffset(record: FlowGalleryRecord, offset: number): void {
  const clampedOffset = Math.max(
    -MAX_DRAG_OFFSET,
    Math.min(MAX_DRAG_OFFSET, offset),
  );

  record.slidesElement.style.setProperty(
    "--wps-flow-gallery-drag-offset",
    `${clampedOffset}px`,
  );
}

function clearDragOffset(record: FlowGalleryRecord): void {
  record.slidesElement.style.removeProperty("--wps-flow-gallery-drag-offset");
}

function endSwipe(record: FlowGalleryRecord): void {
  const activeSwipe = record.swipeState;

  if (
    activeSwipe &&
    typeof record.stageElement.releasePointerCapture === "function"
  ) {
    try {
      if (record.stageElement.hasPointerCapture?.(activeSwipe.pointerId)) {
        record.stageElement.releasePointerCapture(activeSwipe.pointerId);
      }
    } catch {
      // Ignore stale pointer-capture cleanup errors.
    }
  }

  record.swipeState = undefined;
  record.stageElement.classList.remove("is-dragging");
  clearDragOffset(record);
}

function clearEnterTransition(record: FlowGalleryRecord): void {
  if (record.transitionTimeoutId) {
    window.clearTimeout(record.transitionTimeoutId);
    record.transitionTimeoutId = undefined;
  }

  record.stageElement.classList.remove(
    "is-committing",
    "is-entering-from-left",
    "is-entering-from-right",
  );
}

function commitSwipeTransition(
  record: FlowGalleryRecord,
  direction: "next" | "prev",
): void {
  clearEnterTransition(record);

  record.stageElement.classList.add("is-committing");
  record.stageElement.classList.add(
    direction === "next" ? "is-entering-from-right" : "is-entering-from-left",
  );

  record.transitionTimeoutId = window.setTimeout(() => {
    clearEnterTransition(record);
  }, ENTER_TRANSITION_DURATION);
}

function isSwipeGestureTarget(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof Element)) {
    return false;
  }

  return !eventTarget.closest(".wps-flow-gallery__nav");
}

function updateGallery(record: FlowGalleryRecord, nextIndex: number): void {
  const clampedIndex = clampIndex(nextIndex, record.slides.length, record.loop);

  record.activeIndex = clampedIndex;

  record.slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === clampedIndex;

    slide.hidden = !isActive;
    slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    slide.classList.toggle("is-active", isActive);
  });

  record.element.dataset.wpsFlowGalleryActiveIndex = String(clampedIndex + 1);
  record.element.classList.toggle(
    "has-single-slide",
    record.slides.length <= 1,
  );
  record.thumbnailsElement.hidden =
    !record.showThumbnails || record.slides.length <= 1;

  record.prevButton.disabled =
    record.slides.length <= 1 || (!record.loop && clampedIndex === 0);
  record.nextButton.disabled =
    record.slides.length <= 1 ||
    (!record.loop && clampedIndex === record.slides.length - 1);

  record.thumbnailButtons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === clampedIndex;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");
  });

  if (record.showCounter && record.slides.length > 0) {
    record.counterElement.hidden = false;
    record.counterElement.textContent = `${clampedIndex + 1} / ${
      record.slides.length
    }`;
  } else {
    record.counterElement.hidden = true;
    record.counterElement.textContent = "";
  }

  if (record.showCaptions) {
    const activeCaption =
      record.slides[clampedIndex]?.querySelector("figcaption");

    if (activeCaption && activeCaption.innerHTML.trim() !== "") {
      record.captionElement.hidden = false;
      record.captionElement.innerHTML = activeCaption.innerHTML;
    } else {
      record.captionElement.hidden = true;
      record.captionElement.innerHTML = "";
    }
  } else {
    record.captionElement.hidden = true;
    record.captionElement.innerHTML = "";
  }
}

function attachSwipeHandlers(record: FlowGalleryRecord): void {
  const { stageElement } = record;

  stageElement.addEventListener("pointerdown", (event) => {
    if (
      record.slides.length <= 1 ||
      !event.isPrimary ||
      !isSwipeGestureTarget(event.target) ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    record.suppressClick = false;
    record.swipeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      isDragging: false,
    };

    if (typeof stageElement.setPointerCapture === "function") {
      try {
        stageElement.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional; continue without it.
      }
    }
  });

  stageElement.addEventListener("pointermove", (event) => {
    const activeSwipe = record.swipeState;

    if (!activeSwipe || activeSwipe.pointerId !== event.pointerId) {
      return;
    }

    activeSwipe.currentX = event.clientX;
    activeSwipe.currentY = event.clientY;

    const deltaX = activeSwipe.currentX - activeSwipe.startX;
    const deltaY = activeSwipe.currentY - activeSwipe.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (!activeSwipe.isDragging) {
      if (
        absDeltaX < SWIPE_START_THRESHOLD &&
        absDeltaY < SWIPE_START_THRESHOLD
      ) {
        return;
      }

      if (absDeltaX <= absDeltaY) {
        endSwipe(record);
        return;
      }

      activeSwipe.isDragging = true;
      record.stageElement.classList.add("is-dragging");
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    setDragOffset(record, deltaX);
  });

  const finishSwipe = (event: PointerEvent, cancelled = false): void => {
    const activeSwipe = record.swipeState;

    if (!activeSwipe || activeSwipe.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = activeSwipe.currentX - activeSwipe.startX;
    const absDeltaX = Math.abs(deltaX);
    const threshold = getSwipeThreshold(record);
    const shouldNavigate =
      !cancelled && activeSwipe.isDragging && absDeltaX >= threshold;

    record.suppressClick = activeSwipe.isDragging;

    if (shouldNavigate) {
      const direction = deltaX < 0 ? "next" : "prev";

      commitSwipeTransition(record, direction);
      endSwipe(record);
      updateGallery(
        record,
        record.activeIndex + (direction === "next" ? 1 : -1),
      );
      return;
    }

    endSwipe(record);
  };

  stageElement.addEventListener("pointerup", (event) => {
    finishSwipe(event, false);
  });

  stageElement.addEventListener("pointercancel", (event) => {
    finishSwipe(event, true);
  });

  stageElement.addEventListener(
    "click",
    (event) => {
      if (!record.suppressClick) {
        return;
      }

      record.suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
}

function getGalleryRecord(element: HTMLElement): FlowGalleryRecord | null {
  const existingRecord = records.get(element);
  if (existingRecord) {
    return existingRecord;
  }

  const slides = Array.from(element.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.matches("figure.wp-block-image, .wp-block-image"),
  );

  if (slides.length === 0) {
    return null;
  }

  const stageElement = document.createElement("div");
  const slidesElement = document.createElement("div");
  const metaElement = document.createElement("div");
  const thumbnailsElement = document.createElement("div");
  const counterElement = document.createElement("div");
  const captionElement = document.createElement("div");
  const prevButton = createNavigationButton("prev");
  const nextButton = createNavigationButton("next");
  const thumbnailButtons: HTMLButtonElement[] = [];

  element.classList.add("wps-flow-gallery");
  element.setAttribute("role", "group");
  element.setAttribute("aria-roledescription", __("carousel", TEXT_DOMAIN));

  stageElement.className = "wps-flow-gallery__stage";
  slidesElement.className = "wps-flow-gallery__slides";
  thumbnailsElement.className = "wps-flow-gallery__thumbnails";
  metaElement.className = "wps-flow-gallery__meta";
  counterElement.className = "wps-flow-gallery__counter";
  counterElement.setAttribute("aria-live", "polite");
  captionElement.className = "wps-flow-gallery__caption";

  slides.forEach((slide, slideIndex) => {
    slide.classList.add("wps-flow-gallery__slide");
    slide.dataset.wpsFlowGallerySlide = String(slideIndex + 1);
    slide.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      image.draggable = false;
    });
    slidesElement.appendChild(slide);

    const thumbnailButton = createThumbnailButton(slide, slideIndex);
    thumbnailsElement.appendChild(thumbnailButton);
    thumbnailButtons.push(thumbnailButton);
  });

  stageElement.append(prevButton, slidesElement, nextButton);
  thumbnailsElement.hidden = true;
  metaElement.append(counterElement, captionElement);
  element.append(stageElement, thumbnailsElement, metaElement);

  const record: FlowGalleryRecord = {
    element,
    slides,
    stageElement,
    slidesElement,
    defaultIndex:
      parsePositiveInteger(element.dataset.wpsFlowGalleryStartIndex, 1) - 1,
    activeIndex: 0,
    loop: parseBoolean(element.dataset.wpsFlowGalleryLoop, true),
    showCounter: parseBoolean(element.dataset.wpsFlowGalleryShowCounter, true),
    showThumbnails: parseBoolean(
      element.dataset.wpsFlowGalleryShowThumbnails,
      true,
    ),
    showCaptions: parseBoolean(
      element.dataset.wpsFlowGalleryShowCaptions,
      true,
    ),
    counterElement,
    captionElement,
    thumbnailsElement,
    thumbnailButtons,
    prevButton,
    nextButton,
    suppressClick: false,
  };

  records.set(element, record);
  attachSwipeHandlers(record);
  updateGallery(record, record.defaultIndex);

  return record;
}

function scanGalleries(root: ParentNode): FlowGalleryRecord[] {
  const galleryRecords: FlowGalleryRecord[] = [];

  if (root instanceof HTMLElement && root.matches(GALLERY_SELECTOR)) {
    const rootRecord = getGalleryRecord(root);
    if (rootRecord) {
      galleryRecords.push(rootRecord);
    }
  }

  root.querySelectorAll<HTMLElement>(GALLERY_SELECTOR).forEach((element) => {
    const record = getGalleryRecord(element);
    if (record) {
      galleryRecords.push(record);
    }
  });

  return galleryRecords;
}

function handleModalOpen(event: Event): void {
  const detail = (event as CustomEvent<FlowModalOpenEventDetail>).detail ?? {};
  const modalElement = detail.modalElement;

  if (!(modalElement instanceof HTMLDialogElement)) {
    return;
  }

  const modalGalleryRecords = scanGalleries(modalElement);
  if (modalGalleryRecords.length === 0) {
    return;
  }

  modalGalleryRecords.forEach((record) => {
    clearEnterTransition(record);
    updateGallery(record, record.defaultIndex);
  });

  const triggerGalleryId = getTriggerGalleryId(detail.triggerElement);
  const triggerGalleryIndex = getTriggerGalleryIndex(detail.triggerElement);

  const targetRecords = triggerGalleryId
    ? modalGalleryRecords.filter(
        (record) =>
          normalizeGalleryId(record.element.dataset.wpsFlowGalleryId) ===
          triggerGalleryId,
      )
    : modalGalleryRecords.length === 1
    ? modalGalleryRecords
    : [];

  if (targetRecords.length === 0) {
    return;
  }

  targetRecords.forEach((record) => {
    updateGallery(
      record,
      triggerGalleryIndex === null ? record.defaultIndex : triggerGalleryIndex,
    );
  });
}

function handleGalleryClick(event: Event): void {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionElement = event.target.closest<HTMLElement>(
    "[data-wps-flow-gallery-action]",
  );
  const thumbnailElement = event.target.closest<HTMLElement>(
    "[data-wps-flow-gallery-thumbnail-index]",
  );
  const sourceElement = actionElement || thumbnailElement;

  if (!sourceElement) {
    return;
  }

  const galleryElement = sourceElement.closest<HTMLElement>(GALLERY_SELECTOR);
  if (!galleryElement) {
    return;
  }

  const record = getGalleryRecord(galleryElement);
  if (!record) {
    return;
  }

  clearEnterTransition(record);

  if (thumbnailElement) {
    const thumbnailIndex = Number.parseInt(
      thumbnailElement.dataset.wpsFlowGalleryThumbnailIndex || "",
      10,
    );

    if (Number.isFinite(thumbnailIndex)) {
      event.preventDefault();
      updateGallery(record, thumbnailIndex);
    }

    return;
  }

  const action = actionElement?.dataset.wpsFlowGalleryAction;
  if (action !== "prev" && action !== "next") {
    return;
  }

  event.preventDefault();
  updateGallery(record, record.activeIndex + (action === "next" ? 1 : -1));
}

function handleGalleryKeydown(event: KeyboardEvent): void {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (!(event.target instanceof Element)) {
    return;
  }

  const galleryElement = event.target.closest<HTMLElement>(GALLERY_SELECTOR);
  if (!galleryElement) {
    return;
  }

  const record = getGalleryRecord(galleryElement);
  if (!record) {
    return;
  }

  clearEnterTransition(record);

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    updateGallery(record, record.activeIndex - 1);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    updateGallery(record, record.activeIndex + 1);
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    updateGallery(record, 0);
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    updateGallery(record, record.slides.length - 1);
  }
}

export function initFlowGalleryRuntime(): void {
  if (galleryRuntimeInitialized) {
    scanGalleries(document);
    return;
  }

  galleryRuntimeInitialized = true;
  scanGalleries(document);
  document.addEventListener("wps-flow-modal:open", handleModalOpen);
  document.addEventListener("click", handleGalleryClick);
  document.addEventListener("keydown", handleGalleryKeydown);
}
