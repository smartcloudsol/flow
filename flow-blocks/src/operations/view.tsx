import { waitForFlowReady } from "@smart-cloud/flow-core";
import flowOperationsRuntime from "@smart-cloud/flow-admin/operations-runtime";

import "jquery";

function ensureOperationsId(element: HTMLElement): string {
  if (!element.id) {
    element.id = `smartcloud-flow-operations-${Math.random()
      .toString(36)
      .slice(2, 11)}`;
  }

  return element.id;
}

async function mountOperations(id: string) {
  await waitForFlowReady();
  await flowOperationsRuntime?.mountById(id);
}

function getOperationsElements(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(
    '[data-smartcloud-flow-operations="true"], .smartcloud-flow-operations',
  );
}

jQuery(document).on(
  "smartcloud-flow-operations-block",
  async (_, id: string) => {
    await mountOperations(id);
  },
);

jQuery(window).on("elementor/frontend/init", function () {
  jQuery(document).on(
    "smartcloud-flow-operations-block",
    async (_, id: string) => {
      await mountOperations(id);
    },
  );
});

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      getOperationsElements().forEach((element) => {
        const id = ensureOperationsId(element);
        void mountOperations(id);
      });
    },
    { once: true },
  );
} else {
  getOperationsElements().forEach((element) => {
    const id = ensureOperationsId(element);
    void mountOperations(id);
  });
}
