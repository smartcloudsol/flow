import {
  ActionIcon,
  Alert,
  Button,
  CopyButton,
  DirectionProvider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  dispatchBackend,
  getFlowPlugin,
  getStoreSelect,
  resolveBackend,
  type Store,
} from "@smart-cloud/flow-core";
import {
  getRecaptcha,
  getWpSuite,
  type SiteSettings,
} from "@smart-cloud/wpsuite-core";
import { useSelect } from "@wordpress/data";
import { I18n } from "aws-amplify/utils";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { CheckIcon, CopyIcon } from "../../icons";
import type {
  AiSuggestionsSubmissionMetadata,
  FieldConfig,
  FileFieldConfig,
  FormAttributes,
  FormDraftLoadResponse,
  FormDraftResponse,
  FormStateContents,
  FormSubmitResponse,
  SuccessStateTrigger,
} from "../../shared/types";
import { dispatchAiSuggestionsPrompt } from "../ai/dispatchBackend";
import { buildAiSuggestionsPrompt } from "../ai/prompt-builder";
import { parseAiSuggestionsResponse } from "../ai/response-parser";
import { getFrontendApiBaseUrl } from "../api/config";
import {
  applyValueActions,
  buildRuntimeFieldStates,
  CONDITIONAL_CONTAINER_TYPES,
} from "../conditional-engine";
import {
  AI_SUGGESTION_WATCHER_KEYS,
  stripConditionalSystemValues,
} from "../../shared/conditional-system-watchers";
import { FormActionsProvider } from "../context/FormActionsContext";
import { FormAttributesProvider } from "../context/FormAttributesContext";
import { FormStateProvider } from "../context/FormStateContext";
import { formReducer, getInitialValues } from "../reducer";
import { validateField, validateValues } from "../validation";
import { FieldRenderer } from "./field-renderers";

interface SubmissionMetaRuntime {
  submissionId?: string;
  acceptedAt?: string;
  status?: string;
  formId?: string;
  formName?: string;
  responseMessage?: string;
  submissionSource?: "direct" | "draft";
  aiSuggestionId?: string;
  aiSuggestionTitle?: string;
  aiSuggestionDescription?: string;
  aiSuggestionCount?: number;
  aiSuggestionAccepted?: boolean;
  aiSourcesUsed?: boolean;
}

function humanizeSubmissionStatus(status?: string): string | undefined {
  if (!status) return undefined;
  if (status === "accepted") {
    return I18n.get("Submission accepted") || "Submission accepted";
  }
  if (status === "submitted") {
    return I18n.get("Submission submitted") || "Submission submitted";
  }
  if (status === "rejected") {
    return I18n.get("Submission rejected") || "Submission rejected";
  }
  return status;
}

function humanizeResponseMessage(
  submissionMeta?: SubmissionMetaRuntime | null,
): string | undefined {
  if (!submissionMeta) return undefined;
  if (submissionMeta.responseMessage) return submissionMeta.responseMessage;
  return humanizeSubmissionStatus(submissionMeta.status);
}

function buildAiSuggestionsSubmissionMetadata(aiSuggestions: {
  status: "idle" | "loading" | "done" | "accepted" | "rejected";
  suggestions: AiSuggestionsSubmissionMetadata["suggestions"];
  selectedSuggestionId?: string;
  rawText?: string;
  citations?: unknown;
  metadata?: Record<string, unknown>;
}): AiSuggestionsSubmissionMetadata {
  return {
    ran: aiSuggestions.status !== "idle",
    suggestionCount: aiSuggestions.suggestions?.length ?? 0,
    accepted: aiSuggestions.status === "accepted",
    selectedSuggestionId: aiSuggestions.selectedSuggestionId,
    sourcesUsed: Boolean(aiSuggestions.citations),
    status: aiSuggestions.status,
    suggestions: aiSuggestions.suggestions,
    rawText: aiSuggestions.rawText,
    citations: aiSuggestions.citations,
    metadata: aiSuggestions.metadata,
  };
}

function formatSubmissionMetaValue(
  field: string,
  submissionMeta?: SubmissionMetaRuntime | null,
  dateFormat: "localized" | "iso" = "localized",
): string | undefined {
  if (!submissionMeta) return undefined;
  if (field === "submissionId") return submissionMeta.submissionId;
  if (field === "acceptedAt") {
    if (!submissionMeta.acceptedAt) return undefined;
    if (dateFormat === "iso") return submissionMeta.acceptedAt;

    const parsedDate = new Date(submissionMeta.acceptedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return submissionMeta.acceptedAt;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate);
  }
  if (field === "status")
    return humanizeSubmissionStatus(submissionMeta.status);
  if (field === "formId") return submissionMeta.formId;
  if (field === "formName") return submissionMeta.formName;
  if (field === "responseMessage")
    return humanizeResponseMessage(submissionMeta);
  if (field === "submissionSource") {
    if (submissionMeta.submissionSource === "draft") {
      return I18n.get("Saved draft") || "Saved draft";
    }
    if (submissionMeta.submissionSource === "direct") {
      return I18n.get("Direct submission") || "Direct submission";
    }
  }
  if (field === "aiSuggestionId") return submissionMeta.aiSuggestionId;
  if (field === "aiSuggestionTitle") return submissionMeta.aiSuggestionTitle;
  if (field === "aiSuggestionDescription") {
    return submissionMeta.aiSuggestionDescription;
  }
  if (field === "aiSuggestionCount") {
    return typeof submissionMeta.aiSuggestionCount === "number"
      ? String(submissionMeta.aiSuggestionCount)
      : undefined;
  }
  if (field === "aiSuggestionAccepted") {
    if (submissionMeta.aiSuggestionAccepted === true) {
      return I18n.get("Accepted") || "Accepted";
    }
    if (submissionMeta.aiSuggestionAccepted === false) {
      return I18n.get("Not accepted") || "Not accepted";
    }
  }
  if (field === "aiSourcesUsed") {
    if (submissionMeta.aiSourcesUsed === true) {
      return I18n.get("Yes") || "Yes";
    }
    if (submissionMeta.aiSourcesUsed === false) {
      return I18n.get("No") || "No";
    }
  }
  return undefined;
}

function hydrateSuccessStateHtml(
  html: string,
  submissionMeta?: SubmissionMetaRuntime | null,
): string {
  if (!html || !html.includes("data-smartcloud-flow-submission-meta")) {
    return html;
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  const placeholders = container.querySelectorAll<HTMLElement>(
    "[data-smartcloud-flow-submission-meta]",
  );

  placeholders.forEach((node) => {
    const field =
      node.dataset.smartcloudFlowSubmissionMetaField || "submissionId";
    const label = node.dataset.smartcloudFlowSubmissionMetaLabel || "";
    const fallback = node.dataset.smartcloudFlowSubmissionMetaFallback || "";
    const copyable =
      node.dataset.smartcloudFlowSubmissionMetaCopyable === "true";
    const dateFormat =
      node.dataset.smartcloudFlowSubmissionMetaDateFormat === "iso"
        ? "iso"
        : "localized";
    const runtimeValue = formatSubmissionMetaValue(
      field,
      submissionMeta,
      dateFormat,
    );
    const value = runtimeValue || fallback;

    node.replaceChildren();

    if (!value) {
      return;
    }

    node.className = [
      node.className,
      "flow-submission-meta",
      `flow-submission-meta--${field}`,
      copyable && runtimeValue ? "flow-submission-meta--copyable" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const content = document.createElement("span");
    content.className = "flow-submission-meta__content";

    if (label) {
      const labelNode = document.createElement("strong");
      labelNode.className = "flow-submission-meta__label";
      labelNode.textContent = `${label}: `;
      content.appendChild(labelNode);
    }

    const valueNode = document.createElement("span");
    valueNode.className = "flow-submission-meta__value";
    valueNode.textContent = value;
    content.appendChild(valueNode);

    node.appendChild(content);

    if (copyable && runtimeValue) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "flow-submission-meta__copy";
      button.textContent = I18n.get("Copy") || "Copy";
      button.dataset.flowCopyValue = value;
      button.dataset.flowCopyOriginalText = button.textContent;
      button.setAttribute("aria-label", I18n.get("Copy value") || "Copy value");
      node.appendChild(button);
    }
  });

  return container.innerHTML;
}

interface FrontendUploadUrlResponse {
  uploadId: string;
  bucket: string;
  key: string;
  method?: string;
  url: string;
  headers?: Record<string, string>;
}

interface UploadedFileReference {
  uploadId: string;
  bucket: string;
  key: string;
  fileName: string;
  contentType?: string;
  size: number;
}

function isBrowserFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function collectFileFields(fields: FieldConfig[]): FileFieldConfig[] {
  return fields.flatMap((field) => {
    if (field.type === "file") return [field];
    if (
      field.type === "stack" ||
      field.type === "group" ||
      field.type === "grid" ||
      field.type === "fieldset" ||
      field.type === "collapse" ||
      field.type === "visuallyhidden"
    ) {
      return collectFileFields(field.children);
    }
    if (field.type === "wizard") {
      return field.steps.flatMap((step) => collectFileFields(step.children));
    }
    return [];
  });
}

export function FormShell({
  form,
  fields,
  states,
  store,
  rootElement,
  hostElement,
}: {
  form: FormAttributes;
  fields: FieldConfig[];
  states: FormStateContents;
  store: Store;
  rootElement: HTMLDivElement;
  hostElement: HTMLDivElement;
}) {
  const languageInStore = useSelect(
    () => getStoreSelect(store).getLanguage(),
    [store],
  );
  const directionInStore = useSelect(
    () => getStoreSelect(store).getDirection(),
    [store],
  );
  const customTranslations = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
    [store],
  );
  const fieldDefaultValuesFromStore = useSelect(
    () => getStoreSelect(store).getFieldDefaultValues(),
    [store],
  );

  const currentLanguage = useMemo(() => {
    if (customTranslations) {
      I18n.putVocabularies(customTranslations);
    }
    const lang = form.language || languageInStore;
    if (!lang || lang === "system") {
      I18n.setLanguage("");
      return undefined;
    }
    I18n.setLanguage(lang);
    return lang;
  }, [form.language, languageInStore, customTranslations]);

  const currentDirection = useMemo(() => {
    const dir = form.direction || directionInStore;
    if (!dir || dir === "auto") {
      return currentLanguage === "ar" || currentLanguage === "he"
        ? "rtl"
        : "ltr";
    }
    return dir as "ltr" | "rtl";
  }, [form.direction, currentLanguage, directionInStore]);

  const [draftSubmissionId, setDraftSubmissionId] = useState<
    string | undefined
  >();
  const [draftPassword, setDraftPassword] = useState<string | undefined>();
  const [resumeMode, setResumeMode] = useState(
    Boolean(form.allowDrafts && form.showDraftResumePanel),
  );
  const [resumeDraftIdInput, setResumeDraftIdInput] = useState("");
  const [resumePasswordInput, setResumePasswordInput] = useState("");
  const [lastSubmitResponse, setLastSubmitResponse] =
    useState<FormSubmitResponse | null>(null);
  const [lastSubmissionSource, setLastSubmissionSource] = useState<
    "direct" | "draft" | null
  >(null);
  const [lastCompletedAction, setLastCompletedAction] = useState<
    | "submit"
    | "save-draft"
    | "load-draft"
    | "delete-draft"
    | "ai-accepted"
    | null
  >(null);

  const initialValues = useMemo(() => {
    const baseValues = getInitialValues(fields);
    return {
      ...baseValues,
      ...fieldDefaultValuesFromStore,
    };
  }, [fields, fieldDefaultValuesFromStore]);

  const [reducerState, dispatch] = useReducer(formReducer, {
    status: "idle",
    values: initialValues,
    errors: {},
    fields,
    submitCount: 0,
    touched: new Set<string>(),
    fieldStates: {},
    aiSuggestions: { status: "idle", suggestions: [] },
  });

  const conditionalSystemValues = useMemo(
    () => ({
      [AI_SUGGESTION_WATCHER_KEYS.status]: reducerState.aiSuggestions.status,
      [AI_SUGGESTION_WATCHER_KEYS.accepted]:
        reducerState.aiSuggestions.status === "accepted",
      [AI_SUGGESTION_WATCHER_KEYS.rejected]:
        reducerState.aiSuggestions.status === "rejected",
      [AI_SUGGESTION_WATCHER_KEYS.ran]:
        reducerState.aiSuggestions.status !== "idle",
      [AI_SUGGESTION_WATCHER_KEYS.suggestionCount]:
        reducerState.aiSuggestions.suggestions.length,
      [AI_SUGGESTION_WATCHER_KEYS.selectedSuggestionId]:
        reducerState.aiSuggestions.selectedSuggestionId || "",
      [AI_SUGGESTION_WATCHER_KEYS.sourcesUsed]: Boolean(
        reducerState.aiSuggestions.citations,
      ),
    }),
    [
      reducerState.aiSuggestions.citations,
      reducerState.aiSuggestions.selectedSuggestionId,
      reducerState.aiSuggestions.status,
      reducerState.aiSuggestions.suggestions.length,
    ],
  );

  const valuesWithActions = useMemo(
    () =>
      stripConditionalSystemValues(
        applyValueActions(fields, {
          ...reducerState.values,
          ...conditionalSystemValues,
        }),
      ),
    [conditionalSystemValues, fields, reducerState.values],
  );
  const fieldStates = useMemo(
    () =>
      buildRuntimeFieldStates(fields, {
        ...valuesWithActions,
        ...conditionalSystemValues,
      }),
    [conditionalSystemValues, fields, valuesWithActions],
  );
  const state = useMemo(
    () => ({ ...reducerState, values: valuesWithActions, fieldStates }),
    [fieldStates, reducerState, valuesWithActions],
  );

  const frontendApiBaseUrl = getFrontendApiBaseUrl();
  const fileFields = useMemo(() => collectFileFields(fields), [fields]);

  const emitFormEvent = useCallback(
    (name: string, detail: Record<string, unknown>) => {
      hostElement.dispatchEvent(
        new CustomEvent(name, {
          detail,
          bubbles: true,
          composed: true,
        }),
      );
      hostElement.dispatchEvent(
        new CustomEvent("smartcloud-flow:state-change", {
          detail: {
            event: name,
            ...detail,
          },
          bubbles: true,
          composed: true,
        }),
      );
    },
    [hostElement],
  );

  const getRecaptchaHeaders = useCallback(async () => {
    const siteSettings = getWpSuite()?.siteSettings as SiteSettings | undefined;
    if (!siteSettings?.reCaptchaPublicKey) return {} as Record<string, string>;

    const { execute } = await getRecaptcha(
      siteSettings.useRecaptchaEnterprise || false,
    );
    if (typeof execute !== "function") return {} as Record<string, string>;

    try {
      const token = await execute(siteSettings.reCaptchaPublicKey, {
        action: "submit",
      });
      if (!token) return {} as Record<string, string>;
      return { "X-Recaptcha-Token": token };
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  const dispatchFrontendRequest = useCallback(
    async <TResponse,>(path: string, body: unknown): Promise<TResponse> => {
      const backend = await resolveBackend();

      if (backend.available) {
        return (await dispatchBackend(
          {
            backendAvailable: backend.available,
            backendTransport: backend.transport,
            backendApiName: backend.apiName,
            backendBaseUrl: backend.baseUrl,
            reason: "Form submission",
          },
          "frontend",
          path,
          "POST",
          body,
          {},
        )) as TResponse;
      }

      if (!frontendApiBaseUrl) {
        throw new Error(
          backend.reason ||
            I18n.get("No backend configured for form submissions"),
        );
      }

      const recaptchaHeaders = await getRecaptchaHeaders();

      const response = await fetch(`${frontendApiBaseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...recaptchaHeaders,
        },
        body: JSON.stringify(body ?? {}),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      return (await response.json()) as TResponse;
    },
    [frontendApiBaseUrl, getRecaptchaHeaders],
  );

  const prepareSerializableValues = useCallback(
    async (
      rawValues: Record<string, unknown>,
      accountId?: string,
      siteId?: string,
    ) => {
      const formId = form.formId;
      if (!formId) {
        throw new Error(
          I18n.get(
            "Form ID is missing. Please ensure the form is properly synced with the backend.",
          ),
        );
      }

      const nextValues = { ...rawValues };
      for (const fileField of fileFields) {
        const rawValue = nextValues[fileField.name];
        const selectedFiles = isBrowserFile(rawValue)
          ? [rawValue]
          : Array.isArray(rawValue) && rawValue.every(isBrowserFile)
          ? rawValue
          : [];

        if (selectedFiles.length === 0) {
          continue;
        }

        if (!accountId || !siteId) {
          throw new Error(
            I18n.get("accountId and siteId are required for file uploads."),
          );
        }

        const uploadedFiles = await Promise.all(
          selectedFiles.map(async (file) => {
            const upload =
              await dispatchFrontendRequest<FrontendUploadUrlResponse>(
                `/forms/${encodeURIComponent(formId)}/upload-url`,
                {
                  accountId,
                  siteId,
                  fileName: file.name,
                  contentType: file.type || "application/octet-stream",
                },
              );

            const uploadResponse = await fetch(upload.url, {
              method: upload.method || "PUT",
              headers: upload.headers || {
                "Content-Type": file.type || "application/octet-stream",
              },
              body: file,
            });

            if (!uploadResponse.ok) {
              throw new Error(
                I18n.get("File upload failed.") || "File upload failed.",
              );
            }

            const fileReference: UploadedFileReference = {
              uploadId: upload.uploadId,
              bucket: upload.bucket,
              key: upload.key,
              fileName: file.name,
              contentType: file.type || undefined,
              size: file.size,
            };

            return fileReference;
          }),
        );

        nextValues[fileField.name] = fileField.multiple
          ? uploadedFiles
          : uploadedFiles[0] ?? null;
      }

      return nextValues;
    },
    [dispatchFrontendRequest, fileFields, form.formId],
  );

  const aiSuggestionsPreset = useMemo(() => {
    const presets = getFlowPlugin()?.settings?.aiSuggestionsPresets || [];
    return presets.find((item) => item.id === form.aiSuggestionsPresetId);
  }, [form.aiSuggestionsPresetId]);

  useEffect(() => {
    rootElement.setAttribute("dir", currentDirection);
    rootElement.setAttribute(
      "data-flow-view",
      resumeMode ? "draft-resume" : "form",
    );
    rootElement.setAttribute(
      "data-flow-draft-resume-active",
      resumeMode ? "true" : "false",
    );
    if (currentLanguage) {
      rootElement.setAttribute("lang", currentLanguage);
    } else {
      rootElement.removeAttribute("lang");
    }
    return () => {
      rootElement.removeAttribute("data-flow-view");
      rootElement.removeAttribute("data-flow-draft-resume-active");
    };
  }, [rootElement, currentDirection, currentLanguage, resumeMode]);

  const actions = {
    form,
    fields,
    setValue: (name: string, value: unknown) => {
      setLastCompletedAction(null);
      dispatch({ type: "SET_VALUE", name, value });
    },
    setErrors: (errors: Record<string, string | undefined>) => {
      dispatch({ type: "SET_ERRORS", errors });
    },
    validateField: (name: string) => {
      if (state.touched.has(name)) {
        const error = validateField(
          name,
          fields,
          state.values,
          state.fieldStates,
        );
        dispatch({ type: "SET_FIELD_ERROR", name, error });
      }
    },
    reset: () => {
      setLastSubmitResponse(null);
      setLastSubmissionSource(null);
      dispatch({ type: "RESET", values: initialValues });
    },
    saveDraft: async (): Promise<FormDraftResponse | undefined> => {
      if (!form.allowDrafts) return undefined;
      dispatch({ type: "SET_STATUS", status: "saving-draft" });
      try {
        if (!form.formId)
          throw new Error(
            I18n.get(
              "Form ID is missing. Please ensure the form is properly synced with the backend.",
            ),
          );
        let wpSuiteSiteSettings = {} as SiteSettings;
        if (typeof WpSuite !== "undefined")
          wpSuiteSiteSettings = WpSuite.siteSettings;
        const serializedValues = await prepareSerializableValues(
          state.values,
          wpSuiteSiteSettings?.accountId,
          wpSuiteSiteSettings?.siteId,
        );
        const draftRequest = {
          accountId: wpSuiteSiteSettings?.accountId,
          siteId: wpSuiteSiteSettings?.siteId,
          formId: form.formId,
          formName: form.formName,
          submissionId: draftSubmissionId,
          password: draftPassword,
          values: serializedValues,
          metadata: {
            pageUrl: window.location.href,
            pageTitle: document.title,
            userAgent: navigator.userAgent,
            aiSuggestions: buildAiSuggestionsSubmissionMetadata(
              state.aiSuggestions,
            ),
          },
        };
        const response = await dispatchFrontendRequest<FormDraftResponse>(
          `/forms/${encodeURIComponent(form.formId)}/drafts`,
          draftRequest,
        );
        setDraftSubmissionId(response.submissionId);
        if (response.password) setDraftPassword(response.password);
        setLastCompletedAction("save-draft");
        dispatch({
          type: "SET_STATUS",
          status: "success",
          message:
            response.message ||
            form.draftSaveSuccessMessage ||
            I18n.get("Draft saved successfully."),
        });
        emitFormEvent("smartcloud-flow:draft-saved", {
          action: "save-draft",
          formId: form.formId,
          submissionId: response.submissionId,
          status: response.status,
          response,
        });
        return response;
      } catch (error) {
        emitFormEvent("smartcloud-flow:error", {
          action: "save-draft",
          formId: form.formId,
          message:
            error instanceof Error
              ? error.message
              : I18n.get("An error occurred"),
        });
        dispatch({
          type: "SET_STATUS",
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : I18n.get("An error occurred"),
        });
        return undefined;
      }
    },
    loadDraft: async () => {
      if (!form.allowDrafts || !form.formId) return;
      dispatch({ type: "SET_STATUS", status: "loading-draft" });
      try {
        const response = await dispatchFrontendRequest<FormDraftLoadResponse>(
          `/forms/${encodeURIComponent(form.formId)}/drafts/load`,
          { submissionId: resumeDraftIdInput, password: resumePasswordInput },
        );
        setDraftSubmissionId(response.submissionId);
        setDraftPassword(resumePasswordInput);
        setResumeMode(false);
        setLastCompletedAction("load-draft");
        dispatch({
          type: "DRAFT_LOADED",
          values: response.fields,
          message: I18n.get("Draft loaded successfully."),
        });
        emitFormEvent("smartcloud-flow:draft-loaded", {
          action: "load-draft",
          formId: form.formId,
          submissionId: response.submissionId,
          status: response.status,
          response,
        });
      } catch (error) {
        emitFormEvent("smartcloud-flow:error", {
          action: "load-draft",
          formId: form.formId,
          message:
            error instanceof Error
              ? error.message
              : I18n.get("An error occurred"),
        });
        dispatch({
          type: "SET_STATUS",
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : I18n.get("An error occurred"),
        });
      }
    },
    deleteDraft: async () => {
      if (!form.allowDrafts || !form.formId || !form.draftAllowDelete) return;
      dispatch({ type: "SET_STATUS", status: "deleting-draft" });
      try {
        await dispatchFrontendRequest<{ success?: boolean; message?: string }>(
          `/forms/${encodeURIComponent(form.formId)}/drafts/delete`,
          { submissionId: resumeDraftIdInput, password: resumePasswordInput },
        );
        setResumeDraftIdInput("");
        setResumePasswordInput("");
        setLastCompletedAction("delete-draft");
        dispatch({
          type: "SET_STATUS",
          status: "success",
          message: I18n.get("Draft deleted."),
        });
        emitFormEvent("smartcloud-flow:draft-deleted", {
          action: "delete-draft",
          formId: form.formId,
          submissionId: draftSubmissionId,
          status: "deleted",
        });
      } catch (error) {
        emitFormEvent("smartcloud-flow:error", {
          action: "delete-draft",
          formId: form.formId,
          message:
            error instanceof Error
              ? error.message
              : I18n.get("An error occurred"),
        });
        dispatch({
          type: "SET_STATUS",
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : I18n.get("An error occurred"),
        });
      }
    },

    startNewForm: () => {
      setResumeMode(false);
      setLastSubmitResponse(null);
      setLastSubmissionSource(null);
      setLastCompletedAction(null);
      dispatch({ type: "RESET", values: initialValues });
    },
    runAiSuggestions: async (
      field: Extract<FieldConfig, { type: "ai-suggestions" }>,
    ) => {
      const preset =
        (getFlowPlugin()?.settings?.aiSuggestionsPresets || []).find(
          (item) => item.id === (field.presetId || form.aiSuggestionsPresetId),
        ) || aiSuggestionsPreset;
      if (!preset?.template) {
        dispatch({
          type: "AI_SUGGESTIONS_DONE",
          suggestions: [],
          rawText: "AI Suggestions preset is missing or empty.",
        });
        return;
      }
      dispatch({ type: "AI_SUGGESTIONS_LOADING" });
      try {
        const prompt = buildAiSuggestionsPrompt(
          preset.template,
          fields,
          state.values,
        );
        const response = await dispatchAiSuggestionsPrompt({
          text: prompt,
          responseConstraint: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    confidence: { type: "number" },
                  },
                },
              },
            },
          },
          disableKB: !preset.useKnowledgeBase,
          topK: preset.topK,
        });
        const parsed = parseAiSuggestionsResponse(response);
        dispatch({
          type: "AI_SUGGESTIONS_DONE",
          suggestions: parsed.suggestions,
          rawText:
            field.fallbackToRawText === false ? undefined : parsed.rawText,
          citations: parsed.citations,
          metadata: parsed.metadata,
        });
      } catch (error) {
        dispatch({
          type: "AI_SUGGESTIONS_DONE",
          suggestions: [],
          rawText:
            error instanceof Error
              ? error.message
              : "Failed to generate suggestions.",
        });
      }
    },
    acceptAiSuggestion: (suggestionId?: string) => {
      setLastCompletedAction("ai-accepted");
      dispatch({ type: "AI_SUGGESTIONS_ACCEPT", suggestionId });
      emitFormEvent("smartcloud-flow:ai-suggestion-accepted", {
        action: "ai-suggestion-accepted",
        formId: form.formId,
        suggestionId,
      });
    },
    rejectAiSuggestions: () => {
      dispatch({ type: "AI_SUGGESTIONS_REJECT" });
    },
    submit: async () => {
      dispatch({ type: "SET_STATUS", status: "validating" });
      const errors = validateValues(fields, state.values, state.fieldStates);
      if (Object.keys(errors).length > 0) {
        dispatch({ type: "SET_ERRORS", errors });
        return;
      }

      dispatch({ type: "SET_STATUS", status: "submitting" });
      try {
        if (!form.formId) {
          throw new Error(
            I18n.get(
              "Form ID is missing. Please ensure the form is properly synced with the backend.",
            ),
          );
        }

        let wpSuiteSiteSettings = {} as SiteSettings;
        if (typeof WpSuite !== "undefined") {
          wpSuiteSiteSettings = WpSuite.siteSettings;
        }
        const serializedValues = await prepareSerializableValues(
          state.values,
          wpSuiteSiteSettings?.accountId,
          wpSuiteSiteSettings?.siteId,
        );

        const submitRequest = {
          accountId: wpSuiteSiteSettings?.accountId,
          siteId: wpSuiteSiteSettings?.siteId,
          formId: form.formId,
          formName: form.formName,
          values: serializedValues,
          metadata: {
            pageUrl: window.location.href,
            pageTitle: document.title,
            userAgent: navigator.userAgent,
            aiSuggestions: buildAiSuggestionsSubmissionMetadata(
              state.aiSuggestions,
            ),
          },
        };

        const submissionSource =
          draftSubmissionId && draftPassword ? "draft" : "direct";

        let response: FormSubmitResponse;

        if (form.endpointPath) {
          response = await dispatchFrontendRequest<FormSubmitResponse>(
            form.endpointPath,
            submitRequest,
          );
        } else {
          const backend = await resolveBackend();

          if (!backend.available) {
            throw new Error(
              backend.reason ||
                I18n.get("No backend configured for form submissions"),
            );
          }

          response = (await dispatchBackend(
            {
              backendAvailable: backend.available,
              backendTransport: backend.transport,
              backendApiName: backend.apiName,
              backendBaseUrl: backend.baseUrl,
              reason: "Form submission",
            },
            "frontend",
            draftSubmissionId && draftPassword
              ? `/forms/${encodeURIComponent(
                  form.formId,
                )}/drafts/${encodeURIComponent(draftSubmissionId)}/submit`
              : `/forms/${encodeURIComponent(form.formId)}/submit`,
            "POST",
            submitRequest,
            {},
          )) as FormSubmitResponse;
        }

        setDraftPassword(undefined);
        setLastSubmitResponse(response);
        setLastSubmissionSource(submissionSource);
        setLastCompletedAction("submit");
        dispatch({
          type: "SUBMIT_SUCCESS",
          message: response.message ?? form.successMessage,
        });
        emitFormEvent("smartcloud-flow:submit-success", {
          action: "submit",
          formId: form.formId,
          submissionId: response.submissionId,
          status: response.status,
          acceptedAt: response.acceptedAt,
          response,
        });
      } catch (error) {
        emitFormEvent("smartcloud-flow:error", {
          action: "submit",
          formId: form.formId,
          message:
            form.errorMessage ||
            (error instanceof Error
              ? error.message
              : I18n.get("An error occurred")),
        });
        dispatch({
          type: "SET_STATUS",
          status: "error",
          message:
            form.errorMessage ||
            (error instanceof Error
              ? error.message
              : I18n.get("An error occurred")),
        });
      }
    },
  };

  const successStates = states.successStates || {};
  const acceptedAiSuggestion = useMemo(
    () =>
      state.aiSuggestions.suggestions.find(
        (item) => item.id === state.aiSuggestions.selectedSuggestionId,
      ),
    [state.aiSuggestions.selectedSuggestionId, state.aiSuggestions.suggestions],
  );
  const getSuccessStateContent = (trigger: SuccessStateTrigger) =>
    successStates[trigger] ||
    (trigger === "submit-success" ? states.success : undefined);

  const activeStandaloneState =
    lastCompletedAction === "ai-accepted"
      ? getSuccessStateContent("ai-accepted")
      : state.status === "success" && lastCompletedAction === "submit"
      ? getSuccessStateContent("submit-success")
      : undefined;
  const activeStandaloneHtml = useMemo(
    () =>
      hydrateSuccessStateHtml(activeStandaloneState?.html || "", {
        submissionId: lastSubmitResponse?.submissionId,
        acceptedAt: lastSubmitResponse?.acceptedAt,
        status: lastSubmitResponse?.status,
        formId: form.formId,
        formName: form.formName,
        responseMessage: lastSubmitResponse?.message ?? form.successMessage,
        submissionSource: lastSubmissionSource ?? undefined,
        aiSuggestionId: state.aiSuggestions.selectedSuggestionId,
        aiSuggestionTitle: acceptedAiSuggestion?.title,
        aiSuggestionDescription: acceptedAiSuggestion?.description,
        aiSuggestionCount: state.aiSuggestions.suggestions.length,
        aiSuggestionAccepted: state.aiSuggestions.status === "accepted",
        aiSourcesUsed: Boolean(state.aiSuggestions.citations),
      }),
    [
      acceptedAiSuggestion?.description,
      acceptedAiSuggestion?.title,
      activeStandaloneState?.html,
      form.formId,
      form.formName,
      form.successMessage,
      lastSubmissionSource,
      lastSubmitResponse,
      state.aiSuggestions.citations,
      state.aiSuggestions.selectedSuggestionId,
      state.aiSuggestions.status,
      state.aiSuggestions.suggestions.length,
    ],
  );

  const shouldShowSubmittedState =
    state.status === "success" && lastCompletedAction === "submit";
  const shouldShowStandaloneState = Boolean(activeStandaloneState?.html);

  useEffect(() => {
    const handleCopyClick = async (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest<HTMLElement>("[data-flow-copy-value]");
      if (!button) return;

      const value = button.dataset.flowCopyValue;
      if (!value || !navigator.clipboard?.writeText) return;

      event.preventDefault();

      try {
        await navigator.clipboard.writeText(value);
        const originalText =
          button.dataset.flowCopyOriginalText || button.textContent || "Copy";
        button.dataset.flowCopied = "true";
        button.textContent = I18n.get("Copied!") || "Copied!";
        window.setTimeout(() => {
          delete button.dataset.flowCopied;
          button.textContent = originalText;
        }, 1500);
      } catch {
        // Ignore clipboard failures to keep success state non-blocking.
      }
    };

    rootElement.addEventListener("click", handleCopyClick);
    return () => {
      rootElement.removeEventListener("click", handleCopyClick);
    };
  }, [rootElement]);

  return (
    <DirectionProvider initialDirection={currentDirection}>
      <FormAttributesProvider value={form}>
        <FormStateProvider value={state}>
          <FormActionsProvider value={actions}>
            {resumeMode ? (
              <Paper
                withBorder
                radius="lg"
                p="lg"
                data-flow-view="draft-resume"
                data-flow-draft-resume-active="true"
              >
                <Stack>
                  <Text fw={600}>
                    {form.draftResumeTitle || I18n.get("Continue a saved form")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {form.draftResumeDescription ||
                      I18n.get(
                        "Enter your draft ID and password to continue, or start a new form.",
                      )}
                  </Text>
                  {state.message ? (
                    <Alert color={state.status === "success" ? "green" : "red"}>
                      {state.message}
                    </Alert>
                  ) : null}
                  <TextInput
                    label={I18n.get("Draft ID")}
                    value={resumeDraftIdInput}
                    onChange={(event) =>
                      setResumeDraftIdInput(event.currentTarget.value)
                    }
                  />
                  <PasswordInput
                    label={I18n.get("Password")}
                    value={resumePasswordInput}
                    onChange={(event) =>
                      setResumePasswordInput(event.currentTarget.value)
                    }
                  />
                  <Group>
                    <Button
                      onClick={() => void actions.loadDraft()}
                      disabled={!resumeDraftIdInput || !resumePasswordInput}
                      loading={state.status === "loading-draft"}
                    >
                      {I18n.get("Load")}
                    </Button>
                    {form.draftAllowDelete ? (
                      <Button
                        variant="outline"
                        color="red"
                        onClick={() => void actions.deleteDraft()}
                        disabled={!resumeDraftIdInput || !resumePasswordInput}
                        loading={state.status === "deleting-draft"}
                      >
                        {I18n.get("Delete")}
                      </Button>
                    ) : null}
                    <Button variant="subtle" onClick={actions.startNewForm}>
                      {I18n.get("New form")}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            ) : shouldShowStandaloneState ? (
              <div
                data-flow-view="success-state"
                data-flow-draft-resume-active="false"
              >
                <div
                  data-flow-state="success"
                  dangerouslySetInnerHTML={{
                    __html: activeStandaloneHtml,
                  }}
                />
              </div>
            ) : (
              <Paper
                withBorder
                radius="lg"
                p="lg"
                data-flow-view="form"
                data-flow-draft-resume-active="false"
              >
                <Stack>
                  <Text fw={600}>{form.formName}</Text>
                  {state.message && state.status !== "idle" ? (
                    <Alert color={state.status === "success" ? "green" : "red"}>
                      {state.message}
                    </Alert>
                  ) : null}
                  {draftSubmissionId &&
                  draftPassword &&
                  state.status === "success" ? (
                    <Alert color="blue" title={I18n.get("Draft information")}>
                      <Stack gap="xs">
                        <Text size="sm">
                          {I18n.get("Save these details to continue later:")}
                        </Text>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={500} style={{ flex: 1 }}>
                            {I18n.get("Submission ID")}: {draftSubmissionId}
                          </Text>
                          <CopyButton value={draftSubmissionId}>
                            {({ copied, copy }) => (
                              <Tooltip
                                label={
                                  copied ? I18n.get("Copied") : I18n.get("Copy")
                                }
                              >
                                <ActionIcon
                                  color={copied ? "teal" : "gray"}
                                  variant="subtle"
                                  onClick={copy}
                                >
                                  {copied ? (
                                    <CheckIcon width={16} height={16} />
                                  ) : (
                                    <CopyIcon width={16} height={16} />
                                  )}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={500} style={{ flex: 1 }}>
                            {I18n.get("Password")}: {draftPassword}
                          </Text>
                          <CopyButton value={draftPassword}>
                            {({ copied, copy }) => (
                              <Tooltip
                                label={
                                  copied ? I18n.get("Copied") : I18n.get("Copy")
                                }
                              >
                                <ActionIcon
                                  color={copied ? "teal" : "gray"}
                                  variant="subtle"
                                  onClick={copy}
                                >
                                  {copied ? (
                                    <CheckIcon width={16} height={16} />
                                  ) : (
                                    <CopyIcon width={16} height={16} />
                                  )}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        </Group>
                        <CopyButton
                          value={`Submission ID: ${draftSubmissionId}\nPassword: ${draftPassword}`}
                        >
                          {({ copied, copy }) => (
                            <Button
                              size="xs"
                              variant="default"
                              onClick={copy}
                              leftSection={
                                copied ? (
                                  <CheckIcon width={14} height={14} />
                                ) : (
                                  <CopyIcon width={14} height={14} />
                                )
                              }
                            >
                              {copied
                                ? I18n.get("Copied!")
                                : I18n.get("Copy both")}
                            </Button>
                          )}
                        </CopyButton>
                      </Stack>
                    </Alert>
                  ) : null}
                  {!shouldShowSubmittedState &&
                    !(state.status === "success" && form.hideFormOnSuccess) &&
                    fields.map((field, idx) => (
                      <FieldRenderer
                        key={
                          field.type === "submit"
                            ? `submit-${field.label}`
                            : CONDITIONAL_CONTAINER_TYPES.has(field.type) ||
                              field.type === "divider"
                            ? "c" + idx
                            : "name" in field
                            ? field.name
                            : `field-${idx}`
                        }
                        field={field}
                        path={[idx]}
                      />
                    ))}
                </Stack>
              </Paper>
            )}
          </FormActionsProvider>
        </FormStateProvider>
      </FormAttributesProvider>
    </DirectionProvider>
  );
}
