// Canonical Form Config Extraction
// Converts Gutenberg block attributes to backend-safe form definition

export interface FormSyncBootConfig {
  accountId?: string;
  siteId?: string;
  settings: {
    formsBackendSyncEnabled?: boolean;
    formsAllowPermanentDelete?: boolean;
  };
}

interface FormActionDefinition {
  actionKey?: string;
  label?: string;
  allowedFromStatuses?: string[];
  targetStatus?: string;
  templateKey?: string;
  eventName?: string;
  wpHookName?: string;
  enabled?: boolean;
}

export interface FormBlockAttributes {
  formId?: string;
  formName?: string;
  submitLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  endpointPath?: string;
  allowDrafts?: boolean;
  showDraftResumePanel?: boolean;
  draftExpiryDays?: number;
  draftAllowDelete?: boolean;
  draftResumeTitle?: string;
  draftResumeDescription?: string;
  draftSaveSuccessMessage?: string;
  autoReplyTemplateKey?: string;
  actions?: FormActionDefinition[];
  workflowIds?: string[];
  colorMode?: "light" | "dark" | "auto";
  primaryColor?: string;
  primaryShade?: { light?: number; dark?: number };
  colors?: Record<string, string>;
  themeOverrides?: string;
  configB64?: string;
  configFormat?: string;
  [key: string]: unknown;
}

export interface FieldBlockData {
  type: string;
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  [key: string]: unknown;
}

export interface FormSourceData {
  postId?: number;
  postType?: string;
  postStatus?: string;
  attributes: FormBlockAttributes;
  fields: FieldBlockData[];
  sourceKind: "post" | "pattern" | "reusable_block";
}

export interface CreateFormPayload {
  formId?: string;
  accountId: string;
  siteId: string;
  name: string;
  enabled?: boolean;
  sourceType?: string;
  sourceId?: number;
  sourceStatus?: string;
  renderMode?: string;
  schemaVersion?: number;
  fields?: unknown[];
  settings?: Record<string, unknown>;
  autoReplyTemplateKey?: string;
  actions?: unknown[];
}

export type UpdateFormPayload = Partial<CreateFormPayload>;

function normalizeFieldForBackend(
  field: FieldBlockData,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    type: field.type,
  };

  Object.keys(field).forEach((key) => {
    if (
      ["id", "clientId", "anchor", "className", "children", "steps"].includes(
        key,
      ) ||
      key.startsWith("_")
    ) {
      return;
    }

    const value = field[key];
    if (value !== undefined) {
      normalized[key] = value;
    }
  });

  const children = field.children;
  if (Array.isArray(children)) {
    normalized.children = children.map((child) =>
      normalizeFieldForBackend(child as FieldBlockData),
    );
  }

  const steps = field.steps;
  if (Array.isArray(steps)) {
    normalized.steps = steps.map((step) => {
      const stepRecord = step as Record<string, unknown>;
      const normalizedStep: Record<string, unknown> = {
        children: Array.isArray(stepRecord.children)
          ? (stepRecord.children as FieldBlockData[]).map((child) =>
              normalizeFieldForBackend(child),
            )
          : [],
      };

      if (stepRecord.title !== undefined) {
        normalizedStep.title = stepRecord.title;
      }
      if (stepRecord.description !== undefined) {
        normalizedStep.description = stepRecord.description;
      }
      if (stepRecord.hidden !== undefined) {
        normalizedStep.hidden = stepRecord.hidden;
      }
      if (stepRecord.conditionalLogic !== undefined) {
        normalizedStep.conditionalLogic = stepRecord.conditionalLogic;
      }

      return normalizedStep;
    });
  }

  return normalized;
}

function normalizeActionsForBackend(
  actions: FormActionDefinition[] | undefined,
): FormActionDefinition[] {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.reduce<FormActionDefinition[]>((normalized, action) => {
    const actionKey =
      typeof action?.actionKey === "string" ? action.actionKey.trim() : "";
    const label = typeof action?.label === "string" ? action.label.trim() : "";
    const targetStatus =
      typeof action?.targetStatus === "string"
        ? action.targetStatus.trim()
        : "";
    const templateKey =
      typeof action?.templateKey === "string" ? action.templateKey.trim() : "";
    const eventName =
      typeof action?.eventName === "string" ? action.eventName.trim() : "";
    const wpHookName =
      typeof action?.wpHookName === "string" ? action.wpHookName.trim() : "";
    const allowedFromStatuses = Array.isArray(action?.allowedFromStatuses)
      ? action.allowedFromStatuses
          .map((status) => (typeof status === "string" ? status.trim() : ""))
          .filter(Boolean)
      : [];

    if (!actionKey || !label) {
      return normalized;
    }

    normalized.push({
      actionKey,
      label,
      ...(allowedFromStatuses.length ? { allowedFromStatuses } : {}),
      ...(targetStatus ? { targetStatus } : {}),
      ...(templateKey ? { templateKey } : {}),
      ...(eventName ? { eventName } : {}),
      ...(wpHookName ? { wpHookName } : {}),
      enabled: action?.enabled !== false,
    });

    return normalized;
  }, []);
}

export function extractCanonicalFormConfig(
  source: FormSourceData,
  boot: FormSyncBootConfig,
): CreateFormPayload | UpdateFormPayload {
  const { attributes, fields, postId, postStatus, sourceKind } = source;
  const autoReplyTemplateKey =
    typeof attributes.autoReplyTemplateKey === "string" &&
    attributes.autoReplyTemplateKey.trim()
      ? attributes.autoReplyTemplateKey.trim()
      : "";

  let sourceType = "pattern";
  if (sourceKind === "post") {
    sourceType = "gutenberg";
  } else if (sourceKind === "reusable_block") {
    sourceType = "pattern";
  }

  const name =
    attributes.formName ||
    attributes.formId ||
    (postId ? `Form #${postId}` : "Untitled Form");

  const formId =
    attributes.formId ||
    `form-${postId || Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const normalizedFields = fields.map((field) =>
    normalizeFieldForBackend(field),
  );
  const normalizedActions = normalizeActionsForBackend(attributes.actions);

  const settings: Record<string, unknown> = {};

  if (attributes.successMessage) {
    settings.successMessage = attributes.successMessage;
  }
  if (attributes.errorMessage) {
    settings.errorMessage = attributes.errorMessage;
  }
  if (attributes.submitLabel) {
    settings.submitLabel = attributes.submitLabel;
  }
  if (attributes.colorMode) {
    settings.colorMode = attributes.colorMode;
  }
  if (attributes.primaryColor) {
    settings.primaryColor = attributes.primaryColor;
  }
  if (attributes.themeOverrides) {
    settings.themeOverrides = attributes.themeOverrides;
  }
  if (attributes.allowDrafts !== undefined) {
    settings.allowDrafts = attributes.allowDrafts;
  }
  if (attributes.showDraftResumePanel !== undefined) {
    settings.showDraftResumePanel = attributes.showDraftResumePanel;
  }
  if (attributes.draftExpiryDays !== undefined) {
    settings.draftExpiryDays = attributes.draftExpiryDays;
  }
  if (attributes.draftAllowDelete !== undefined) {
    settings.draftAllowDelete = attributes.draftAllowDelete;
  }
  if (attributes.draftResumeTitle) {
    settings.draftResumeTitle = attributes.draftResumeTitle;
  }
  if (attributes.draftResumeDescription) {
    settings.draftResumeDescription = attributes.draftResumeDescription;
  }
  if (attributes.draftSaveSuccessMessage) {
    settings.draftSaveSuccessMessage = attributes.draftSaveSuccessMessage;
  }
  if (autoReplyTemplateKey) {
    settings.autoReplyTemplateKey = autoReplyTemplateKey;
  }
  if (Array.isArray(attributes.workflowIds)) {
    settings.workflowIds = attributes.workflowIds;
  }

  return {
    formId,
    accountId: boot.accountId || "",
    siteId: boot.siteId || "",
    name,
    enabled: postStatus === "publish",
    sourceType,
    sourceId: postId,
    sourceStatus: postStatus,
    renderMode: "mixed",
    schemaVersion: 1,
    fields: normalizedFields,
    settings,
    autoReplyTemplateKey,
    actions: normalizedActions,
  };
}

export function generateSyncHash(
  canonical: CreateFormPayload | UpdateFormPayload,
): string {
  const sortKeys = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    if (typeof obj !== "object") return obj;

    return Object.keys(obj as object)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = sortKeys((obj as Record<string, unknown>)[key]);
          return acc;
        },
        {} as Record<string, unknown>,
      );
  };

  const sorted = sortKeys(canonical);
  const json = JSON.stringify(sorted);

  let hash = 5381;
  for (let index = 0; index < json.length; index++) {
    hash = (hash << 5) + hash + json.charCodeAt(index);
    hash = hash & hash;
  }

  return (hash >>> 0).toString(36);
}

export function validateCanonicalConfig(
  canonical: CreateFormPayload | UpdateFormPayload,
): string | null {
  if (!canonical.accountId) {
    return "Missing accountId";
  }
  if (!canonical.siteId) {
    return "Missing siteId";
  }
  if (!canonical.name || canonical.name.trim() === "") {
    return "Form name is required";
  }
  if (!canonical.fields || canonical.fields.length === 0) {
    return "Form must have at least one field";
  }

  return null;
}
