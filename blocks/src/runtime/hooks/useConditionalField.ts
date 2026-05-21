import { useEffect, useMemo } from "react";
import type { FieldConfig } from "../../shared/types";
import { useFormActions } from "../context/FormActionsContext";
import { useFormState } from "../context/FormStateContext";

export function useConditionalField<T extends FieldConfig>(
  field: T,
  runtimeKey?: string,
) {
  const state = useFormState();
  const actions = useFormActions();
  const runtime = runtimeKey ? state.fieldStates?.[runtimeKey] : undefined;

  useEffect(() => {
    if (!("name" in field) || !field.name || !runtime) return;
    const currentValue = state.values[field.name];

    if (runtime.clearValue) {
      const emptyValue = Array.isArray(currentValue) ? [] : "";
      if (
        currentValue !== emptyValue &&
        currentValue !== undefined &&
        currentValue !== null &&
        currentValue !== ""
      ) {
        actions.setValue(field.name, emptyValue);
      }
      return;
    }

    if (runtime.setValue !== undefined && currentValue !== runtime.setValue) {
      actions.setValue(field.name, runtime.setValue);
    }
  }, [actions, field, runtime, state.values]);

  return useMemo(() => {
    if (!runtime) return field;
    const next = { ...field } as T & { __conditional?: typeof runtime };
    if (runtime.options && "options" in next) {
      (next as T & { options?: unknown }).options = runtime.options;
    }
    if (typeof runtime.required === "boolean" && "required" in next) {
      (next as T & { required?: boolean }).required = runtime.required;
    }
    next.__conditional = runtime;
    return next;
  }, [field, runtime]);
}
