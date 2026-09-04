import { getGateyPlugin } from "@smart-cloud/gatey-core";
import type {
  BackendCompatibility,
  BackendManifest,
  BackendTransport,
  ContextKind,
  FlowBackendCapability,
} from "./types";

const MANIFEST_PATH = "/meta/capabilities";
const CACHE_TTL_MS = 5 * 60 * 1000;
// These routes predate capability discovery. New Flow functionality must not
// be added here: it stays disabled on legacy backends until explicitly
// advertised by a manifest.
const LEGACY_CAPABILITIES = new Set<FlowBackendCapability>([
  "forms.admin",
  "forms.submit.frontend",
  "forms.drafts.frontend",
  "forms.discussions.frontend",
  "forms.uploads.frontend",
  "templates.admin",
  "workflows.admin",
  "webhooks.admin",
  "process-maps.admin",
]);
const cache = new Map<
  string,
  { expiresAt: number; value: BackendCompatibility }
>();

export function capabilityForPath(
  context: ContextKind,
  path: string,
): FlowBackendCapability | undefined {
  if (context === "frontend") {
    if (/\/discussion(?:\/|$)/.test(path)) return "forms.discussions.frontend";
    if (/\/drafts(?:\/|$)/.test(path)) return "forms.drafts.frontend";
    if (/\/upload-url$/.test(path)) return "forms.uploads.frontend";
    if (/\/submit$/.test(path)) return "forms.submit.frontend";
    return undefined;
  }
  if (path.startsWith("/forms") || path.startsWith("/submissions"))
    return "forms.admin";
  if (path.startsWith("/templates") || path.startsWith("/template-attachments"))
    return "templates.admin";
  if (path.startsWith("/workflows")) return "workflows.admin";
  if (path.startsWith("/webhook-endpoints")) return "webhooks.admin";
  if (path.startsWith("/process-maps")) return "process-maps.admin";
  return undefined;
}

function isManifest(value: unknown): value is BackendManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === 1 &&
    record.product === "smartcloud-flow-backend" &&
    typeof record.release === "string" &&
    !!record.capabilities &&
    typeof record.capabilities === "object" &&
    !Array.isArray(record.capabilities)
  );
}

async function requestManifest(input: {
  transport: BackendTransport;
  apiName?: string;
  baseUrl?: string;
}): Promise<unknown> {
  if (input.transport === "fetch") {
    if (!input.baseUrl) throw new Error("backendBaseUrl is missing");
    const response = await fetch(
      `${input.baseUrl.replace(/\/+$/, "")}${MANIFEST_PATH}`,
      { method: "GET", credentials: "omit" },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  if (!input.apiName) throw new Error("backendApiName is missing");
  const get = getGateyPlugin()?.cognito?.get;
  if (!get) throw new Error("Gatey GET transport is unavailable");
  const call = get({
    apiName: input.apiName,
    path: MANIFEST_PATH,
    options: { retryStrategy: { strategy: "no-retry" } },
  }) as unknown as {
    response: Promise<{ body: { json: () => Promise<unknown> } }>;
  };
  return (await call.response).body.json();
}

export async function resolveBackendCompatibility(input: {
  transport: BackendTransport;
  apiName?: string;
  baseUrl?: string;
}): Promise<BackendCompatibility> {
  const key = `${input.transport}:${input.apiName ?? input.baseUrl ?? ""}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value: BackendCompatibility;
  try {
    const manifest = await requestManifest(input);
    value = isManifest(manifest)
      ? { status: "verified", manifest }
      : {
          status: "legacy",
          reason: "Backend returned an unsupported capability manifest.",
        };
  } catch (error) {
    value = {
      status: "legacy",
      reason:
        error instanceof Error
          ? `Capability manifest is unavailable: ${error.message}`
          : "Capability manifest is unavailable.",
    };
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

export function supportsBackendCapability(
  compatibility: BackendCompatibility,
  capability: FlowBackendCapability,
  minimumVersion = 1,
): boolean {
  if (compatibility.status === "legacy") {
    return minimumVersion <= 1 && LEGACY_CAPABILITIES.has(capability);
  }
  const version = compatibility.manifest?.capabilities[capability];
  return typeof version === "number" && version >= minimumVersion;
}
