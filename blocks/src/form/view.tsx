import { waitForFlowReady } from "@smart-cloud/flow-core";
import { parseFormElement } from "../shared/serialization";
import { renderForm, type RenderFormHandle } from "./renderForm";

import "jquery";

// Use global cache to survive across Elementor Pro's multiple script loads
declare global {
  interface Window {
    __smartcloudFlowMountedForms?: Map<
      string,
      RenderFormHandle | Promise<RenderFormHandle>
    >;
  }
}

// Initialize global cache
if (!window.__smartcloudFlowMountedForms) {
  window.__smartcloudFlowMountedForms = new Map();
}

const mountedForms = window.__smartcloudFlowMountedForms;

function isFormRoot(element: HTMLElement): boolean {
  return (
    element.classList.contains("smartcloud-flow-form") &&
    typeof element.dataset.config === "string"
  );
}

function getConfigContainer(element: HTMLElement): HTMLElement | null {
  const configContainers = element.querySelectorAll<HTMLElement>(
    ".smartcloud-flow-form__config",
  );

  return configContainers[configContainers.length - 1] || null;
}

function hashStringDjb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getConfigSignature(element: HTMLElement): string {
  const configContainer = getConfigContainer(element);
  if (!configContainer) {
    return "";
  }

  return hashStringDjb2(configContainer.innerHTML);
}

function isConfigReady(element: HTMLElement): boolean {
  const configContainer = getConfigContainer(element);
  if (!configContainer) {
    return false;
  }

  return Boolean(
    configContainer.querySelector(
      "[data-smartcloud-flow-form-field], [data-smartcloud-flow-form-state]",
    ),
  );
}

// Generate unique ID for form element if it doesn't have one
function ensureFormId(element: HTMLElement): string {
  if (!element.id) {
    element.id = `smartcloud-flow-form-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
  return element.id;
}

async function mountForm(id: string) {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (!element) {
    console.warn(`[Flow] Form element not found: ${id}`);
    return;
  }
  if (!isFormRoot(element)) {
    console.warn(`[Flow] Ignoring non-root form mount target: ${id}`);
    return;
  }
  if (!isConfigReady(element)) {
    window.setTimeout(() => {
      void mountForm(id);
    }, 100);
    return;
  }

  const configSignature = getConfigSignature(element);
  const previousSignature = element.dataset.smartcloudFlowConfigSignature || "";

  // Check if there's an existing mount for this form (could be a Promise or a handle)
  const existing = mountedForms.get(id);
  if (existing) {
    // If it's a Promise, it's currently being mounted
    if (existing instanceof Promise) {
      await existing;
      return;
    }

    // If it's a handle, verify the target element matches
    if (
      existing.container === element &&
      previousSignature === configSignature
    ) {
      return; // Already mounted to the correct target, skip
    } else {
      // Target changed, unmount old one first
      existing.unmount();
      mountedForms.delete(id);
    }
  }

  // Check if already mounted (legacy double-check with jQuery data)
  if (
    jQuery(element).data("rendered") &&
    previousSignature === configSignature
  ) {
    return;
  }

  if (jQuery(element).data("rendered")) {
    jQuery(element).removeData("rendered");
  }

  const mountNode = element.querySelector<HTMLElement>(
    ".smartcloud-flow-form__mount",
  );
  if (!mountNode) {
    console.warn(`[Flow] Mount node not found for form: ${id}`);
    return;
  }

  if (mountNode.dataset.mounted === "true") {
    return;
  }

  // Create a Promise for the mount operation and store it immediately
  const mountPromise = (async () => {
    try {
      await waitForFlowReady();

      // Parse form data
      const parsed = parseFormElement(element);

      // Render form with shadow DOM isolation
      const handle = await renderForm({
        target: element,
        form: parsed.form,
        fields: parsed.fields,
        states: parsed.states,
      });

      // Replace the promise with the actual handle
      mountedForms.set(id, handle);

      element.dataset.smartcloudFlowConfigSignature = configSignature;
      mountNode.dataset.mounted = "true";
      jQuery(element).data("rendered", "true");

      return handle;
    } catch (error) {
      mountedForms.delete(id);
      console.error("[Flow Debug] mountForm failed", { id, error });
      throw error;
    }
  })();

  // Store the promise immediately to prevent duplicate mounts
  mountedForms.set(id, mountPromise);

  await mountPromise;
}

// Listen for observer triggers
jQuery(document).on("smartcloud-flow-form-block", async (_, id: string) => {
  await mountForm(id);
});

// Also support direct initialization for Elementor
jQuery(window).on("elementor/frontend/init", function () {
  jQuery(document).on("smartcloud-flow-form-block", async (_, id: string) => {
    await mountForm(id);
  });
});

// Ensure all forms have IDs for the observer to work
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      document
        .querySelectorAll<HTMLElement>(".smartcloud-flow-form[data-config]")
        .forEach(ensureFormId);
    },
    { once: true },
  );
} else {
  document
    .querySelectorAll<HTMLElement>(".smartcloud-flow-form[data-config]")
    .forEach(ensureFormId);
}
