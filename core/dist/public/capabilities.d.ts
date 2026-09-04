import { BackendTransport, CapabilityDecision } from "../types";
export declare const decideCapability: (_capability?: import("../types").FlowBackendCapability) => Promise<CapabilityDecision>;
export declare function resolveBackend(_capability?: import("../types").FlowBackendCapability): Promise<{
    available: boolean;
    transport?: BackendTransport;
    apiName?: string;
    baseUrl?: string;
    reason?: string;
}>;
