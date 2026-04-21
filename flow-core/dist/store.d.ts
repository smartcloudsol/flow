import { type SubscriptionType } from "@smart-cloud/wpsuite-core";
import { type StoreDescriptor } from "@wordpress/data";
import { type BackendTransport } from "./types";
export interface FlowConfig {
    backendTransport?: BackendTransport;
    backendApiName?: string;
    backendBaseUrl?: string;
    subscriptionType?: SubscriptionType;
}
/**
 * Ensures we only keep runtime keys that are part of FlowConfig.
 */
export declare const sanitizeFlowConfig: (input: unknown) => FlowConfig;
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
export interface CustomTranslations {
    [key: string]: Record<string, string>;
}
export interface State {
    config: FlowConfig;
    language: string | undefined | null;
    direction: "ltr" | "rtl" | "auto" | undefined | null;
    customTranslations: CustomTranslations | null;
    fieldDefaultValues: Record<string, unknown>;
}
export type Store = StoreDescriptor;
export type StoreSelectors = {
    getConfig(): FlowConfig | null;
    getCustomTranslations(): CustomTranslations | null;
    getLanguage(): string | undefined | null;
    getDirection(): "ltr" | "rtl" | "auto" | undefined | null;
    getState(): State;
    getFieldDefaultValues(): Record<string, unknown>;
    getFieldDefaultValue(fieldName: string): unknown;
};
export type StoreActions = Omit<typeof actions, "setConfig"> & {
    setConfig?: typeof actions.setConfig;
    setFieldDefaultValue: typeof actions.setFieldDefaultValue;
    setFieldDefaultValues: typeof actions.setFieldDefaultValues;
    clearFieldDefaultValues: typeof actions.clearFieldDefaultValues;
};
export declare const getStoreDispatch: (store: Store) => Omit<StoreActions, "setConfig">;
export declare const getStoreSelect: (store: Store) => StoreSelectors;
export declare const reloadConfig: (store: Store) => Promise<void>;
export declare const createStore: () => Promise<Store>;
export declare const observeStore: (observableStore: Store, selector: (state: State) => boolean | number | string | null | undefined, onChange: (nextValue: boolean | number | string | null | undefined, previousValue: boolean | number | string | null | undefined) => void) => () => void;
export {};
