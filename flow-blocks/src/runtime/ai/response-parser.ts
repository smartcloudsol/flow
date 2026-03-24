import type { AiSuggestionCard } from "../../shared/types";

export interface ParsedAiSuggestionsResponse {
  suggestions: AiSuggestionCard[];
  rawText?: string;
  citations?: unknown;
  metadata?: Record<string, unknown>;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}

function getCitationIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const citationIds = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  return citationIds.length ? citationIds : undefined;
}

export function parseAiSuggestionsResponse(
  payload: unknown,
): ParsedAiSuggestionsResponse {
  const response =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const resultText = typeof response.result === "string" ? response.result : "";
  const parsed = tryParseJson(resultText);
  const parsedObj =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : undefined;
  const parsedSuggestionsArray = Array.isArray(parsedObj?.suggestions);
  const rawSuggestions = Array.isArray(parsedObj?.suggestions)
    ? parsedObj?.suggestions
    : [];

  const suggestions: AiSuggestionCard[] = rawSuggestions
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const s = item as Record<string, unknown>;
      return {
        id: typeof s.id === "string" ? s.id : `suggestion-${index + 1}`,
        title:
          typeof s.title === "string" ? s.title : `Suggestion ${index + 1}`,
        description:
          typeof s.description === "string" ? s.description : undefined,
        confidence: typeof s.confidence === "number" ? s.confidence : undefined,
        citationIds:
          getCitationIds(s.citationIds) ?? getCitationIds(s.citations),
      };
    });

  return {
    suggestions,
    rawText:
      suggestions.length || parsedSuggestionsArray
        ? undefined
        : resultText || undefined,
    citations: response.citations,
    metadata:
      response.metadata && typeof response.metadata === "object"
        ? (response.metadata as Record<string, unknown>)
        : undefined,
  };
}
