import { createContext, useContext, type PropsWithChildren } from "react";
import type { FormErrors } from "../../shared/types";

import type { FieldConfig, FormAttributes } from "../../shared/types";

export type FormReturnIntent = "last-step" | null;

type FormActions = {
  form: FormAttributes;
  fields: FieldConfig[];
  emitFormEvent: (name: string, detail: Record<string, unknown>) => void;
  formReturnIntent: FormReturnIntent;
  clearFormReturnIntent: () => void;
  requestViewScrollReset: () => void;
  setValue: (name: string, value: unknown) => void;
  setErrors: (errors: FormErrors) => void;
  validateField: (name: string, runtimeKey?: string) => void;
  submit: () => Promise<void>;
  saveDraft: () => Promise<unknown>;
  loadDraft: () => Promise<void>;
  deleteDraft: () => Promise<void>;
  startNewForm: () => void;
  reset: () => void;
  runAiSuggestions: (
    field: Extract<FieldConfig, { type: "ai-suggestions" }>,
    runtimeKey: string,
  ) => Promise<void>;
  resetAiSuggestions: () => void;
  acceptAiSuggestion: (suggestionId?: string) => void;
  rejectAiSuggestions: () => void;
};

const FormActionsContext = createContext<FormActions | null>(null);

export function FormActionsProvider({
  value,
  children,
}: PropsWithChildren<{ value: FormActions }>) {
  return (
    <FormActionsContext.Provider value={value}>
      {children}
    </FormActionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormActions(): FormActions {
  const context = useContext(FormActionsContext);
  if (!context) {
    throw new Error("useFormActions must be used inside FormActionsProvider");
  }
  return context;
}
