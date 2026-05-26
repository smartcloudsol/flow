import { getFlowPlugin } from "@smart-cloud/flow-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CheckboxGroupFieldConfig,
  RadioFieldConfig,
  RuntimeFieldState,
  SelectFieldConfig,
  SelectOption,
  TagsFieldConfig,
  WordPressRuntimeContext,
} from "../../shared/types";
import {
  hasUnresolvedRuntimeContextTokens,
  resolveRuntimeContextValue,
  resolveRuntimeContextUrlString,
} from "../../shared/runtime-context";
import { useFormRuntime } from "./useFormRuntime";

type OptionsFieldConfig =
  | SelectFieldConfig
  | RadioFieldConfig
  | CheckboxGroupFieldConfig
  | TagsFieldConfig;

type OptionsRequestErrorType =
  | "configuration"
  | "http"
  | "invalid-response"
  | "network";

type OptionsRequestError = {
  type: OptionsRequestErrorType;
  message: string;
  status?: number;
  statusText?: string;
  responseText?: string;
};

type ResolvedJsonConfig = {
  json: string;
  error: string | null;
};

const GENERIC_OPTIONS_ERROR_MESSAGE = "Unable to load options right now.";

function createOptionsRequestError(
  type: OptionsRequestErrorType,
  message: string,
  extra: Omit<OptionsRequestError, "type" | "message"> = {},
): OptionsRequestError {
  return {
    type,
    message,
    ...extra,
  };
}

function normalizeOptionsRequestError(
  error: unknown,
  fallbackMessage = GENERIC_OPTIONS_ERROR_MESSAGE,
): OptionsRequestError {
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    typeof error.type === "string" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const candidate = error as Partial<OptionsRequestError>;
    const message =
      typeof candidate.message === "string"
        ? candidate.message
        : fallbackMessage;

    return createOptionsRequestError(
      candidate.type as OptionsRequestErrorType,
      message,
      {
        status: candidate.status,
        statusText: candidate.statusText,
        responseText: candidate.responseText,
      },
    );
  }

  if (error instanceof Error) {
    return createOptionsRequestError("network", error.message);
  }

  return createOptionsRequestError("network", fallbackMessage);
}

function extractUserFacingOptionsErrorMessage(
  responseText: string | undefined,
  fallbackMessage = GENERIC_OPTIONS_ERROR_MESSAGE,
): string {
  const trimmed = responseText?.trim();

  if (!trimmed) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallbackMessage;
    }

    const record = parsed as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }

    if (typeof record.error === "string" && record.error.trim()) {
      return record.error.trim();
    }

    if (
      record.error &&
      typeof record.error === "object" &&
      !Array.isArray(record.error)
    ) {
      const nestedMessage = (record.error as Record<string, unknown>).message;

      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage.trim();
      }
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function resolveRuntimeJsonConfig(
  rawValue: string | undefined,
  formValues: Record<string, unknown>,
  wpContext?: WordPressRuntimeContext,
): ResolvedJsonConfig {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : {};

    return {
      json: JSON.stringify(
        resolveRuntimeContextValue<Record<string, unknown>>(
          parsed,
          wpContext,
          formValues,
        ),
      ),
      error: null,
    };
  } catch (error) {
    return {
      json: "{}",
      error:
        error instanceof Error
          ? error.message
          : "Invalid API request configuration",
    };
  }
}

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

function getImplicitSelectedValue(item: unknown): unknown {
  if (!item || typeof item !== "object") {
    return undefined;
  }

  const record = item as Record<string, unknown>;

  return (
    record.selected ??
    record.checked ??
    record.isSelected ??
    record.isChecked ??
    undefined
  );
}

function matchesSelectedValue(
  candidate: unknown,
  expectedValue: string | undefined,
): boolean {
  const normalizedExpected = expectedValue?.trim();

  if (normalizedExpected) {
    return toOptionString(candidate).trim() === normalizedExpected;
  }

  if (typeof candidate === "boolean") {
    return candidate;
  }

  if (typeof candidate === "number") {
    return candidate !== 0;
  }

  if (typeof candidate === "string") {
    const normalizedCandidate = candidate.trim().toLowerCase();

    if (!normalizedCandidate) {
      return false;
    }

    return ![
      "0",
      "false",
      "no",
      "off",
      "unchecked",
      "unselected",
      "disabled",
      "inactive",
      "null",
    ].includes(normalizedCandidate);
  }

  return Boolean(candidate);
}

function getInitialSelectionValue(
  field: OptionsFieldConfig,
  options: SelectOption[],
): string | string[] {
  const selectedValues = options
    .filter((option) => option.selected)
    .map((option) => option.value);

  if (
    field.type === "checkbox-group" ||
    field.type === "tags" ||
    (field.type === "select" && field.multiple)
  ) {
    return selectedValues;
  }

  return selectedValues[0] || "";
}

function mergeOptions(
  primaryOptions: SelectOption[],
  extraOptions: SelectOption[],
): SelectOption[] {
  if (extraOptions.length === 0) {
    return primaryOptions;
  }

  const merged = [...primaryOptions];

  extraOptions.forEach((option) => {
    const existingIndex = merged.findIndex(
      (currentOption) => currentOption.value === option.value,
    );

    if (existingIndex === -1) {
      merged.push(option);
      return;
    }

    merged[existingIndex] = {
      ...merged[existingIndex],
      ...option,
    };
  });

  return merged;
}

interface UseOptionsDataResult {
  options: SelectOption[];
  isLoading: boolean;
  error: string | null;
  hasSelectionMetadata: boolean;
  initialSelectionValue?: string | string[];
  refetch: () => void;
  search: (query: string) => void;
}

export function useOptionsData(
  field: OptionsFieldConfig,
  runtime?: RuntimeFieldState,
): UseOptionsDataResult {
  const { emitFormEvent, formId, values, wpContext } = useFormRuntime();
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSelectionMetadata, setHasSelectionMetadata] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const staticOptions = runtime?.options ?? field.options ?? [];
  const manualOptions =
    field.type === "checkbox-group" && Array.isArray(field.manualOptions)
      ? field.manualOptions
      : [];
  const optionsSource = runtime?.optionsSource ?? field.optionsSource;
  const apiEndpoint = runtime?.apiEndpoint ?? field.apiEndpoint;
  const apiMethod = runtime?.apiMethod ?? field.apiMethod;
  const apiHeaders = runtime?.apiHeaders ?? field.apiHeaders;
  const apiParams = runtime?.apiParams ?? field.apiParams;
  const apiResponsePath = runtime?.apiResponsePath ?? field.apiResponsePath;
  const apiLabelPath = runtime?.apiLabelPath ?? field.apiLabelPath;
  const apiValuePath = runtime?.apiValuePath ?? field.apiValuePath;
  const apiSelectedPath = runtime?.apiSelectedPath ?? field.apiSelectedPath;
  const apiSelectedValue = runtime?.apiSelectedValue ?? field.apiSelectedValue;
  const autocompleteMinChars =
    runtime?.autocompleteMinChars ?? field.autocompleteMinChars;
  const autocompleteDebounce =
    runtime?.autocompleteDebounce ?? field.autocompleteDebounce;
  const searchParam = runtime?.searchParam ?? field.searchParam;
  const hasUnresolvedApiEndpointTokens = useMemo(
    () =>
      apiEndpoint
        ? hasUnresolvedRuntimeContextTokens(apiEndpoint, wpContext, values)
        : false,
    [apiEndpoint, values, wpContext],
  );
  const resolvedApiEndpoint = useMemo(
    () =>
      apiEndpoint && !hasUnresolvedApiEndpointTokens
        ? resolveRuntimeContextUrlString(apiEndpoint, wpContext, values).trim()
        : "",
    [apiEndpoint, values, wpContext, hasUnresolvedApiEndpointTokens],
  );
  const resolvedApiHeaders = useMemo(
    () => resolveRuntimeJsonConfig(apiHeaders, values, wpContext),
    [apiHeaders, values, wpContext],
  );
  const resolvedApiParams = useMemo(
    () => resolveRuntimeJsonConfig(apiParams, values, wpContext),
    [apiParams, values, wpContext],
  );

  const fetchOptions = useCallback(
    async (query?: string) => {
      if (!apiEndpoint?.trim()) {
        setError("API endpoint not configured");
        setOptions([]);
        setHasSelectionMetadata(false);
        return;
      }

      if (hasUnresolvedApiEndpointTokens || !resolvedApiEndpoint) {
        setError(null);
        setOptions([]);
        setHasSelectionMetadata(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let fullUrl: string;
        let requestUrl = "";

        if (
          resolvedApiEndpoint.startsWith("http://") ||
          resolvedApiEndpoint.startsWith("https://")
        ) {
          fullUrl = resolvedApiEndpoint;
        } else if (resolvedApiEndpoint.startsWith("/")) {
          fullUrl = `${window.location.origin}${resolvedApiEndpoint}`;
        } else {
          const pluginUrl = getFlowPlugin()?.baseUrl || "";
          fullUrl = `${pluginUrl}blocks/${resolvedApiEndpoint}`;
        }

        const url = new URL(fullUrl);

        if (query && searchParam) {
          url.searchParams.set(searchParam, query);
        }

        if (resolvedApiHeaders.error || resolvedApiParams.error) {
          throw createOptionsRequestError(
            "configuration",
            resolvedApiHeaders.error ||
              resolvedApiParams.error ||
              "Invalid API request configuration",
          );
        }

        const headers = JSON.parse(resolvedApiHeaders.json) as Record<
          string,
          unknown
        >;
        const params = JSON.parse(resolvedApiParams.json) as Record<
          string,
          unknown
        >;

        if (apiMethod === "GET" || !apiMethod) {
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
          });
        }

        requestUrl = url.toString();

        const response = await fetch(requestUrl, {
          method: apiMethod || "GET",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: apiMethod === "POST" ? JSON.stringify(params) : undefined,
        });

        if (!response.ok) {
          const responseText = await response.text();

          throw createOptionsRequestError(
            "http",
            extractUserFacingOptionsErrorMessage(responseText),
            {
              status: response.status,
              statusText: response.statusText,
              responseText,
            },
          );
        }

        let data: unknown;

        try {
          data = await response.json();
        } catch (error) {
          throw createOptionsRequestError(
            "invalid-response",
            error instanceof Error
              ? error.message
              : "API response is not valid JSON",
            {
              status: response.status,
              statusText: response.statusText,
            },
          );
        }

        const optionsData = apiResponsePath
          ? readPathValue(data, apiResponsePath)
          : data;

        if (!Array.isArray(optionsData)) {
          throw createOptionsRequestError(
            "invalid-response",
            "API response is not an array",
            {
              status: response.status,
              statusText: response.statusText,
            },
          );
        }

        let sawSelectionMetadata = false;

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
            const rawSelectedValue = apiSelectedPath
              ? readPathValue(item, apiSelectedPath)
              : getImplicitSelectedValue(item);

            const label = toOptionString(labelValue);
            const value = toOptionString(rawValue);

            if (!label && !value) {
              return null;
            }

            if (rawSelectedValue !== undefined) {
              sawSelectionMetadata = true;
            }

            const selected =
              rawSelectedValue !== undefined
                ? matchesSelectedValue(rawSelectedValue, apiSelectedValue)
                : false;

            return {
              label: label || value,
              value: value || label,
              ...(selected ? { selected: true } : {}),
            };
          })
          .filter((item): item is SelectOption => Boolean(item));

        setOptions(mappedOptions);
        setHasSelectionMetadata(sawSelectionMetadata);
      } catch (err) {
        const normalizedError = normalizeOptionsRequestError(err);

        setError(normalizedError.message);
        setOptions([]);
        setHasSelectionMetadata(false);
        emitFormEvent("smartcloud-flow:options-request-error", {
          formId,
          fieldName: field.name,
          fieldType: field.type,
          optionsSource,
          endpointPath: apiEndpoint,
          resolvedEndpointPath: resolvedApiEndpoint,
          requestMethod: apiMethod || "GET",
          query,
          searchParam: query && searchParam ? searchParam : undefined,
          errorType: normalizedError.type,
          message: normalizedError.message,
          status: normalizedError.status,
          statusText: normalizedError.statusText,
          responseText: normalizedError.responseText,
          isClientError:
            typeof normalizedError.status === "number" &&
            normalizedError.status >= 400 &&
            normalizedError.status < 500,
          isServerError:
            typeof normalizedError.status === "number" &&
            normalizedError.status >= 500,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      apiEndpoint,
      apiLabelPath,
      apiMethod,
      apiResponsePath,
      emitFormEvent,
      field.name,
      field.type,
      formId,
      hasUnresolvedApiEndpointTokens,
      apiSelectedPath,
      apiSelectedValue,
      apiValuePath,
      optionsSource,
      resolvedApiEndpoint,
      resolvedApiHeaders.error,
      resolvedApiHeaders.json,
      resolvedApiParams.error,
      resolvedApiParams.json,
      searchParam,
    ],
  );

  useEffect(() => {
    if (optionsSource !== "api") {
      return;
    }

    const timer = setTimeout(() => {
      void fetchOptions();
    }, 0);

    return () => clearTimeout(timer);
  }, [optionsSource, fetchOptions]);

  useEffect(() => {
    if (optionsSource !== "autocomplete") {
      return;
    }

    if (searchQuery.length < (autocompleteMinChars || 2)) {
      const resetTimer = setTimeout(() => {
        setOptions([]);
      }, 0);

      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(() => {
      void fetchOptions(searchQuery);
    }, autocompleteDebounce || 300);

    return () => clearTimeout(timer);
  }, [
    autocompleteDebounce,
    autocompleteMinChars,
    fetchOptions,
    optionsSource,
    searchQuery,
  ]);

  if (!optionsSource || optionsSource === "static") {
    return {
      options: mergeOptions(staticOptions, manualOptions),
      isLoading: false,
      error: null,
      hasSelectionMetadata: false,
      initialSelectionValue: undefined,
      refetch: () => {},
      search: () => {},
    };
  }

  return {
    options: mergeOptions(options, manualOptions),
    isLoading,
    error,
    hasSelectionMetadata,
    initialSelectionValue: hasSelectionMetadata
      ? getInitialSelectionValue(field, mergeOptions(options, manualOptions))
      : undefined,
    refetch: () => fetchOptions(),
    search: setSearchQuery,
  };
}
