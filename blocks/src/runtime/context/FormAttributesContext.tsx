import { createContext, useContext, type PropsWithChildren } from "react";
import type { FormAttributes } from "../../shared/types";

const FormAttributesContext = createContext<FormAttributes | null>(null);

export function FormAttributesProvider({
  value,
  children,
}: PropsWithChildren<{ value: FormAttributes }>) {
  return (
    <FormAttributesContext.Provider value={value}>
      {children}
    </FormAttributesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormAttributes(): FormAttributes {
  const context = useContext(FormAttributesContext);
  if (!context) {
    throw new Error(
      "useFormAttributes must be used inside FormAttributesProvider",
    );
  }
  return context;
}
