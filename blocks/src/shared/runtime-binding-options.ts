export type RuntimeBindingKind =
  | "manual"
  | "wp.postId"
  | "wp.postSlug"
  | "wp.postType"
  | "wp.postTitle"
  | "wp.postUrl"
  | "query";

const RUNTIME_BINDING_TOKEN_MAP: Record<
  Exclude<RuntimeBindingKind, "manual" | "query">,
  string
> = {
  "wp.postId": "{{wp.postId}}",
  "wp.postSlug": "{{wp.postSlug}}",
  "wp.postType": "{{wp.postType}}",
  "wp.postTitle": "{{wp.postTitle}}",
  "wp.postUrl": "{{wp.postUrl}}",
};

export interface ParsedRuntimeBindingValue {
  kind: RuntimeBindingKind;
  customValue: string;
  queryParamName: string;
}

export function parseRuntimeBindingValue(
  value: string | undefined,
): ParsedRuntimeBindingValue {
  const normalizedValue = String(value || "");

  for (const [kind, tokenValue] of Object.entries(RUNTIME_BINDING_TOKEN_MAP)) {
    if (normalizedValue === tokenValue) {
      return {
        kind: kind as RuntimeBindingKind,
        customValue: "",
        queryParamName: "",
      };
    }
  }

  const queryParamMatch = normalizedValue.match(
    /^\{\{\s*query\.([a-zA-Z0-9_-]+)\s*\}\}$/,
  );
  if (queryParamMatch) {
    return {
      kind: "query",
      customValue: "",
      queryParamName: queryParamMatch[1] || "",
    };
  }

  return {
    kind: "manual",
    customValue: normalizedValue,
    queryParamName: "",
  };
}

export function buildRuntimeBindingValue(
  kind: RuntimeBindingKind,
  options?: {
    customValue?: string;
    queryParamName?: string;
  },
): string {
  if (kind === "manual") {
    return String(options?.customValue || "");
  }

  if (kind === "query") {
    const queryParamName = String(options?.queryParamName || "").trim();
    return queryParamName ? `{{query.${queryParamName}}}` : "";
  }

  return RUNTIME_BINDING_TOKEN_MAP[kind];
}
