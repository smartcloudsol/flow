// Canonical Form Config Extraction
// Converts Gutenberg block attributes to backend-safe form definition

import type { CreateFormPayload, UpdateFormPayload } from "./forms-api";
import type { BootConfig } from "./types";

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
  workflowIds?: string[];
  colorMode?: "light" | "dark" | "auto";
  primaryColor?: string;
  primaryShade?: { light?: number; dark?: number };
  colors?: Record<string, string>;
  themeOverrides?: string;
  configB64?: string;
  configFormat?: string;
  // Other transient/UI-only fields...
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
  // ... other field-specific properties
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

/**
 * Extract canonical form configuration for backend sync
 */
export function extractCanonicalFormConfig(
  source: FormSourceData,
  boot: BootConfig,
): CreateFormPayload | UpdateFormPayload {
  const { attributes, fields, postId, postStatus, sourceKind } = source;

  // Determine source type
  let sourceType = "pattern";
  if (sourceKind === "post") {
    sourceType = "gutenberg";
  } else if (sourceKind === "reusable_block") {
    sourceType = "pattern";
  }

  // Extract form name
  const name =
    attributes.formName ||
    attributes.formId ||
    (postId ? `Form #${postId}` : "Untitled Form");

  // Generate formId if not present (backend may require it for create)
  const formId =
    attributes.formId ||
    `form-${postId || Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Normalize fields - strip UI-only properties
  const normalizedFields = fields.map((field) => {
    const normalized: Record<string, unknown> = {
      type: field.type,
      name: field.name,
      label: field.label,
      required: field.required || false,
    };

    // Include field-specific properties
    if (field.description) normalized.description = field.description;
    if (field.placeholder) normalized.placeholder = field.placeholder;
    if (field.options) normalized.options = field.options;

    // Add other relevant non-transient properties
    Object.keys(field).forEach((key) => {
      if (
        !["id", "clientId", "anchor", "className"].includes(key) &&
        !key.startsWith("_") &&
        !(key in normalized)
      ) {
        normalized[key] = field[key];
      }
    });

    return normalized;
  });

  // Normalize settings - exclude UI/editor-only state
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

  // Convert workflowIds to actions array
  const actions: unknown[] = [];
  if (attributes.workflowIds && Array.isArray(attributes.workflowIds)) {
    attributes.workflowIds.forEach((workflowId) => {
      actions.push({
        type: "trigger-workflow",
        workflowId,
        enabled: true,
      });
    });
  }

  // Build canonical payload
  const canonical: CreateFormPayload = {
    formId,
    accountId: boot.accountId || "",
    siteId: boot.siteId || "",
    name,
    enabled: postStatus === "publish",
    sourceType,
    sourceId: postId,
    sourceStatus: postStatus,
    renderMode: "mixed", // supports both shortcode and Elementor
    schemaVersion: 1,
    fields: normalizedFields,
    settings,
    autoReplyTemplateKey: attributes.autoReplyTemplateKey || "",
    actions,
  };

  return canonical;
}

/**
 * Generate deterministic sync hash from canonical config
 * Used to detect changes requiring backend update
 */
export function generateSyncHash(
  canonical: CreateFormPayload | UpdateFormPayload,
): string {
  // Sort keys recursively for deterministic JSON
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

  // Create sorted canonical representation
  const sorted = sortKeys(canonical);
  const json = JSON.stringify(sorted);

  // Simple hash function (DJB2)
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = (hash << 5) + hash + json.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  return (hash >>> 0).toString(36);
}

/**
 * Validate canonical form config
 * Returns error message if invalid, null if valid
 */
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
