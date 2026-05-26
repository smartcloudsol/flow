import type { WordPressRuntimeContext } from "./types";

type RuntimeContextFormValues = Record<string, unknown>;

const RUNTIME_CONTEXT_TOKEN_PATTERN =
  /\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$-]*(?:\.[a-zA-Z0-9_$-]+)*)\s*\}\}/g;

function getWordPressRuntimeTokenValue(
  token: string,
  wpContext?: WordPressRuntimeContext,
): string {
  if (!wpContext) {
    return "";
  }

  switch (token) {
    case "postId":
      return wpContext.postId !== undefined ? String(wpContext.postId) : "";
    case "postSlug":
      return wpContext.postSlug || "";
    case "postType":
      return wpContext.postType || "";
    case "postTitle":
      return wpContext.postTitle || "";
    case "postUrl":
      return wpContext.postUrl || "";
    default:
      return "";
  }
}

function getQueryParamTokenValue(token: string): string {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  return new URLSearchParams(window.location.search).get(token) || "";
}

function getLocationTokenValue(token: string): string {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  switch (token) {
    case "href":
      return window.location.href;
    case "origin":
      return window.location.origin;
    case "protocol":
      return window.location.protocol;
    case "host":
      return window.location.host;
    case "hostname":
      return window.location.hostname;
    case "port":
      return window.location.port;
    case "pathname":
      return window.location.pathname;
    case "search":
      return window.location.search;
    case "hash":
      return window.location.hash;
    default:
      return "";
  }
}

function getGlobalObjectTokenValue(path: string): string {
  if (typeof globalThis === "undefined" || !path) {
    return "";
  }

  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    return "";
  }

  let current: unknown = globalThis as Record<string, unknown>;
  for (const segment of segments) {
    if (
      !current ||
      (typeof current !== "object" && typeof current !== "function")
    ) {
      return "";
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (
    typeof current === "string" ||
    typeof current === "number" ||
    typeof current === "boolean"
  ) {
    return String(current);
  }

  return "";
}

function getFormValueTokenValue(
  token: string,
  formValues?: RuntimeContextFormValues,
): string {
  if (!formValues || !token) {
    return "";
  }

  if (token in formValues) {
    const exactValue = formValues[token];

    if (
      typeof exactValue === "string" ||
      typeof exactValue === "number" ||
      typeof exactValue === "boolean"
    ) {
      return String(exactValue);
    }
  }

  const segments = token.split(".").filter(Boolean);
  if (segments.length === 0) {
    return "";
  }

  let current: unknown = formValues;
  for (const segment of segments) {
    if (
      !current ||
      (typeof current !== "object" && typeof current !== "function")
    ) {
      return "";
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (
    typeof current === "string" ||
    typeof current === "number" ||
    typeof current === "boolean"
  ) {
    return String(current);
  }

  return "";
}

function resolveRuntimeContextToken(
  token: string,
  wpContext?: WordPressRuntimeContext,
  formValues?: RuntimeContextFormValues,
): string | undefined {
  if (token.startsWith("query.")) {
    return getQueryParamTokenValue(token.slice("query.".length));
  }

  if (token.startsWith("location.")) {
    return getLocationTokenValue(token.slice("location.".length));
  }

  if (token.startsWith("wp.")) {
    return getWordPressRuntimeTokenValue(token.slice("wp.".length), wpContext);
  }

  if (token.startsWith("wpsuite.")) {
    return getGlobalObjectTokenValue(
      `WpSuite.${token.slice("wpsuite.".length)}`,
    );
  }

  if (token.startsWith("global.")) {
    return getGlobalObjectTokenValue(token.slice("global.".length));
  }

  if (token.startsWith("field.")) {
    return getFormValueTokenValue(token.slice("field.".length), formValues);
  }

  return formValues ? getFormValueTokenValue(token, formValues) : undefined;
}

export function resolveRuntimeContextString(
  value: string,
  wpContext?: WordPressRuntimeContext,
  formValues?: RuntimeContextFormValues,
): string {
  if (!value) {
    return value;
  }

  return value.replace(RUNTIME_CONTEXT_TOKEN_PATTERN, (match, rawToken) => {
    const resolved = resolveRuntimeContextToken(
      String(rawToken),
      wpContext,
      formValues,
    );
    return resolved === undefined ? match : resolved;
  });
}

function shouldUrlEncodeRuntimeContextToken(token: string): boolean {
  if (token === "wp.postUrl") {
    return false;
  }

  if (
    token.startsWith("location.") ||
    token.startsWith("wpsuite.") ||
    token.startsWith("global.")
  ) {
    return false;
  }

  return true;
}

export function resolveRuntimeContextUrlString(
  value: string,
  wpContext?: WordPressRuntimeContext,
  formValues?: RuntimeContextFormValues,
): string {
  if (!value) {
    return value;
  }

  return value.replace(RUNTIME_CONTEXT_TOKEN_PATTERN, (match, rawToken) => {
    const token = String(rawToken);
    const resolved = resolveRuntimeContextToken(token, wpContext, formValues);

    if (resolved === undefined) {
      return match;
    }

    return shouldUrlEncodeRuntimeContextToken(token)
      ? encodeURIComponent(resolved)
      : resolved;
  });
}

export function hasUnresolvedRuntimeContextTokens(
  value: string,
  wpContext?: WordPressRuntimeContext,
  formValues?: RuntimeContextFormValues,
): boolean {
  if (!value) {
    return false;
  }

  for (const match of value.matchAll(RUNTIME_CONTEXT_TOKEN_PATTERN)) {
    const token = String(match[1] ?? "");
    const resolved = resolveRuntimeContextToken(token, wpContext, formValues);

    if (resolved === undefined || resolved === "") {
      return true;
    }
  }

  return false;
}

export function resolveRuntimeContextValue<T>(
  value: T,
  wpContext?: WordPressRuntimeContext,
  formValues?: RuntimeContextFormValues,
): T {
  if (typeof value === "string") {
    return resolveRuntimeContextString(value, wpContext, formValues) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      resolveRuntimeContextValue(entry, wpContext, formValues),
    ) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, entryValue]) => [
          key,
          resolveRuntimeContextValue(entryValue, wpContext, formValues),
        ],
      ),
    ) as T;
  }

  return value;
}
