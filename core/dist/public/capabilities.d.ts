import { BackendTransport, CapabilityDecision } from "../types";
export declare const decideCapability: () => Promise<CapabilityDecision>;
export declare function resolveBackend(): Promise<{
    available: boolean;
    transport?: BackendTransport;
    apiName?: string;
    baseUrl?: string;
    reason?: string;
}>;
