import type {
  AiSuggestionCard,
  AiSuggestionReference,
} from "../../shared/types";

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

function getStringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function getStringProperty(
  value: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const candidate = getStringValue(value[key]);
    if (candidate) return candidate;
  }

  return undefined;
}

function getConfidence(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "low") return 0.35;
    if (normalized === "medium") return 0.65;
    if (normalized === "high") return 0.9;

    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function parseSuggestionReference(
  value: unknown,
): AiSuggestionReference | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { title: trimmed } : undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const title = getStringProperty(record, ["title", "label", "name"]);
  const url = getStringProperty(record, ["url", "href", "sourceUrl"]);

  if (!title && !url) return undefined;

  return {
    title: title || url || "Related documentation",
    url,
  };
}

function getRelatedDocumentation(
  value: unknown,
): AiSuggestionReference[] | undefined {
  if (typeof value === "string") {
    const items = value
      .split(/\r?\n/)
      .map((item) => parseSuggestionReference(item))
      .filter((item): item is AiSuggestionReference => Boolean(item));
    return items.length ? items : undefined;
  }

  if (!Array.isArray(value)) return undefined;

  const items = value
    .map((item) => parseSuggestionReference(item))
    .filter((item): item is AiSuggestionReference => Boolean(item));

  return items.length ? items : undefined;
}

function normalizeReferenceTitle(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized || undefined;
}

function normalizeReferenceUrl(value?: string): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${pathname}${parsed.search}`;
  } catch {
    return trimmed.replace(/#.*$/, "").replace(/\/+$/, "") || trimmed;
  }
}

function getCitationReferenceSets(citations: unknown): {
  titles: Set<string>;
  urls: Set<string>;
} {
  const titles = new Set<string>();
  const urls = new Set<string>();
  const docs = Array.isArray(citations)
    ? citations
    : citations &&
      typeof citations === "object" &&
      Array.isArray((citations as { docs?: unknown[] }).docs)
    ? (citations as { docs: unknown[] }).docs
    : [];

  for (const item of docs) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = normalizeReferenceTitle(
      getStringProperty(record, ["title", "name", "sourceTitle"]),
    );
    const url = normalizeReferenceUrl(
      getStringProperty(record, ["sourceUrl", "url", "href"]),
    );

    if (title) titles.add(title);
    if (url) urls.add(url);
  }

  return { titles, urls };
}

function filterRelatedDocumentationByCitations(
  items: AiSuggestionReference[] | undefined,
  citations: unknown,
): AiSuggestionReference[] | undefined {
  if (!items?.length) return undefined;

  const references = getCitationReferenceSets(citations);
  if (!references.titles.size && !references.urls.size) {
    return undefined;
  }

  const filtered = items.filter((item) => {
    const normalizedUrl = normalizeReferenceUrl(item.url);
    const normalizedTitle = normalizeReferenceTitle(item.title);

    if (normalizedUrl) {
      return references.urls.has(normalizedUrl);
    }

    if (normalizedTitle) {
      return references.titles.has(normalizedTitle);
    }

    return false;
  });

  return filtered.length ? filtered : undefined;
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
  const citations = response.citations;

  const suggestions: AiSuggestionCard[] = rawSuggestions
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const s = item as Record<string, unknown>;
      const possibleAnswer = getStringProperty(s, [
        "possibleAnswer",
        "answer",
        "proposedAnswer",
        "summary",
        "description",
      ]);
      const description = getStringProperty(s, [
        "description",
        "summary",
        "possibleAnswer",
        "answer",
      ]);

      return {
        id: typeof s.id === "string" ? s.id : `suggestion-${index + 1}`,
        title:
          getStringProperty(s, ["title", "heading", "name"]) ||
          `Suggestion ${index + 1}`,
        description,
        possibleAnswer,
        whyThisMayHelp: getStringProperty(s, [
          "whyThisMayHelp",
          "whyRelevant",
          "why",
          "rationale",
          "reasoning",
        ]),
        relatedDocumentation: filterRelatedDocumentationByCitations(
          getRelatedDocumentation(
            s.relatedDocumentation ??
              s.relatedDocs ??
              s.documentation ??
              s.references,
          ),
          citations,
        ),
        nextBestAction: getStringProperty(s, [
          "nextBestAction",
          "nextAction",
          "recommendedAction",
          "cta",
          "action",
        ]),
        confidence: getConfidence(s.confidence),
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
    citations,
    metadata:
      response.metadata && typeof response.metadata === "object"
        ? (response.metadata as Record<string, unknown>)
        : undefined,
  };
}
