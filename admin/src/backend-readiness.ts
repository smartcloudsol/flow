/** Read-only administration probe. Never expose responses, credentials or raw errors. */
export type BackendCheckState =
  | "ready" | "configure_backend" | "sign_in" | "gatey_missing"
  | "forbidden" | "unreachable" | "unsupported";

type Config = {
  backendTransport?: string;
  backendBaseUrl?: string;
  backendApiName?: string;
};
type Request = {
  apiName: string;
  path: string;
  options: { headers: Record<string, string>; retryStrategy: { strategy: "no-retry" } };
};
type Operation = {
  cancel: () => void;
  response: Promise<{ body: { json: () => Promise<unknown> } }>;
};
export interface BackendCheckDependencies {
  config: () => Promise<Config | null | undefined>;
  gatey: () => { get: (request: Request) => Operation } | undefined;
  gateyApiConfigured: (apiName: string) => Promise<boolean>;
  sessionAvailable: () => Promise<boolean>;
  fetch: typeof fetch;
  site: () => { accountId?: string; siteId?: string } | undefined;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function failure(error: unknown): BackendCheckState {
  if (!record(error)) return "unreachable";
  if (error.name === "ApiNameNotFoundException") return "configure_backend";
  const response = record(error.response) ? error.response : {};
  const status = error.status ?? error.statusCode ?? response.statusCode ?? response.status;
  if (status === 401) return "sign_in";
  if (status === 403) return "forbidden";
  // A missing route may mean an older backend or an incorrect endpoint.
  if (status === 404 || status === 405) return "unsupported";
  return "unreachable";
}
export function createBackendCheck(dependencies: BackendCheckDependencies) {
  return async (signal: AbortSignal): Promise<BackendCheckState> => {
    signal.throwIfAborted();
    try {
      const config = await dependencies.config();
      signal.throwIfAborted();
      const transport = config?.backendTransport ??
        (config?.backendBaseUrl ? "fetch" : config?.backendApiName ? "gatey" : undefined);
      if (!transport || (transport === "fetch" && !config?.backendBaseUrl?.trim()) ||
        (transport === "gatey" && !config?.backendApiName?.trim())) return "configure_backend";
      if (transport !== "gatey" && transport !== "fetch") return "unsupported";
      const site = dependencies.site();
      if (!site?.accountId || !site.siteId) return "configure_backend";
      const query = new URLSearchParams({ accountId: site.accountId, siteId: site.siteId, limit: "1" });
      const path = `/admin/forms?${query}`;
      let result: unknown;
      if (transport === "gatey") {
        const gatey = dependencies.gatey();
        if (!gatey?.get) return "gatey_missing";
        const configured = await dependencies.gateyApiConfigured(config!.backendApiName!);
        signal.throwIfAborted();
        if (!configured) return "configure_backend";
        let authenticated = false;
        try { authenticated = await dependencies.sessionAvailable(); } catch { /* no usable session */ }
        signal.throwIfAborted();
        if (!authenticated) return "sign_in";
        const operation = gatey.get({
          apiName: config!.backendApiName!, path,
          options: { headers: {}, retryStrategy: { strategy: "no-retry" } },
        });
        const cancel = () => operation.cancel();
        signal.addEventListener("abort", cancel, { once: true });
        try {
          if (signal.aborted) { cancel(); signal.throwIfAborted(); }
          const response = await operation.response;
          signal.throwIfAborted();
          result = await response.body.json();
        } finally { signal.removeEventListener("abort", cancel); }
      } else {
        // Match the existing custom fetch transport: no Cognito assumption or cookies.
        const response = await dependencies.fetch(config!.backendBaseUrl!.replace(/\/+$/, "") + path, {
          method: "GET", headers: { "content-type": "application/json" },
          credentials: "omit", signal,
        });
        if (!response.ok) return failure({ status: response.status });
        result = await response.json();
      }
      signal.throwIfAborted();
      return record(result) && Array.isArray(result.items) ? "ready" : "unreachable";
    } catch (error) {
      signal.throwIfAborted();
      return failure(error);
    }
  };
}

export function registerBackendCheck(dependencies: BackendCheckDependencies): void {
  const registry = window as typeof window & {
    smartcloudWpSuiteBackendChecks?: Record<string, ReturnType<typeof createBackendCheck>>;
  };
  registry.smartcloudWpSuiteBackendChecks ??= {};
  registry.smartcloudWpSuiteBackendChecks["forms-workflows"] = createBackendCheck(dependencies);
  window.dispatchEvent(new Event("smartcloud-wpsuite-backend-ready"));
}
