import type { WordPressRuntimeContext } from "./types";

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

function resolveRuntimeContextToken(
  token: string,
  wpContext?: WordPressRuntimeContext,
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

  return undefined;
}

export function resolveRuntimeContextString(
  value: string,
  wpContext?: WordPressRuntimeContext,
): string {
  if (!value) {
    return value;
  }

  return value.replace(
    /\{\{\s*((?:wp|query|location|wpsuite|global)\.[a-zA-Z0-9_$.-]+)\s*\}\}/g,
    (match, rawToken) => {
      const resolved = resolveRuntimeContextToken(String(rawToken), wpContext);
      return resolved === undefined ? match : resolved;
    },
  );
}

export function resolveRuntimeContextValue<T>(
  value: T,
  wpContext?: WordPressRuntimeContext,
): T {
  if (typeof value === "string") {
    return resolveRuntimeContextString(value, wpContext) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      resolveRuntimeContextValue(entry, wpContext),
    ) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, entryValue]) => [
          key,
          resolveRuntimeContextValue(entryValue, wpContext),
        ],
      ),
    ) as T;
  }

  return value;
}
