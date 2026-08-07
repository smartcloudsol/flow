import { waitForFlowReady } from "@smart-cloud/flow-core";
import { renderDiscussion } from "./renderDiscussion";
import type { DiscussionAttributes } from "./types";

const mounted = new Map<string, Awaited<ReturnType<typeof renderDiscussion>>>();

function decodeConfig(element: HTMLElement): DiscussionAttributes {
  const encoded = element.dataset.config || "";
  return JSON.parse(atob(encoded)) as DiscussionAttributes;
}

export async function mountDiscussion(id: string) {
  const element = document.getElementById(id);
  if (!element || !element.classList.contains("smartcloud-flow-discussion")) return;
  mounted.get(id)?.unmount();
  const target = element.querySelector<HTMLElement>(".smartcloud-flow-discussion__mount");
  if (!target) return;
  await waitForFlowReady();
  mounted.set(
    id,
    await renderDiscussion({
      target,
      container: element,
      hostElement: element,
      attributes: decodeConfig(element),
    }),
  );
}

function mountAll() {
  document.querySelectorAll<HTMLElement>(".smartcloud-flow-discussion[data-config]").forEach((element) => {
    if (element.id) void mountDiscussion(element.id);
  });
}

document.addEventListener("smartcloud-flow:mount-discussions", mountAll);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll, { once: true });
} else {
  mountAll();
}
