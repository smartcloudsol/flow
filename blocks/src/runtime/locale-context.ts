import { createContext, useContext } from "react";
export const FlowLocaleContext = createContext<{ language: string; get(key: string, fallback?: string): string } | null>(null);
export function useFlowI18n() {
  const context = useContext(FlowLocaleContext);
  if (!context) throw new Error("Flow UI requires FlowLocaleProvider");
  return context;
}
