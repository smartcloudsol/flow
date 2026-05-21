import { WpSuitePluginBase } from "@smart-cloud/wpsuite-core";
import type { Flow } from "./types";

export type FlowReadyEvent = "wpsuite:flow:ready";
export type FlowErrorEvent = "wpsuite:flow:error";

export type FlowPlugin = WpSuitePluginBase & Flow;
export function getFlowPlugin(): FlowPlugin | undefined {
  return globalThis.WpSuite?.plugins?.flow as FlowPlugin | undefined;
}

export async function waitForFlowReady(timeoutMs = 8000): Promise<void> {
  const plugin = getFlowPlugin();
  if (plugin?.status === "available") return;
  if (plugin?.status === "error") throw new Error("Flow failed");

  await new Promise<void>((resolve, reject) => {
    const onReady = () => cleanup(resolve);
    const onError = () => cleanup(() => reject(new Error("Flow failed")));
    const cleanup = (fn: () => void) => {
      window.removeEventListener("wpsuite:flow:ready", onReady);
      window.removeEventListener("wpsuite:flow:error", onError);
      if (t) clearTimeout(t);
      fn();
    };

    window.addEventListener("wpsuite:flow:ready", onReady, { once: true });
    window.addEventListener("wpsuite:flow:error", onError, { once: true });

    const t = timeoutMs
      ? window.setTimeout(
          () => cleanup(() => reject(new Error("Flow timeout"))),
          timeoutMs,
        )
      : 0;
  });
}

export async function getStore(timeoutMs = 10000) {
  await waitForFlowReady(timeoutMs);

  const plugin = getFlowPlugin();
  const storePromise = plugin?.features?.store;

  if (!storePromise) throw new Error("Flow store is not available");
  return storePromise;
}
