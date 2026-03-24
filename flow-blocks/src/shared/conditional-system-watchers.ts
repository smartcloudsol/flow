import type { FormValues } from "./types";

export const CONDITIONAL_SYSTEM_VALUE_PREFIX = "__flow.";

export const AI_SUGGESTION_WATCHER_KEYS = {
  status: "__flow.aiSuggestions.status",
  accepted: "__flow.aiSuggestions.accepted",
  rejected: "__flow.aiSuggestions.rejected",
  ran: "__flow.aiSuggestions.ran",
  suggestionCount: "__flow.aiSuggestions.suggestionCount",
  selectedSuggestionId: "__flow.aiSuggestions.selectedSuggestionId",
  sourcesUsed: "__flow.aiSuggestions.sourcesUsed",
} as const;

export function stripConditionalSystemValues(values: FormValues): FormValues {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key]) => !key.startsWith(CONDITIONAL_SYSTEM_VALUE_PREFIX),
    ),
  );
}
