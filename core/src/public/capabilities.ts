import { BackendTransport, CapabilityDecision } from "../types";

export const decideCapability = async (
  _capability?: import("../types").FlowBackendCapability,
) => {
  void _capability;
  return Promise.resolve<CapabilityDecision>({
    backendAvailable: false,
    reason: "not-implemented",
  });
};

export async function resolveBackend(
  _capability?: import("../types").FlowBackendCapability,
): Promise<{
  available: boolean;
  transport?: BackendTransport;
  apiName?: string;
  baseUrl?: string;
  reason?: string;
}> {
  void _capability;
  return { available: false, reason: "not-implemented" };
}
