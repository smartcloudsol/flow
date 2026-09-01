import { waitForFlowReady } from "@smart-cloud/flow-core";
import { decodeAdjacentFormId } from "../discussion/runtime-config";
import { renderRatingSummary } from "./renderRatingSummary";
import type { RatingSummaryAttributes } from "./RatingSummaryShell";

const mounted = new Map<
  string,
  Awaited<ReturnType<typeof renderRatingSummary>>
>();

function decodeConfig(element: HTMLElement): RatingSummaryAttributes {
  const encoded = element.dataset.config || "";
  return JSON.parse(atob(encoded)) as RatingSummaryAttributes;
}

function findAdjacentFormId(element: HTMLElement): string | undefined {
  let sibling = element.previousElementSibling;

  while (sibling) {
    const form = sibling.classList.contains("smartcloud-flow-form")
      ? sibling
      : Array.from(
          sibling.querySelectorAll<HTMLElement>(
            ".smartcloud-flow-form[data-config]",
          ),
        ).at(-1);
    if (form instanceof HTMLElement) {
      const formId = decodeAdjacentFormId(form.dataset.config || "");
      if (formId) return formId;
    }
    sibling = sibling.previousElementSibling;
  }

  return undefined;
}

function resolveRuntimeAttributes(
  element: HTMLElement,
  attributes: RatingSummaryAttributes,
): RatingSummaryAttributes {
  if (attributes.formId?.trim()) return attributes;
  const formId = findAdjacentFormId(element);
  return formId ? { ...attributes, formId } : attributes;
}

export async function mountRatingSummary(id: string) {
  const element = document.getElementById(id);
  if (
    !element ||
    !element.classList.contains("smartcloud-flow-rating-summary")
  ) {
    return;
  }
  mounted.get(id)?.unmount();
  const target = element.querySelector<HTMLElement>(
    ".smartcloud-flow-rating-summary__mount",
  );
  if (!target) return;
  await waitForFlowReady();
  mounted.set(
    id,
    await renderRatingSummary({
      target,
      container: element,
      attributes: resolveRuntimeAttributes(element, decodeConfig(element)),
    }),
  );
}

function mountAll() {
  document
    .querySelectorAll<HTMLElement>(
      ".smartcloud-flow-rating-summary[data-config]",
    )
    .forEach((element) => {
      if (element.id) void mountRatingSummary(element.id);
    });
}

document.addEventListener("smartcloud-flow:mount-rating-summaries", mountAll);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll, { once: true });
} else {
  mountAll();
}
