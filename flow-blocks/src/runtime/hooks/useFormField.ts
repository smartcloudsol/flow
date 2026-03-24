import { useMemo } from "react";
import { useFormActions } from "../context/FormActionsContext";
import { useFormState } from "../context/FormStateContext";

export function useFormField(name: string, runtimeKey?: string) {
  const state = useFormState();
  const actions = useFormActions();
  const runtime = state.fieldStates[runtimeKey || name];

  return useMemo(
    () => ({
      value: state.values[name],
      error: state.errors[name],
      isPending: state.status === "submitting" || state.status === "validating",
      visible: runtime?.visible ?? true,
      enabled: runtime?.enabled ?? true,
      required: runtime?.required,
      runtime,
      setValue: (value: unknown) => actions.setValue(name, value),
    }),
    [actions, name, runtime, state.errors, state.status, state.values],
  );
}
