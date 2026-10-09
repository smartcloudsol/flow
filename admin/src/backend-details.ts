/** Safe configuration metadata and read-only inventory for the backend disclosure. */
import type { BackendCheckDependencies } from "./backend-readiness";

export type InventoryKind = "workflows" | "templates" | "webhooks";
export type InventoryCount = {
  count?: number;
  partial?: boolean;
  unavailable?: "unsupported" | "failed";
};
export type BackendDetails = {
  mode?: string;
  transport?: string;
  apiName?: string;
  endpoint?: string;
  inventory?: Partial<Record<InventoryKind, InventoryCount>>;
};
export interface BackendDetailsDependencies extends Omit<BackendCheckDependencies, "gateyApiConfigured"> {
  gateyEndpoint: (apiName: string) => Promise<string | undefined>;
}

const categories = [
  ["workflows", "/admin/workflows", "workflowId"],
  ["templates", "/admin/templates", "templateKey"],
  ["webhooks", "/admin/webhook-endpoints", "webhookKey"],
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unsupported(error: unknown): boolean {
  if (!record(error)) return false;
  const response = record(error.response) ? error.response : {};
  const status = error.status ?? error.statusCode ?? response.statusCode ?? response.status;
  return status === 404 || status === 405;
}

// Endpoints are useful metadata; URL credentials and query strings are not.
function displayEndpoint(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

export function createBackendDetails(dependencies: BackendDetailsDependencies) {
  return async (signal: AbortSignal, includeInventory = false): Promise<BackendDetails> => {
    signal.throwIfAborted();
    const config = await dependencies.config();
    signal.throwIfAborted();
    const transport = config?.backendTransport ??
      (config?.backendBaseUrl ? "fetch" : config?.backendApiName ? "gatey" : undefined);
    const apiName = config?.backendApiName?.trim() || undefined;
    let endpoint: string | undefined;
    if (transport === "gatey" && apiName) {
      try { endpoint = await dependencies.gateyEndpoint(apiName); }
      catch { signal.throwIfAborted(); }
    } else if (transport === "fetch") endpoint = config?.backendBaseUrl?.trim();
    signal.throwIfAborted();
    const details: BackendDetails = {
      mode: transport === "gatey" ? "gatey" : transport === "fetch" ? "custom-url" : undefined,
      transport, apiName: transport === "gatey" ? apiName : undefined,
      endpoint: displayEndpoint(endpoint),
    };
    if (!includeInventory) return details;

    const unavailableInventory = (): BackendDetails => ({
      ...details,
      inventory: Object.fromEntries(categories.map(([kind]) => [kind, { unavailable: "failed" }])),
    });
    const site = dependencies.site();
    const gatey = transport === "gatey" ? dependencies.gatey() : undefined;
    if (!site?.accountId || !site.siteId || !endpoint ||
      (transport !== "gatey" && transport !== "fetch") ||
      (transport === "gatey" && (!gatey?.get || !apiName))) return unavailableInventory();
    if (transport === "gatey") {
      let authenticated = false;
      try { authenticated = await dependencies.sessionAvailable(); }
      catch { signal.throwIfAborted(); }
      signal.throwIfAborted();
      if (!authenticated) return unavailableInventory();
    }

    const request = async (path: string): Promise<unknown> => {
      signal.throwIfAborted();
      if (transport === "gatey") {
        const operation = gatey!.get({
          apiName: apiName!, path,
          options: { headers: {}, retryStrategy: { strategy: "no-retry" } },
        });
        const cancel = () => operation.cancel();
        signal.addEventListener("abort", cancel, { once: true });
        try {
          if (signal.aborted) { cancel(); signal.throwIfAborted(); }
          const response = await operation.response;
          signal.throwIfAborted();
          const result: unknown = await response.body.json();
          signal.throwIfAborted();
          return result;
        } finally { signal.removeEventListener("abort", cancel); }
      }
      const response = await dependencies.fetch(endpoint!.replace(/\/+$/, "") + path, {
        method: "GET", headers: { "content-type": "application/json" },
        credentials: "omit", signal,
      });
      signal.throwIfAborted();
      if (!response.ok) throw { status: response.status };
      return response.json();
    };

    const countCategory = async (path: string, idKey: string): Promise<InventoryCount> => {
      const identifiers = new Set<string>();
      const cursors = new Set<string>();
      let cursor: string | undefined;
      let completedPages = 0;
      let partial = false;
      try {
        for (let page = 0; page < 100; page++) {
          const query = new URLSearchParams({ accountId: site.accountId!, siteId: site.siteId!, limit: "100" });
          if (cursor) query.set("cursor", cursor);
          const result = await request(`${path}?${query}`);
          signal.throwIfAborted();
          if (!record(result) || !Array.isArray(result.items)) throw new Error("Invalid inventory response");
          completedPages++;
          for (const item of result.items) {
            if (!record(item) || typeof item[idKey] !== "string" || !item[idKey].trim()) { partial = true; continue; }
            identifiers.add(item[idKey]);
          }
          if (result.cursor === undefined || result.cursor === null || result.cursor === "") {
            return { count: identifiers.size, ...(partial ? { partial: true } : {}) };
          }
          if (typeof result.cursor !== "string" || cursors.has(result.cursor)) {
            return { count: identifiers.size, partial: true };
          }
          cursors.add(result.cursor);
          cursor = result.cursor;
        }
        return { count: identifiers.size, partial: true };
      } catch (error) {
        signal.throwIfAborted();
        return {
          ...(completedPages ? { count: identifiers.size, partial: true } : {}),
          unavailable: unsupported(error) ? "unsupported" : "failed",
        };
      }
    };
    // Every category can fail independently, without hiding successful counts.
    const results = await Promise.allSettled(categories.map(([, path, idKey]) => countCategory(path, idKey)));
    signal.throwIfAborted();
    details.inventory = Object.fromEntries(results.map((result, index) => [
      categories[index][0], result.status === "fulfilled" ? result.value : { unavailable: "failed" },
    ]));
    return details;
  };
}

export function registerBackendDetails(dependencies: BackendDetailsDependencies): void {
  const registry = window as typeof window & {
    smartcloudWpSuiteBackendDetails?: Record<string, ReturnType<typeof createBackendDetails>>;
  };
  registry.smartcloudWpSuiteBackendDetails ??= {};
  registry.smartcloudWpSuiteBackendDetails["forms-workflows"] = createBackendDetails(dependencies);
  window.dispatchEvent(new Event("smartcloud-wpsuite-backend-ready"));
}
