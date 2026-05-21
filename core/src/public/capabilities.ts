import { BackendTransport, CapabilityDecision } from "../types";

export const decideCapability = async () =>
  Promise.resolve<CapabilityDecision>({
    backendAvailable: false,
    reason: "not-implemented",
  });

export async function resolveBackend(): Promise<{
  available: boolean;
  transport?: BackendTransport;
  apiName?: string;
  baseUrl?: string;
  reason?: string;
}> {
  return { available: false, reason: "not-implemented" };
}
