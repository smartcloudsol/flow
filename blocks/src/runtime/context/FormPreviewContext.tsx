import { createContext, useContext, type PropsWithChildren } from "react";
import type { SuccessStateTrigger } from "../../shared/types";

export interface FormPreviewSelection {
  mode: "form" | "wizard-step" | "success-state";
  wizardPath?: string;
  stepIndex?: number;
  successTrigger?: SuccessStateTrigger;
}

const DEFAULT_FORM_PREVIEW: FormPreviewSelection = {
  mode: "form",
};

const FormPreviewContext =
  createContext<FormPreviewSelection>(DEFAULT_FORM_PREVIEW);

export function FormPreviewProvider({
  value,
  children,
}: PropsWithChildren<{ value?: FormPreviewSelection }>) {
  return (
    <FormPreviewContext.Provider value={value ?? DEFAULT_FORM_PREVIEW}>
      {children}
    </FormPreviewContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormPreview(): FormPreviewSelection {
  return useContext(FormPreviewContext);
}
