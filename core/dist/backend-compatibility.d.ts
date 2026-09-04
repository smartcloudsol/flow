import type { BackendCompatibility, BackendTransport, ContextKind, FlowBackendCapability } from "./types";
export declare function capabilityForPath(context: ContextKind, path: string): FlowBackendCapability | undefined;
export declare function resolveBackendCompatibility(input: {
    transport: BackendTransport;
    apiName?: string;
    baseUrl?: string;
}): Promise<BackendCompatibility>;
export declare function supportsBackendCapability(compatibility: BackendCompatibility, capability: FlowBackendCapability, minimumVersion?: number): boolean;
