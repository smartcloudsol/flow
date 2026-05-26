import { createContext, useContext, type PropsWithChildren } from "react";
import type { FormRuntimeState } from "../reducer";

const FormStateContext = createContext<FormRuntimeState | null>(null);

export function FormStateProvider({
  value,
  children,
}: PropsWithChildren<{ value: FormRuntimeState }>) {
  return (
    <FormStateContext.Provider value={value}>
      {children}
    </FormStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormState(): FormRuntimeState {
  const context = useContext(FormStateContext);
  if (!context) {
    throw new Error("useFormState must be used inside FormStateProvider");
  }
  return context;
}
