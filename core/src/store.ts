import {
  getConfig,
  getWpSuite,
  SiteSettings,
  type SubscriptionType,
} from "@smart-cloud/wpsuite-core";
import {
  createReduxStore,
  dispatch,
  register,
  select,
  subscribe,
  type StoreDescriptor,
} from "@wordpress/data";
import { I18n } from "aws-amplify/utils";
import { getFlowPlugin } from "./runtime";
import { type BackendTransport, type FormFieldDefaults } from "./types";

export interface FlowConfig {
  backendTransport?: BackendTransport;
  backendApiName?: string;
  backendBaseUrl?: string;
  subscriptionType?: SubscriptionType;
}

export type FormFieldDefaultsByFormId = Record<string, FormFieldDefaults>;

let siteSettings: SiteSettings;
if (typeof WpSuite !== "undefined") {
  siteSettings = WpSuite.siteSettings;
} else {
  siteSettings = {} as SiteSettings;
}

/**
 * Ensures we only keep runtime keys that are part of FlowConfig.
 */
export const sanitizeFlowConfig = (input: unknown): FlowConfig => {
  const v =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const out: FlowConfig = {};

  if (typeof v.backendTransport === "string") {
    out.backendTransport = v.backendTransport as BackendTransport;
  }
  if (typeof v.backendApiName === "string") {
    out.backendApiName = v.backendApiName;
  }
  if (typeof v.backendBaseUrl === "string") {
    out.backendBaseUrl = v.backendBaseUrl;
  }
  if (typeof v.subscriptionType === "string") {
    out.subscriptionType = v.subscriptionType as SubscriptionType;
  }

  return out;
};

const getCustomTranslations = async (): Promise<CustomTranslations | null> => {
  const flow = getFlowPlugin();
  if (!flow) {
    throw new Error("Flow plugin is not available");
  }
  let translations: CustomTranslations | null = null;
  if (flow.settings.customTranslationsUrl) {
    translations = await fetch(
      flow.settings.customTranslationsUrl +
        (flow.settings.customTranslationsUrl.includes("?") ? "&" : "?") +
        "t=" +
        siteSettings.lastUpdate,
    )
      .then((response) => (response.ok ? response.text() : null))
      .then((response) =>
        response ? (JSON.parse(response) as CustomTranslations) : null,
      )
      .catch(() => null);
  }
  return translations ?? null;
};

const getDefaultState = async (): Promise<State> => {
  const config = sanitizeFlowConfig(await getConfig("flow"));
  const customTranslations = await getCustomTranslations();

  return {
    config: config,
    language: undefined,
    direction: undefined,
    customTranslations: customTranslations,
    fieldDefaultValues: {},
  };
};

function normalizeOptionalIdentifier(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function requireIdentifier(name: string, value: string): string {
  const normalized = normalizeOptionalIdentifier(value);

  if (!normalized) {
    throw new Error(`${name} must be a non-empty string`);
  }

  return normalized;
}

const actions = {
  setLanguage(language: string | undefined | null) {
    if (!language || language === "system") {
      I18n.setLanguage("");
    } else {
      I18n.setLanguage(language);
    }
    return {
      type: "SET_LANGUAGE",
      language,
    };
  },

  setDirection(direction: "ltr" | "rtl" | "auto" | undefined | null) {
    return {
      type: "SET_DIRECTION",
      direction,
    };
  },

  setConfig: (config: FlowConfig) => ({
    type: "SET_CONFIG" as const,
    config,
  }),

  setFormFieldDefaultValue(formId: string, fieldName: string, value: unknown) {
    return {
      type: "SET_FORM_FIELD_DEFAULT_VALUE" as const,
      formId: requireIdentifier("formId", formId),
      fieldName: requireIdentifier("fieldName", fieldName),
      value,
    };
  },

  setFormFieldDefaultValues(formId: string, values: FormFieldDefaults) {
    return {
      type: "SET_FORM_FIELD_DEFAULT_VALUES" as const,
      formId: requireIdentifier("formId", formId),
      values,
    };
  },

  clearFormFieldDefaultValues(formId: string) {
    return {
      type: "CLEAR_FORM_FIELD_DEFAULT_VALUES" as const,
      formId: requireIdentifier("formId", formId),
    };
  },
};

const selectors = {
  getConfig(state: State): FlowConfig {
    return state.config;
  },
  getCustomTranslations(state: State) {
    return state.customTranslations;
  },
  getLanguage(state: State) {
    return state.language;
  },
  getDirection(state: State) {
    return state.direction;
  },
  getState(state: State) {
    return state;
  },
  getFormFieldDefaultValues(state: State, formId: string): FormFieldDefaults {
    const normalizedFormId = normalizeOptionalIdentifier(formId);
    if (!normalizedFormId) {
      return {};
    }

    return state.fieldDefaultValues[normalizedFormId] ?? {};
  },
  getFormFieldDefaultValue(
    state: State,
    formId: string,
    fieldName: string,
  ) {
    const normalizedFormId = normalizeOptionalIdentifier(formId);
    const normalizedFieldName = normalizeOptionalIdentifier(fieldName);

    if (!normalizedFormId || !normalizedFieldName) {
      return undefined;
    }

    return state.fieldDefaultValues[normalizedFormId]?.[normalizedFieldName];
  },
  getAllFormFieldDefaultValues(state: State): FormFieldDefaultsByFormId {
    return state.fieldDefaultValues;
  },
};

const resolvers = {};

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

export const getStoreDispatch = (
  store: Store,
): Omit<StoreActions, "setConfig"> => {
  const d = dispatch(store) as unknown as StoreActions;
  delete d.setConfig;
  return d;
};

export const getStoreSelect = (store: Store): StoreSelectors =>
  select(store) as unknown as StoreSelectors;

export const reloadConfig = async (store: Store) => {
  getWpSuite()!.siteSettings.lastUpdate = Date.now();
  const cfg = await getConfig("flow");
  const sanitized = sanitizeFlowConfig(cfg);
  (dispatch(store) as unknown as StoreActions).setConfig!(sanitized);
};

export const createStore = async (): Promise<Store> => {
  const DEFAULT_STATE = await getDefaultState();
  const store = createReduxStore("smartcloud/flow", {
    reducer(state = DEFAULT_STATE, action) {
      switch (action.type) {
        case "SET_LANGUAGE":
          return {
            ...state,
            language: action.language,
          };

        case "SET_DIRECTION":
          return {
            ...state,
            direction: action.direction,
          };

        case "SET_CONFIG":
          return {
            ...state,
            config: action.config,
          };

        case "SET_FORM_FIELD_DEFAULT_VALUE":
          return {
            ...state,
            fieldDefaultValues: {
              ...state.fieldDefaultValues,
              [action.formId]: {
                ...(state.fieldDefaultValues[action.formId] ?? {}),
                [action.fieldName]: action.value,
              },
            },
          };

        case "SET_FORM_FIELD_DEFAULT_VALUES":
          return {
            ...state,
            fieldDefaultValues: {
              ...state.fieldDefaultValues,
              [action.formId]: {
                ...(state.fieldDefaultValues[action.formId] ?? {}),
                ...action.values,
              },
            },
          };

        case "CLEAR_FORM_FIELD_DEFAULT_VALUES": {
          if (!(action.formId in state.fieldDefaultValues)) {
            return state;
          }

          const nextFieldDefaultValues = {
            ...state.fieldDefaultValues,
          };
          delete nextFieldDefaultValues[action.formId];

          return {
            ...state,
            fieldDefaultValues: nextFieldDefaultValues,
          };
        }
      }
      return state;
    },
    actions,
    selectors,
    resolvers,
  });

  register(store);
  return store;
};

export const observeStore = (
  observableStore: Store,
  selector: (state: State) => boolean | number | string | null | undefined,
  onChange: (
    nextValue: boolean | number | string | null | undefined,
    previousValue: boolean | number | string | null | undefined,
  ) => void,
) => {
  let currentValue: boolean | number | string | null | undefined;

  function handleChange() {
    const state = getStoreSelect(observableStore).getState();
    const nextValue = selector(state);

    if (nextValue !== currentValue) {
      const oldValue = currentValue;
      currentValue = nextValue;
      onChange(currentValue, oldValue);
    }
  }

  const unsubscribe = subscribe(handleChange, observableStore);
  handleChange();
  return unsubscribe;
};
