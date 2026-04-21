import { getFlowPlugin } from "@smart-cloud/flow-core";
import { useCallback, useEffect, useState } from "react";
import type {
  CheckboxGroupFieldConfig,
  RadioFieldConfig,
  RuntimeFieldState,
  SelectFieldConfig,
  SelectOption,
  TagsFieldConfig,
} from "../../shared/types";

type OptionsFieldConfig =
  | SelectFieldConfig
  | RadioFieldConfig
  | CheckboxGroupFieldConfig
  | TagsFieldConfig;

function getPathSegments(path: string | undefined): string[] {
  if (!path) return [];

  const normalizedPath = path
    .replace(/\[\]/g, ".")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const responseIndex = normalizedPath.indexOf("response");
  if (responseIndex >= 0) {
    return normalizedPath.slice(responseIndex + 1);
  }

  return normalizedPath;
}

function readPathValue(value: unknown, path: string | undefined): unknown {
  const segments = getPathSegments(path);
  if (!segments.length) {
    return value;
  }

  return segments.reduce<unknown>((current, segment) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, value);
}

function toOptionString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

interface UseOptionsDataResult {
  options: SelectOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  search: (query: string) => void;
}

export function useOptionsData(
  field: OptionsFieldConfig,
  runtime?: RuntimeFieldState,
): UseOptionsDataResult {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const staticOptions = runtime?.options ?? field.options ?? [];
  const optionsSource = runtime?.optionsSource ?? field.optionsSource;
  const apiEndpoint = runtime?.apiEndpoint ?? field.apiEndpoint;
  const apiMethod = runtime?.apiMethod ?? field.apiMethod;
  const apiHeaders = runtime?.apiHeaders ?? field.apiHeaders;
  const apiParams = runtime?.apiParams ?? field.apiParams;
  const apiResponsePath = runtime?.apiResponsePath ?? field.apiResponsePath;
  const apiLabelPath = runtime?.apiLabelPath ?? field.apiLabelPath;
  const apiValuePath = runtime?.apiValuePath ?? field.apiValuePath;
  const autocompleteMinChars =
    runtime?.autocompleteMinChars ?? field.autocompleteMinChars;
  const autocompleteDebounce =
    runtime?.autocompleteDebounce ?? field.autocompleteDebounce;
  const searchParam = runtime?.searchParam ?? field.searchParam;

  const fetchOptions = useCallback(
    async (query?: string) => {
      if (!apiEndpoint) {
        setError("API endpoint not configured");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let fullUrl: string;

        if (
          apiEndpoint.startsWith("http://") ||
          apiEndpoint.startsWith("https://")
        ) {
          fullUrl = apiEndpoint;
        } else if (apiEndpoint.startsWith("/")) {
          fullUrl = `${window.location.origin}${apiEndpoint}`;
        } else {
          const pluginUrl = getFlowPlugin()?.baseUrl || "";
          fullUrl = `${pluginUrl}blocks/${apiEndpoint}`;
        }

        const url = new URL(fullUrl);

        if (query && searchParam) {
          url.searchParams.set(searchParam, query);
        }

        const headers = apiHeaders ? JSON.parse(apiHeaders) : {};
        const params = apiParams ? JSON.parse(apiParams) : {};

        if (apiMethod === "GET" || !apiMethod) {
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
          });
        }

        const response = await fetch(url.toString(), {
          method: apiMethod || "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: apiMethod === "POST" ? JSON.stringify(params) : undefined,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        const optionsData = apiResponsePath
          ? readPathValue(data, apiResponsePath)
          : data;

        if (!Array.isArray(optionsData)) {
          throw new Error("API response is not an array");
        }

        const mappedOptions: SelectOption[] = optionsData
          .map((item: unknown) => {
            const labelValue = apiLabelPath
              ? readPathValue(item, apiLabelPath)
              : item && typeof item === "object"
              ? (item as Record<string, unknown>).label ||
                (item as Record<string, unknown>).name ||
                (item as Record<string, unknown>).value ||
                item
              : item;
            const rawValue = apiValuePath
              ? readPathValue(item, apiValuePath)
              : item && typeof item === "object"
              ? (item as Record<string, unknown>).value ||
                (item as Record<string, unknown>).id ||
                (item as Record<string, unknown>).label ||
                item
              : item;

            const label = toOptionString(labelValue);
            const value = toOptionString(rawValue);

            if (!label && !value) {
              return null;
            }

            return {
              label: label || value,
              value: value || label,
            };
          })
          .filter((item): item is SelectOption => Boolean(item));

        setOptions(mappedOptions);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch options",
        );
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      apiEndpoint,
      apiHeaders,
      apiLabelPath,
      apiMethod,
      apiParams,
      apiResponsePath,
      apiValuePath,
      searchParam,
    ],
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (optionsSource === "api") {
        fetchOptions();
      }
    });
  }, [optionsSource, fetchOptions]);

  useEffect(() => {
    queueMicrotask(() => {
      if (optionsSource !== "autocomplete") return;
      if (searchQuery.length < (autocompleteMinChars || 2)) {
        setOptions([]);
        return;
      }

      const timer = setTimeout(() => {
        fetchOptions(searchQuery);
      }, autocompleteDebounce || 300);

      return () => clearTimeout(timer);
    });
  }, [
    autocompleteDebounce,
    autocompleteMinChars,
    fetchOptions,
    optionsSource,
    searchQuery,
  ]);

  if (!optionsSource || optionsSource === "static") {
    return {
      options: staticOptions,
      isLoading: false,
      error: null,
      refetch: () => {},
      search: () => {},
    };
  }

  return {
    options,
    isLoading,
    error,
    refetch: () => fetchOptions(),
    search: setSearchQuery,
  };
}
