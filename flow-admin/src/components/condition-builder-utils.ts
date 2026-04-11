import type { FormDefinition } from "../api/types";
import { t } from "../operations/i18n";

function getFieldOptions() {
  return [
    { value: "status", label: t("Status") },
    { value: "email", label: t("Email") },
    { value: "formId", label: t("Form ID") },
    { value: "actionKey", label: t("Action Key") },
    { value: "event.source", label: t("Event Source") },
    { value: "event.detailType", label: t("Event Type") },
    { value: "event.result.routing.route", label: t("AI Route") },
    {
      value: "event.result.routing.outcomes",
      label: t("AI Outcomes"),
    },
    { value: "event.result.ticketId", label: t("Ticket ID") },
    { value: "submission.source.pageUrl", label: t("Source Page URL") },
    { value: "primaryLabel", label: t("Primary Label") },
    { value: "summary", label: t("Summary") },
    { value: "tags", label: t("Tags") },
    { value: "createdAt", label: t("Created At") },
    { value: "updatedAt", label: t("Updated At") },
  ];
}

export function getConditionFieldOptions() {
  return getFieldOptions();
}

function getCanonicalFormId(value: string, forms: FormDefinition[]): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const directMatch = forms.find((form) => form.formId === trimmed);
  if (directMatch) {
    return directMatch.formId;
  }

  const labelMatch = forms.find(
    (form) => `${form.name || form.formId} (${form.formId})` === trimmed,
  );
  if (labelMatch) {
    return labelMatch.formId;
  }

  const suffixMatch = trimmed.match(/\(([^()]+)\)\s*$/);
  if (suffixMatch?.[1]) {
    return suffixMatch[1].trim();
  }

  return trimmed;
}

export function normalizeConditionFieldValue(field: string): string {
  const trimmed = field.trim();
  if (!trimmed) {
    return "";
  }

  const directMatch = getFieldOptions().find(
    (option) => option.value === trimmed,
  );
  if (directMatch) {
    return directMatch.value;
  }

  const labelMatch = getFieldOptions().find(
    (option) => `${option.label} (${option.value})` === trimmed,
  );
  if (labelMatch) {
    return labelMatch.value;
  }

  const suffixMatch = trimmed.match(/\(([^()]+)\)\s*$/);
  if (suffixMatch) {
    const candidate = suffixMatch[1]?.trim();
    if (
      candidate &&
      getFieldOptions().some((option) => option.value === candidate)
    ) {
      return candidate;
    }
  }

  return trimmed;
}

export function normalizeConditionStoredValue(
  field: string,
  value: string,
  forms: FormDefinition[] = [],
): string {
  return normalizeConditionFieldValue(field) === "formId"
    ? getCanonicalFormId(value, forms)
    : value;
}
