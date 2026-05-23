import { type SubscriptionType } from "@smart-cloud/wpsuite-core";
import { type StoreDescriptor } from "@wordpress/data";
import { type BackendTransport, type FormFieldDefaults } from "./types";
export interface FlowConfig {
    backendTransport?: BackendTransport;
    backendApiName?: string;
    backendBaseUrl?: string;
    subscriptionType?: SubscriptionType;
}
export type FormFieldDefaultsByFormId = Record<string, FormFieldDefaults>;
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
    setFormFieldDefaultValue(formId: string, fieldName: string, value: unknown): {
        type: "SET_FORM_FIELD_DEFAULT_VALUE";
        formId: string;
        fieldName: string;
        value: unknown;
    };
    setFormFieldDefaultValues(formId: string, values: FormFieldDefaults): {
        type: "SET_FORM_FIELD_DEFAULT_VALUES";
        formId: string;
        values: FormFieldDefaults;
    };
    clearFormFieldDefaultValues(formId: string): {
        type: "CLEAR_FORM_FIELD_DEFAULT_VALUES";
        formId: string;
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
    fieldDefaultValues: FormFieldDefaultsByFormId;
}
export type Store = StoreDescriptor;
export type StoreSelectors = {
    getConfig(): FlowConfig | null;
    getCustomTranslations(): CustomTranslations | null;
    getLanguage(): string | undefined | null;
    getDirection(): "ltr" | "rtl" | "auto" | undefined | null;
    getState(): State;
    getFormFieldDefaultValues(formId: string): FormFieldDefaults;
    getFormFieldDefaultValue(formId: string, fieldName: string): unknown;
    getAllFormFieldDefaultValues(): FormFieldDefaultsByFormId;
};
export type StoreActions = Omit<typeof actions, "setConfig"> & {
    setConfig?: typeof actions.setConfig;
    setFormFieldDefaultValue: typeof actions.setFormFieldDefaultValue;
    setFormFieldDefaultValues: typeof actions.setFormFieldDefaultValues;
    clearFormFieldDefaultValues: typeof actions.clearFormFieldDefaultValues;
};
export declare const getStoreDispatch: (store: Store) => Omit<StoreActions, "setConfig">;
export declare const getStoreSelect: (store: Store) => StoreSelectors;
export declare const reloadConfig: (store: Store) => Promise<void>;
export declare const createStore: () => Promise<Store>;
export declare const observeStore: (observableStore: Store, selector: (state: State) => boolean | number | string | null | undefined, onChange: (nextValue: boolean | number | string | null | undefined, previousValue: boolean | number | string | null | undefined) => void) => () => void;
export {};
