import type {
  FlowModalActionContext,
  FlowModalActionHandler,
  FlowModalApi,
  FlowModalOptions,
} from "@smart-cloud/flow-core";
import "./view.css";

type FlowWindowRoot = {
  plugins?: {
    flow?: Record<string, unknown>;
  };
};

type ModalLifecycleName =
  | "before-open"
  | "open"
  | "before-close"
  | "close"
  | "ok"
  | "cancel"
  | "error";

type ModalEventDetail = {
  modalId: string;
  modalElement: HTMLDialogElement;
  triggerElement?: HTMLElement;
  actionName?: string;
  returnValue?: string;
  originalEvent?: Event;
  error?: unknown;
};

type ModalRecord = {
  id: string;
  element: HTMLDialogElement;
  options: Required<FlowModalOptions> & {
    openOnHash: boolean;
    hashValue: string;
  };
  cleanupController: AbortController;
  lastTrigger?: HTMLElement;
};

type ModalRuntimeState = {
  records: Map<string, ModalRecord>;
  actions: Map<string, FlowModalActionHandler>;
  fallbackOpenCount: number;
  observer?: MutationObserver;
};

declare global {
  interface Window {
    __smartcloudFlowModalApi?: FlowModalApi;
    __smartcloudFlowModalRuntimeState?: ModalRuntimeState;
    __smartcloudFlowModalRuntimeInitialized?: boolean;
  }
}

const DEFAULT_OPTIONS: Required<FlowModalOptions> & {
  openOnHash: boolean;
  hashValue: string;
} = {
  openOnHash: true,
  hashValue: "",
  closeOnEsc: true,
  closeOnBackdrop: true,
  closeOnCancel: true,
  closeOnOk: true,
  closeOnFlowSubmitSuccess: false,
  restoreFocusOnClose: true,
  preventBackgroundScrollFallback: true,
  dispatchLifecycleEvents: true,
  defaultOkAction: "",
  defaultCancelAction: "",
  busyText: "",
  errorText: "",
};

const ACTION_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,80}$/;
const MODAL_SELECTOR = "dialog.wps-flow-modal[data-wps-flow-modal-id]";

const runtimeState =
  window.__smartcloudFlowModalRuntimeState ??
  (window.__smartcloudFlowModalRuntimeState = {
    records: new Map<string, ModalRecord>(),
    actions: new Map<string, FlowModalActionHandler>(),
    fallbackOpenCount: 0,
  });

function getFlowRoot(): Record<string, unknown> {
  const wpsuiteWindow = window as unknown as { WpSuite?: FlowWindowRoot };
  const root = (wpsuiteWindow.WpSuite ??= {});
  root.plugins ??= {};
  root.plugins.flow ??= {};
  return root.plugins.flow as Record<string, unknown>;
}

function getModalIdFromElement(element: HTMLDialogElement): string {
  return (element.dataset.wpsFlowModalId || "").trim();
}

function normalizeHash(value: string | null | undefined): string {
  return (value || "").replace(/^#/, "").trim();
}

function parseModalOptions(
  element: HTMLDialogElement,
  overrides?: Partial<FlowModalOptions> & {
    openOnHash?: boolean;
    hashValue?: string;
  },
): Required<FlowModalOptions> & { openOnHash: boolean; hashValue: string } {
  let parsed: Record<string, unknown> = {};
  const rawOptions = element.dataset.wpsFlowModalOptions;

  if (rawOptions) {
    try {
      const maybeParsed = JSON.parse(rawOptions);
      if (maybeParsed && typeof maybeParsed === "object") {
        parsed = maybeParsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn("[Flow] Failed to parse modal options", {
        modalId: getModalIdFromElement(element),
        error,
      });
    }
  }

  return {
    ...DEFAULT_OPTIONS,
    ...parsed,
    ...overrides,
    openOnHash:
      overrides?.openOnHash ??
      (typeof parsed.openOnHash === "boolean"
        ? parsed.openOnHash
        : DEFAULT_OPTIONS.openOnHash),
    hashValue: normalizeHash(
      String(
        overrides?.hashValue ?? parsed.hashValue ?? DEFAULT_OPTIONS.hashValue,
      ),
    ),
  };
}

function isRecordOpen(record: ModalRecord): boolean {
  return (
    record.element.open ||
    record.element.classList.contains("wps-flow-modal--fallback-open")
  );
}

function focusPanel(record: ModalRecord): void {
  const panel = record.element.querySelector<HTMLElement>(
    ".wps-flow-modal__panel",
  );
  if (!panel) {
    return;
  }

  window.requestAnimationFrame(() => {
    try {
      panel.focus({ preventScroll: true });
    } catch {
      panel.focus();
    }
  });
}

function restoreFocus(record: ModalRecord): void {
  if (!record.options.restoreFocusOnClose) {
    record.lastTrigger = undefined;
    return;
  }

  const nextFocusTarget = record.lastTrigger;
  record.lastTrigger = undefined;

  if (!nextFocusTarget || !nextFocusTarget.isConnected) {
    return;
  }

  window.requestAnimationFrame(() => {
    try {
      nextFocusTarget.focus({ preventScroll: true });
    } catch {
      nextFocusTarget.focus();
    }
  });
}

function setBusyState(record: ModalRecord, busy: boolean): void {
  record.element.classList.toggle("is-busy", busy);
  record.element.setAttribute("aria-busy", busy ? "true" : "false");

  record.element
    .querySelectorAll<HTMLElement>(
      "[data-wps-flow-modal-ok], .wps-flow-modal-ok",
    )
    .forEach((element) => {
      element.setAttribute("aria-disabled", busy ? "true" : "false");
      if (
        element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement
      ) {
        element.disabled = busy;
      }
    });
}

function updateFallbackBodyScroll(): void {
  const hasFallbackOpen = runtimeState.fallbackOpenCount > 0;
  document.documentElement.classList.toggle(
    "wps-flow-modal-fallback-has-open",
    hasFallbackOpen,
  );
  document.body.classList.toggle(
    "wps-flow-modal-fallback-has-open",
    hasFallbackOpen,
  );
}

function emitModalEvent(
  record: ModalRecord,
  name: ModalLifecycleName,
  detail: Omit<ModalEventDetail, "modalId" | "modalElement"> = {},
  cancelable = false,
): boolean {
  if (!record.options.dispatchLifecycleEvents) {
    return true;
  }

  const event = new CustomEvent<ModalEventDetail>(`wps-flow-modal:${name}`, {
    detail: {
      modalId: record.id,
      modalElement: record.element,
      triggerElement: detail.triggerElement ?? record.lastTrigger,
      actionName: detail.actionName,
      returnValue: detail.returnValue,
      originalEvent: detail.originalEvent,
      error: detail.error,
    },
    bubbles: true,
    composed: true,
    cancelable,
  });

  return record.element.dispatchEvent(event);
}

function getNearestModalRecord(
  triggerElement: HTMLElement,
): ModalRecord | undefined {
  const modalElement =
    triggerElement.closest<HTMLDialogElement>(MODAL_SELECTOR);
  if (!modalElement) {
    return undefined;
  }

  return runtimeState.records.get(getModalIdFromElement(modalElement));
}

function getClassTokenValue(element: HTMLElement, prefix: string): string {
  for (const token of Array.from(element.classList)) {
    if (token.startsWith(prefix)) {
      return token.slice(prefix.length).trim();
    }
  }

  return "";
}

function getActionName(
  triggerElement: HTMLElement,
  fallbackActionName = "",
): string {
  const dataValue = (triggerElement.dataset.wpsFlowAction || "").trim();
  const classValue = getClassTokenValue(triggerElement, "wps-flow-action--");
  const candidate = dataValue || classValue || fallbackActionName;

  return ACTION_NAME_PATTERN.test(candidate) ? candidate : "";
}

function getHashTarget(record: ModalRecord): string {
  return record.options.hashValue || `flow-modal-${record.id}`;
}

function findRecordByHash(hashValue: string): ModalRecord | undefined {
  const normalizedHash = normalizeHash(hashValue);
  if (!normalizedHash) {
    return undefined;
  }

  for (const record of runtimeState.records.values()) {
    if (!record.options.openOnHash) {
      continue;
    }

    if (getHashTarget(record) === normalizedHash) {
      return record;
    }
  }

  return undefined;
}

function reportModalError(
  modalId: string,
  error: unknown,
  triggerElement?: HTMLElement,
  originalEvent?: Event,
): void {
  const record = runtimeState.records.get(modalId);
  if (record) {
    emitModalEvent(
      record,
      "error",
      { triggerElement, originalEvent, error },
      false,
    );
    return;
  }

  document.dispatchEvent(
    new CustomEvent<ModalEventDetail>("wps-flow-modal:error", {
      detail: {
        modalId,
        modalElement: document.createElement("dialog"),
        triggerElement,
        originalEvent,
        error,
      },
      bubbles: true,
      composed: true,
    }),
  );
}

function moveRecordToEnd(record: ModalRecord): void {
  runtimeState.records.delete(record.id);
  runtimeState.records.set(record.id, record);
}

function openFallback(record: ModalRecord): void {
  if (!record.element.classList.contains("wps-flow-modal--fallback-open")) {
    runtimeState.fallbackOpenCount += 1;
    updateFallbackBodyScroll();
  }

  record.element.classList.add("wps-flow-modal--fallback-open");
  record.element.setAttribute("open", "");
}

function closeFallback(record: ModalRecord): void {
  if (record.element.classList.contains("wps-flow-modal--fallback-open")) {
    runtimeState.fallbackOpenCount = Math.max(
      0,
      runtimeState.fallbackOpenCount - 1,
    );
    updateFallbackBodyScroll();
  }

  record.element.classList.remove("wps-flow-modal--fallback-open");
  record.element.removeAttribute("open");
}

function createModalApi(): FlowModalApi {
  const api: FlowModalApi = {
    register(modal, options) {
      const modalId = getModalIdFromElement(modal);
      if (!modalId) {
        return;
      }

      const existingRecord = runtimeState.records.get(modalId);
      if (existingRecord?.element === modal) {
        existingRecord.options = parseModalOptions(modal, options);
        return;
      }

      if (existingRecord) {
        api.unregister(modalId);
      }

      const cleanupController = new AbortController();
      const record: ModalRecord = {
        id: modalId,
        element: modal,
        options: parseModalOptions(modal, options),
        cleanupController,
      };

      modal.addEventListener(
        "cancel",
        (event) => {
          event.preventDefault();
          if (!record.options.closeOnEsc) {
            return;
          }

          api.close(record.id, "cancel");
        },
        { signal: cleanupController.signal },
      );

      modal.addEventListener(
        "close",
        () => {
          setBusyState(record, false);
          emitModalEvent(record, "close", { returnValue: modal.returnValue });
          restoreFocus(record);
        },
        { signal: cleanupController.signal },
      );

      modal.addEventListener(
        "click",
        (event) => {
          if (event.target !== modal || !record.options.closeOnBackdrop) {
            return;
          }

          api.close(record.id, "backdrop");
        },
        { signal: cleanupController.signal },
      );

      runtimeState.records.set(modalId, record);
    },

    unregister(modalOrId) {
      const modalId =
        typeof modalOrId === "string"
          ? modalOrId
          : getModalIdFromElement(modalOrId);
      const record = runtimeState.records.get(modalId);
      if (!record) {
        return;
      }

      if (record.element.classList.contains("wps-flow-modal--fallback-open")) {
        closeFallback(record);
      }

      record.cleanupController.abort();
      runtimeState.records.delete(modalId);
    },

    open(modalId, options) {
      const record = runtimeState.records.get(modalId);
      if (!record) {
        reportModalError(
          modalId,
          new Error("Modal not found"),
          options?.triggerElement,
        );
        return false;
      }

      if (isRecordOpen(record)) {
        return true;
      }

      record.lastTrigger =
        options?.triggerElement ||
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : undefined);

      if (
        !emitModalEvent(
          record,
          "before-open",
          { triggerElement: options?.triggerElement },
          true,
        )
      ) {
        return false;
      }

      moveRecordToEnd(record);

      if (typeof record.element.showModal === "function") {
        try {
          record.element.showModal();
        } catch {
          openFallback(record);
        }
      } else {
        openFallback(record);
      }

      focusPanel(record);
      emitModalEvent(record, "open", {
        triggerElement: options?.triggerElement,
      });

      return true;
    },

    close(modalId, returnValue = "") {
      const record = runtimeState.records.get(modalId);
      if (!record) {
        reportModalError(modalId, new Error("Modal not found"));
        return false;
      }

      if (!isRecordOpen(record)) {
        return true;
      }

      if (!emitModalEvent(record, "before-close", { returnValue }, true)) {
        return false;
      }

      if (record.element.classList.contains("wps-flow-modal--fallback-open")) {
        closeFallback(record);
        setBusyState(record, false);
        emitModalEvent(record, "close", { returnValue });
        restoreFocus(record);
        return true;
      }

      if (typeof record.element.close === "function" && record.element.open) {
        record.element.close(returnValue);
        return true;
      }

      return true;
    },

    toggle(modalId, options) {
      const record = runtimeState.records.get(modalId);
      if (!record) {
        reportModalError(
          modalId,
          new Error("Modal not found"),
          options?.triggerElement,
        );
        return false;
      }

      return isRecordOpen(record)
        ? api.close(modalId)
        : api.open(modalId, options);
    },

    closeAll(returnValue = "") {
      let closedCount = 0;
      Array.from(runtimeState.records.values()).forEach((record) => {
        if (!isRecordOpen(record)) {
          return;
        }

        if (api.close(record.id, returnValue)) {
          closedCount += 1;
        }
      });
      return closedCount;
    },

    isOpen(modalId) {
      const record = runtimeState.records.get(modalId);
      return record ? isRecordOpen(record) : false;
    },

    get(modalId) {
      return runtimeState.records.get(modalId)?.element || null;
    },

    registerAction(actionName, handler) {
      if (
        !ACTION_NAME_PATTERN.test(actionName) ||
        typeof handler !== "function"
      ) {
        console.warn("[Flow] Invalid modal action registration", {
          actionName,
        });
        return;
      }

      runtimeState.actions.set(actionName, handler);
    },

    unregisterAction(actionName) {
      runtimeState.actions.delete(actionName);
    },
  };

  return api;
}

const modalApi =
  window.__smartcloudFlowModalApi ||
  (window.__smartcloudFlowModalApi = createModalApi());
getFlowRoot().modals = modalApi;

async function runOkAction(
  record: ModalRecord,
  triggerElement: HTMLElement,
  originalEvent: Event,
): Promise<void> {
  const actionName = getActionName(
    triggerElement,
    record.options.defaultOkAction,
  );

  if (
    !emitModalEvent(
      record,
      "ok",
      { actionName, triggerElement, originalEvent },
      true,
    )
  ) {
    return;
  }

  const handler = actionName ? runtimeState.actions.get(actionName) : undefined;

  if (!handler) {
    if (record.options.closeOnOk) {
      modalApi.close(record.id, "ok");
    }
    return;
  }

  const context: FlowModalActionContext = {
    modalId: record.id,
    modalElement: record.element,
    triggerElement,
    actionName,
    originalEvent,
    close: (returnValue) => {
      modalApi.close(record.id, returnValue);
    },
    open: () => {
      modalApi.open(record.id, { triggerElement });
    },
  };

  setBusyState(record, true);

  try {
    const result = await handler(context);
    setBusyState(record, false);

    if (result === false) {
      return;
    }

    if (record.options.closeOnOk && modalApi.isOpen(record.id)) {
      modalApi.close(record.id, "ok");
    }
  } catch (error) {
    setBusyState(record, false);
    emitModalEvent(
      record,
      "error",
      { actionName, triggerElement, originalEvent, error },
      false,
    );
  }
}

function handleCancelAction(
  triggerElement: HTMLElement,
  originalEvent: Event,
): void {
  const record = getNearestModalRecord(triggerElement);
  if (!record) {
    return;
  }

  if (
    !emitModalEvent(
      record,
      "cancel",
      {
        actionName: getActionName(
          triggerElement,
          record.options.defaultCancelAction,
        ),
        triggerElement,
        originalEvent,
      },
      true,
    )
  ) {
    return;
  }

  if (record.options.closeOnCancel) {
    modalApi.close(record.id, "cancel");
  }
}

function getTriggerTargetId(
  triggerElement: HTMLElement,
  type: "open" | "toggle",
): string {
  if (type === "open") {
    return (
      triggerElement.dataset.wpsFlowModalOpen ||
      getClassTokenValue(triggerElement, "wps-flow-modal-open--")
    ).trim();
  }

  return (
    triggerElement.dataset.wpsFlowModalToggle ||
    getClassTokenValue(triggerElement, "wps-flow-modal-toggle--")
  ).trim();
}

function resolveHashTrigger(triggerElement: HTMLElement): string {
  if (!(triggerElement instanceof HTMLAnchorElement)) {
    return "";
  }

  const href = triggerElement.getAttribute("href") || "";
  if (!href.startsWith("#")) {
    return "";
  }

  return normalizeHash(href);
}

function scanElementTree(root: ParentNode): void {
  if (root instanceof HTMLDialogElement && root.matches(MODAL_SELECTOR)) {
    modalApi.register(root);
  }

  root
    .querySelectorAll<HTMLDialogElement>(MODAL_SELECTOR)
    .forEach((element) => {
      modalApi.register(element);
    });
}

function handleDelegatedClick(event: Event): void {
  if (!(event.target instanceof Element)) {
    return;
  }

  const triggerElement = event.target.closest<HTMLElement>(
    [
      "[data-wps-flow-modal-open]",
      "[data-wps-flow-modal-toggle]",
      "[data-wps-flow-modal-close]",
      "[data-wps-flow-modal-cancel]",
      "[data-wps-flow-modal-ok]",
      ".wps-flow-modal-close",
      ".wps-flow-modal-cancel",
      ".wps-flow-modal-ok",
      "a[href^='#']",
    ].join(","),
  );

  if (!triggerElement) {
    return;
  }

  const modalOpenTarget = getTriggerTargetId(triggerElement, "open");
  const modalToggleTarget = getTriggerTargetId(triggerElement, "toggle");
  const isCloseTrigger =
    triggerElement.hasAttribute("data-wps-flow-modal-close") ||
    triggerElement.classList.contains("wps-flow-modal-close");
  const isCancelTrigger =
    triggerElement.hasAttribute("data-wps-flow-modal-cancel") ||
    triggerElement.classList.contains("wps-flow-modal-cancel");
  const isOkTrigger =
    triggerElement.hasAttribute("data-wps-flow-modal-ok") ||
    triggerElement.classList.contains("wps-flow-modal-ok");
  const hashTarget = resolveHashTrigger(triggerElement);

  if (
    !modalOpenTarget &&
    !modalToggleTarget &&
    !isCloseTrigger &&
    !isCancelTrigger &&
    !isOkTrigger &&
    !hashTarget
  ) {
    return;
  }

  event.preventDefault();

  if (modalOpenTarget) {
    modalApi.open(modalOpenTarget, { triggerElement });
    return;
  }

  if (modalToggleTarget) {
    modalApi.toggle(modalToggleTarget, { triggerElement });
    return;
  }

  if (isCloseTrigger) {
    const record = getNearestModalRecord(triggerElement);
    if (record) {
      modalApi.close(record.id, "close");
    }
    return;
  }

  if (isCancelTrigger) {
    handleCancelAction(triggerElement, event);
    return;
  }

  if (isOkTrigger) {
    const record = getNearestModalRecord(triggerElement);
    if (record) {
      void runOkAction(record, triggerElement, event);
    }
    return;
  }

  if (hashTarget) {
    const record = findRecordByHash(hashTarget);
    if (record) {
      modalApi.open(record.id, { triggerElement });
    }
  }
}

function handleHashChange(): void {
  const record = findRecordByHash(window.location.hash);
  if (!record) {
    return;
  }

  modalApi.open(record.id);
}

function handleKeydownFallback(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  const openRecords = Array.from(runtimeState.records.values()).filter(
    (record) =>
      record.element.classList.contains("wps-flow-modal--fallback-open"),
  );
  const record = openRecords.length
    ? openRecords[openRecords.length - 1]
    : undefined;

  if (!record || !record.options.closeOnEsc) {
    return;
  }

  event.preventDefault();
  modalApi.close(record.id, "cancel");
}

function handleFlowSubmitSuccess(event: Event): void {
  if (!(event.target instanceof Element)) {
    return;
  }

  const modal = event.target.closest<HTMLDialogElement>(MODAL_SELECTOR);
  if (!modal) {
    return;
  }

  const record = runtimeState.records.get(getModalIdFromElement(modal));
  if (!record || !record.options.closeOnFlowSubmitSuccess) {
    return;
  }

  modalApi.close(record.id, "flow-submit-success");
}

function startObserver(): void {
  if (runtimeState.observer || !document.body) {
    return;
  }

  runtimeState.observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          scanElementTree(node);
        }
      });
      mutation.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }

        if (node instanceof HTMLDialogElement && node.matches(MODAL_SELECTOR)) {
          modalApi.unregister(node);
        }

        node
          .querySelectorAll<HTMLDialogElement>(MODAL_SELECTOR)
          .forEach((element) => {
            modalApi.unregister(element);
          });
      });
    });
  });

  runtimeState.observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function initModalRuntime(): void {
  if (window.__smartcloudFlowModalRuntimeInitialized) {
    getFlowRoot().modals = modalApi;
    scanElementTree(document);
    return;
  }

  window.__smartcloudFlowModalRuntimeInitialized = true;
  scanElementTree(document);

  document.addEventListener("click", handleDelegatedClick);
  document.addEventListener("keydown", handleKeydownFallback);
  document.addEventListener(
    "smartcloud-flow:submit-success",
    handleFlowSubmitSuccess,
  );
  document.addEventListener(
    "wps-flow-form:submit-success",
    handleFlowSubmitSuccess,
  );
  window.addEventListener("hashchange", handleHashChange);
  startObserver();
  handleHashChange();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initModalRuntime, {
    once: true,
  });
} else {
  initModalRuntime();
}
