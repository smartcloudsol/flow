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

export function resolveRuntimeContextString(
  value: string,
  wpContext?: WordPressRuntimeContext,
): string {
  if (!value || !wpContext) {
    return value.replace(
      /\{\{\s*query\.([a-zA-Z0-9_-]+)\s*\}\}/g,
      (_match, token) => getQueryParamTokenValue(String(token)),
    );
  }

  return value.replace(
    /\{\{\s*(wp\.(postId|postSlug|postType|postTitle|postUrl)|query\.([a-zA-Z0-9_-]+))\s*\}\}/g,
    (_match, _fullToken, queryToken) => {
      if (queryToken) {
        return getQueryParamTokenValue(String(queryToken));
      }

      const normalizedToken = String(_fullToken).replace(/^wp\./, "");
      return getWordPressRuntimeTokenValue(normalizedToken, wpContext);
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
