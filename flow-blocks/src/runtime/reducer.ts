import type {
  AiSuggestionCard,
  FieldConfig,
  FormErrors,
  FormStatus,
  FormValues,
  RuntimeFieldStateMap,
} from "../shared/types";

export interface FormRuntimeState {
  status: FormStatus;
  values: FormValues;
  errors: FormErrors;
  fields: FieldConfig[];
  submitCount: number;
  message?: string;
  touched: Set<string>;
  fieldStates: RuntimeFieldStateMap;
  aiSuggestions: {
    status: "idle" | "loading" | "done" | "accepted" | "rejected";
    suggestions: AiSuggestionCard[];
    selectedSuggestionId?: string;
    rawText?: string;
    citations?: unknown;
    metadata?: Record<string, unknown>;
  };
}

export type FormAction =
  | { type: "INIT"; fields: FieldConfig[]; values: FormValues }
  | { type: "SET_VALUE"; name: string; value: unknown }
  | { type: "SET_ERRORS"; errors: FormErrors }
  | { type: "SET_FIELD_ERROR"; name: string; error: string | undefined }
  | { type: "SET_STATUS"; status: FormStatus; message?: string }
  | { type: "AI_SUGGESTIONS_LOADING" }
  | {
      type: "AI_SUGGESTIONS_DONE";
      suggestions: AiSuggestionCard[];
      rawText?: string;
      citations?: unknown;
      metadata?: Record<string, unknown>;
    }
  | { type: "AI_SUGGESTIONS_ACCEPT"; suggestionId?: string }
  | { type: "AI_SUGGESTIONS_REJECT" }
  | { type: "AI_SUGGESTIONS_RESET" }
  | { type: "DRAFT_LOADED"; values: FormValues; message?: string }
  | { type: "SUBMIT_SUCCESS"; message?: string }
  | { type: "RESET"; values: FormValues };

function collectInitialValues(
  fields: FieldConfig[],
  acc: FormValues,
): FormValues {
  fields.forEach((field) => {
    if (field.type === "submit" || field.type === "save-draft") {
      return;
    }

    if (
      field.type === "stack" ||
      field.type === "group" ||
      field.type === "grid" ||
      field.type === "fieldset" ||
      field.type === "collapse" ||
      field.type === "visuallyhidden"
    ) {
      collectInitialValues(field.children, acc);
      return;
    }

    if (field.type === "wizard") {
      field.steps.forEach((step) => {
        collectInitialValues(step.children, acc);
      });
      return;
    }

    if ("defaultValue" in field && field.defaultValue !== undefined) {
      acc[field.name] = field.defaultValue;
      return;
    }

    if (field.type === "checkbox") {
      acc[field.name] = false;
      return;
    }

    if ("name" in field && typeof field.name === "string") {
      acc[field.name] = "";
    }
  });

  return acc;
}

export function getInitialValues(fields: FieldConfig[]): FormValues {
  return collectInitialValues(fields, {});
}

export function formReducer(
  state: FormRuntimeState,
  action: FormAction,
): FormRuntimeState {
  switch (action.type) {
    case "INIT":
      return {
        status: "idle",
        values: action.values,
        errors: {},
        fields: action.fields,
        submitCount: 0,
        touched: new Set(),
        fieldStates: state.fieldStates,
        aiSuggestions: state.aiSuggestions ?? {
          status: "idle",
          suggestions: [],
        },
      };
    case "SET_VALUE":
      return {
        ...state,
        values: {
          ...state.values,
          [action.name]: action.value,
        },
        errors: {
          ...state.errors,
          [action.name]: undefined,
        },
        touched: new Set([...state.touched, action.name]),
      };
    case "SET_ERRORS":
      return {
        ...state,
        errors: action.errors,
        status: "error",
        touched: new Set([...state.touched, ...Object.keys(action.errors)]),
      };
    case "SET_FIELD_ERROR":
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.name]: action.error,
        },
      };
    case "SET_STATUS":
      return {
        ...state,
        status: action.status,
        message: action.message,
      };

    case "AI_SUGGESTIONS_LOADING":
      return {
        ...state,
        aiSuggestions: {
          ...state.aiSuggestions,
          status: "loading",
          suggestions: [],
          selectedSuggestionId: undefined,
          rawText: undefined,
          citations: undefined,
          metadata: undefined,
        },
      };
    case "AI_SUGGESTIONS_DONE":
      return {
        ...state,
        aiSuggestions: {
          status: "done",
          suggestions: action.suggestions,
          selectedSuggestionId: undefined,
          rawText: action.rawText,
          citations: action.citations,
          metadata: action.metadata,
        },
      };
    case "AI_SUGGESTIONS_ACCEPT":
      return {
        ...state,
        aiSuggestions: {
          ...state.aiSuggestions,
          status: "accepted",
          selectedSuggestionId: action.suggestionId,
        },
      };
    case "AI_SUGGESTIONS_REJECT":
      return {
        ...state,
        aiSuggestions: {
          ...state.aiSuggestions,
          status: "rejected",
          selectedSuggestionId: undefined,
        },
      };
    case "AI_SUGGESTIONS_RESET":
      return {
        ...state,
        aiSuggestions: { status: "idle", suggestions: [] },
      };
    case "DRAFT_LOADED":
      return {
        ...state,
        status: "idle",
        values: action.values,
        errors: {},
        touched: new Set(),
        message: action.message,
      };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        status: "success",
        submitCount: state.submitCount + 1,
        errors: {},
        message: action.message,
      };
    case "RESET":
      return {
        ...state,
        status: "idle",
        values: action.values,
        errors: {},
        touched: new Set(),
        fieldStates: state.fieldStates,
        aiSuggestions: { status: "idle", suggestions: [] },
      };
    default:
      return state;
  }
}
