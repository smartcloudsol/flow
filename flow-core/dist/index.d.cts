import { SubscriptionType, WpSuitePluginBase } from '@smart-cloud/wpsuite-core';
import { StoreDescriptor } from '@wordpress/data';

interface FlowConfig {
    backendTransport?: BackendTransport;
    backendApiName?: string;
    backendBaseUrl?: string;
    subscriptionType?: SubscriptionType;
}
/**
 * Ensures we only keep runtime keys that are part of FlowConfig.
 */
declare const sanitizeFlowConfig: (input: unknown) => FlowConfig;
declare const actions: {
    setLanguage(language: string | undefined | null): {
        type: string;
        language: string | null | undefined;
    };
    setDirection(direction: "ltr" | "rtl" | "auto" | undefined | null): {
        type: string;
        direction: "ltr" | "rtl" | "auto" | null | undefined;
    };
    setConfig: (config: FlowConfig) => {
        type: "SET_CONFIG";
        config: FlowConfig;
    };
    setFieldDefaultValue(fieldName: string, value: unknown): {
        type: "SET_FIELD_DEFAULT_VALUE";
        fieldName: string;
        value: unknown;
    };
    setFieldDefaultValues(values: Record<string, unknown>): {
        type: "SET_FIELD_DEFAULT_VALUES";
        values: Record<string, unknown>;
    };
    clearFieldDefaultValues(): {
        type: "CLEAR_FIELD_DEFAULT_VALUES";
    };
};
interface CustomTranslations {
    [key: string]: Record<string, string>;
}
interface State {
    config: FlowConfig;
    language: string | undefined | null;
    direction: "ltr" | "rtl" | "auto" | undefined | null;
    customTranslations: CustomTranslations | null;
    fieldDefaultValues: Record<string, unknown>;
}
type Store = StoreDescriptor;
type StoreSelectors = {
    getConfig(): FlowConfig | null;
    getCustomTranslations(): CustomTranslations | null;
    getLanguage(): string | undefined | null;
    getDirection(): "ltr" | "rtl" | "auto" | undefined | null;
    getState(): State;
    getFieldDefaultValues(): Record<string, unknown>;
    getFieldDefaultValue(fieldName: string): unknown;
};
type StoreActions = Omit<typeof actions, "setConfig"> & {
    setConfig?: typeof actions.setConfig;
    setFieldDefaultValue: typeof actions.setFieldDefaultValue;
    setFieldDefaultValues: typeof actions.setFieldDefaultValues;
    clearFieldDefaultValues: typeof actions.clearFieldDefaultValues;
};
declare const getStoreDispatch: (store: Store) => Omit<StoreActions, "setConfig">;
declare const getStoreSelect: (store: Store) => StoreSelectors;
declare const reloadConfig: (store: Store) => Promise<void>;
declare const observeStore: (observableStore: Store, selector: (state: State) => boolean | number | string | null | undefined, onChange: (nextValue: boolean | number | string | null | undefined, previousValue: boolean | number | string | null | undefined) => void) => () => void;

type ContextKind = "admin" | "frontend";
type BackendTransport = "gatey" | "fetch";
type FlowHighlightedSubmissionAction = "seen" | "resolved" | "completed";
type FlowLanguageCode = "ar" | "en" | "zh" | "nl" | "fr" | "de" | "he" | "hi" | "hu" | "id" | "it" | "ja" | "ko" | "no" | "pl" | "pt" | "ru" | "es" | "sv" | "th" | "tr" | "uk";
/**
 * FlowSettings - general settings stored in WordPress options.
 * This is what users can configure on the General settings tab.
 */
interface FlowSettings {
    /** Optional URL to custom translations JSON file. */
    customTranslationsUrl?: string;
    /** Whether to show "Powered by WPSuite Flow" branding in UIs. */
    enablePoweredBy?: boolean;
    /** Whether to enable server-side debug logging for Flow. */
    debugLoggingEnabled?: boolean;
    /** Whether to enable backend sync for form definitions. */
    formsBackendSyncEnabled?: boolean;
    /** Whether to allow permanent deletion of forms (vs archive). */
    formsAllowPermanentDelete?: boolean;
    /** AI suggestions presets available for the user. */
    aiSuggestionsPresets?: AiSuggestionPreset[];
    /** Highlighted quick status actions shown on the submission detail popup. */
    highlightedSubmissionActions?: FlowHighlightedSubmissionAction[];
}
interface FlowFeatures {
    readonly store: Promise<Store>;
}
/**
 * FlowPlugin - the main plugin object exposed at WpSuite.plugins.flow.
 * Note: accountId, siteId, siteKey are in WpSuite.siteSettings, not here.
 */
interface Flow {
    features: FlowFeatures;
    settings: FlowSettings;
    nonce: string;
    baseUrl: string;
    restUrl: string;
}
/**
 * CapabilityDecision - result of backend capability resolution.
 */
interface CapabilityDecision {
    backendAvailable: boolean;
    backendTransport?: BackendTransport;
    backendApiName?: string;
    backendBaseUrl?: string;
    backendReason?: string;
    reason: string;
}
interface AiSuggestion {
    id: string;
    title: string;
    description?: string;
    confidence?: number;
    citationIds?: string[];
    raw?: Record<string, unknown>;
}
interface AiSuggestionsState {
    status: "idle" | "loading" | "done" | "accepted" | "rejected";
    suggestions: AiSuggestion[];
    selectedSuggestionId?: string;
    rawText?: string;
    metadata?: Record<string, unknown>;
    citations?: unknown;
}
interface AiSuggestionPreset {
    id: string;
    name: string;
    template: string;
    useKnowledgeBase: boolean;
    topK?: number;
}
interface BackendCallOptions {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    query?: Record<string, string | number | boolean>;
    onStatus?: (event: FlowStatusEvent) => void;
}
type FlowStatusStep = "decide" | "backend:request" | "backend:waiting" | "backend:response" | "done" | "error";
interface FlowStatusEvent {
    context: ContextKind;
    step: FlowStatusStep;
    message?: string;
    silent?: boolean;
}
declare class BackendError extends Error {
    readonly decision?: unknown | undefined;
    constructor(message: string, decision?: unknown | undefined);
}
interface Capabilities {
    decideCapability: () => Promise<CapabilityDecision>;
    resolveBackend: () => Promise<{
        available: boolean;
        transport?: BackendTransport;
        apiName?: string;
        baseUrl?: string;
        reason?: string;
    }>;
}
interface Backend<TResponse> {
    dispatchBackend: (decision: CapabilityDecision, context: ContextKind, customPath: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", requestBody: unknown, options: BackendCallOptions) => Promise<TResponse>;
}

declare const TEXT_DOMAIN = "smartcloud-flow";

type FlowReadyEvent = "wpsuite:flow:ready";
type FlowErrorEvent = "wpsuite:flow:error";
type FlowPlugin = WpSuitePluginBase & Flow;
declare function getFlowPlugin(): FlowPlugin | undefined;
declare function waitForFlowReady(timeoutMs?: number): Promise<void>;
declare function getStore(timeoutMs?: number): Promise<Store>;

declare const LANGUAGE_OPTIONS: {
    label: string;
    value: FlowLanguageCode;
}[];
declare const decideCapability: (...args: Parameters<Capabilities["decideCapability"]>) => Promise<CapabilityDecision>;
declare const resolveBackend: (...args: Parameters<Capabilities["resolveBackend"]>) => Promise<{
    available: boolean;
    transport?: BackendTransport;
    apiName?: string;
    baseUrl?: string;
    reason?: string;
}>;
declare const dispatchBackend: (...args: Parameters<Backend<unknown>["dispatchBackend"]>) => Promise<unknown>;
declare const initializeFlow: () => FlowPlugin;

export { type AiSuggestion, type AiSuggestionPreset, type AiSuggestionsState, type Backend, type BackendCallOptions, BackendError, type BackendTransport, type Capabilities, type CapabilityDecision, type ContextKind, type CustomTranslations, type Flow, type FlowConfig, type FlowErrorEvent, type FlowFeatures, type FlowHighlightedSubmissionAction, type FlowLanguageCode, type FlowPlugin, type FlowReadyEvent, type FlowSettings, type FlowStatusEvent, type FlowStatusStep, LANGUAGE_OPTIONS, type State, type Store, TEXT_DOMAIN, decideCapability, dispatchBackend, getFlowPlugin, getStore, getStoreDispatch, getStoreSelect, initializeFlow, observeStore, reloadConfig, resolveBackend, sanitizeFlowConfig, waitForFlowReady };
