import { TEXT_DOMAIN } from "./constants";
import { getFlowPlugin, getStore, waitForFlowReady, type FlowErrorEvent, type FlowPlugin, type FlowReadyEvent } from "./runtime";
import { type Backend, type Capabilities, type FlowLanguageCode } from "./types";
export { getFlowPlugin, getStore, TEXT_DOMAIN, waitForFlowReady, type FlowErrorEvent, type FlowPlugin, type FlowReadyEvent, };
export { getStoreDispatch, getStoreSelect, observeStore, reloadConfig, sanitizeFlowConfig, type CustomTranslations, type FlowConfig, type State, type Store, } from "./store";
export * from "./types";
export declare const LANGUAGE_OPTIONS: {
    label: string;
    value: FlowLanguageCode;
}[];
export declare const decideCapability: (...args: Parameters<Capabilities["decideCapability"]>) => Promise<import("./types").CapabilityDecision>;
export declare const resolveBackend: (...args: Parameters<Capabilities["resolveBackend"]>) => Promise<{
    available: boolean;
    transport?: import("./types").BackendTransport;
    apiName?: string;
    baseUrl?: string;
    reason?: string;
}>;
export declare const dispatchBackend: (...args: Parameters<Backend<unknown>["dispatchBackend"]>) => Promise<unknown>;
export declare const initializeFlow: () => FlowPlugin;
