// Flow Admin Backend Utilities
// Shared utilities for making admin backend requests

import {
  dispatchBackend,
  resolveBackend,
  type CapabilityDecision,
} from "@smart-cloud/flow-core";

export async function getDecisionForAdminBackend(): Promise<CapabilityDecision> {
  const backend = await resolveBackend();

  return {
    backendAvailable: backend.available,
    backendTransport: backend.transport,
    backendApiName: backend.apiName,
    backendBaseUrl: backend.baseUrl,
    backendReason: backend.reason,
    reason: backend.reason ?? "",
  };
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

export async function adminRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  const decision = await getDecisionForAdminBackend();

  if (!decision.backendAvailable) {
    throw new Error("Backend not available");
  }

  return (await dispatchBackend(
    decision,
    "admin",
    path,
    method,
    body ?? null,
    {},
  )) as T;
}
