import { getFlowPlugin } from "@smart-cloud/flow-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  RuntimeFieldState,
  SelectFieldConfig,
  SelectOption,
} from "../../shared/types";

interface UseOptionsDataResult {
  options: SelectOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  search: (query: string) => void;
}

export function useOptionsData(
  field: SelectFieldConfig,
  runtime?: RuntimeFieldState,
): UseOptionsDataResult {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const effectiveField = useMemo(
    () => ({ ...field, ...(runtime || {}) }),
    [field, runtime],
  );

  const fetchOptions = useCallback(
    async (query?: string) => {
      if (!effectiveField.apiEndpoint) {
        setError("API endpoint not configured");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let fullUrl: string;

        if (
          effectiveField.apiEndpoint.startsWith("http://") ||
          effectiveField.apiEndpoint.startsWith("https://")
        ) {
          fullUrl = effectiveField.apiEndpoint;
        } else if (effectiveField.apiEndpoint.startsWith("/")) {
          fullUrl = `${window.location.origin}${effectiveField.apiEndpoint}`;
        } else {
          const pluginUrl = getFlowPlugin()?.baseUrl || "";
          fullUrl = `${pluginUrl}blocks/${effectiveField.apiEndpoint}`;
        }

        const url = new URL(fullUrl);

        if (query && effectiveField.searchParam) {
          url.searchParams.set(effectiveField.searchParam, query);
        }

        const headers = effectiveField.apiHeaders
          ? JSON.parse(effectiveField.apiHeaders)
          : {};
        const params = effectiveField.apiParams
          ? JSON.parse(effectiveField.apiParams)
          : {};

        if (effectiveField.apiMethod === "GET" || !effectiveField.apiMethod) {
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
          });
        }

        const response = await fetch(url.toString(), {
          method: effectiveField.apiMethod || "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body:
            effectiveField.apiMethod === "POST"
              ? JSON.stringify(params)
              : undefined,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        let optionsData = data;
        if (effectiveField.apiResponsePath) {
          const path = effectiveField.apiResponsePath.split(".");
          for (const key of path) {
            optionsData = optionsData?.[key];
          }
        }

        if (!Array.isArray(optionsData)) {
          throw new Error("API response is not an array");
        }

        const mappedOptions: SelectOption[] = optionsData.map(
          (item: Record<string, unknown>) => ({
            label: String(item.label || item.name || item.value || item) || "",
            value: String(item.value || item.id || item.label || item) || "",
          }),
        );

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
    [effectiveField],
  );

  useEffect(() => {
    if (effectiveField.optionsSource === "api") {
      fetchOptions();
    }
  }, [effectiveField.optionsSource, fetchOptions]);

  useEffect(() => {
    if (effectiveField.optionsSource !== "autocomplete") return;
    if (searchQuery.length < (effectiveField.autocompleteMinChars || 2)) {
      setOptions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchOptions(searchQuery);
    }, effectiveField.autocompleteDebounce || 300);

    return () => clearTimeout(timer);
  }, [
    searchQuery,
    effectiveField.optionsSource,
    effectiveField.autocompleteMinChars,
    effectiveField.autocompleteDebounce,
    fetchOptions,
  ]);

  if (
    !effectiveField.optionsSource ||
    effectiveField.optionsSource === "static"
  ) {
    return {
      options: effectiveField.options || [],
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
