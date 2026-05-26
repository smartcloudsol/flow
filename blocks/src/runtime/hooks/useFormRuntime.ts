import { useFormActions } from "../context/FormActionsContext";
import { useFormAttributes } from "../context/FormAttributesContext";
import { useFormState } from "../context/FormStateContext";

export function useFormRuntime() {
  const state = useFormState();
  const actions = useFormActions();
  const attributes = useFormAttributes();

  return {
    ...state,
    isPending: [
      "submitting",
      "validating",
      "saving-draft",
      "loading-draft",
      "deleting-draft",
    ].includes(state.status),
    aiSuggestions: state.aiSuggestions,
    ...actions,
    ...attributes,
  };
}
