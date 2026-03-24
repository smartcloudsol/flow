import {
  dispatchBackend,
  resolveBackend,
  type CapabilityDecision,
} from "@smart-cloud/ai-kit-core";

export async function dispatchAiSuggestionsPrompt(body: unknown) {
  const aiKitBackend = await resolveBackend();
  const decision = {
    feature: "prompt",
    source: "backend",
    mode: "backend-only",
    onDeviceAvailable: false,
    backendAvailable: aiKitBackend.available,
    backendTransport: aiKitBackend.transport,
    backendApiName: aiKitBackend.apiName,
    backendBaseUrl: aiKitBackend.baseUrl,
    reason: "AI suggestions prompt request",
  } as CapabilityDecision;
  return dispatchBackend(decision, "frontend", "/prompt", "POST", body, {});
}
