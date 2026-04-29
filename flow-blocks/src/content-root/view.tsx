import { waitForFlowReady } from "@smart-cloud/flow-core";
import { parseContentRootElement } from "../shared/serialization";
import {
  renderContentRoot,
  type RenderContentRootHandle,
} from "./renderContentRoot";

import "jquery";

declare global {
  interface Window {
    __smartcloudFlowMountedContentRoots?: Map<
      string,
      RenderContentRootHandle | Promise<RenderContentRootHandle>
    >;
  }
}

if (!window.__smartcloudFlowMountedContentRoots) {
  window.__smartcloudFlowMountedContentRoots = new Map();
}

const mountedContentRoots = window.__smartcloudFlowMountedContentRoots;

function hashStringDjb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }

  return (hash >>> 0).toString(36);
}

function getConfigContainer(element: HTMLElement): HTMLElement | null {
  const configContainers = element.querySelectorAll<HTMLElement>(
    ".smartcloud-flow-content-root__config",
  );

  return configContainers[configContainers.length - 1] || null;
}

function isContentRoot(element: HTMLElement): boolean {
  return (
    element.classList.contains("smartcloud-flow-content-root") &&
    typeof element.dataset.config === "string"
  );
}

function ensureContentRootId(element: HTMLElement): string {
  if (!element.id) {
    element.id = `smartcloud-flow-content-root-${Math.random()
      .toString(36)
      .slice(2, 11)}`;
  }

  return element.id;
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
    configContainer.querySelector("[data-smartcloud-flow-form-field]"),
  );
}

async function mountContentRoot(id: string) {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (!element || !isContentRoot(element)) {
    return;
  }

  if (!isConfigReady(element)) {
    window.setTimeout(() => {
      void mountContentRoot(id);
    }, 100);
    return;
  }

  const configSignature = getConfigSignature(element);
  const previousSignature = element.dataset.smartcloudFlowConfigSignature || "";

  const existing = mountedContentRoots.get(id);
  if (existing) {
    if (existing instanceof Promise) {
      await existing;
      return;
    }

    if (
      existing.container === element &&
      previousSignature === configSignature
    ) {
      return;
    }

    existing.unmount();
    mountedContentRoots.delete(id);
  }

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
    ".smartcloud-flow-content-root__mount",
  );
  if (!mountNode) {
    return;
  }

  if (mountNode.dataset.mounted === "true") {
    return;
  }

  const mountPromise = (async () => {
    try {
      await waitForFlowReady();
      const parsed = parseContentRootElement(element);
      const handle = await renderContentRoot({
        target: element,
        rootAttributes: parsed.root,
        fields: parsed.fields,
      });

      mountedContentRoots.set(id, handle);
      element.dataset.smartcloudFlowConfigSignature = configSignature;
      mountNode.dataset.mounted = "true";
      jQuery(element).data("rendered", "true");
      return handle;
    } catch (error) {
      mountedContentRoots.delete(id);
      console.error("[Flow Debug] mountContentRoot failed", { id, error });
      throw error;
    }
  })();

  mountedContentRoots.set(id, mountPromise);
  await mountPromise;
}

jQuery(document).on(
  "smartcloud-flow-content-root-block",
  async (_, id: string) => {
    await mountContentRoot(id);
  },
);

jQuery(window).on("elementor/frontend/init", function () {
  jQuery(document).on(
    "smartcloud-flow-content-root-block",
    async (_, id: string) => {
      await mountContentRoot(id);
    },
  );
});

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      document
        .querySelectorAll<HTMLElement>(
          ".smartcloud-flow-content-root[data-config]",
        )
        .forEach(ensureContentRootId);
    },
    { once: true },
  );
} else {
  document
    .querySelectorAll<HTMLElement>(".smartcloud-flow-content-root[data-config]")
    .forEach(ensureContentRootId);
}
