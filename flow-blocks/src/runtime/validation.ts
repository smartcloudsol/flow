import { I18n } from "aws-amplify/utils";
import { z } from "zod";
import type {
  FieldConfig,
  FormErrors,
  FormValues,
  ValidationRule,
  RuntimeFieldStateMap,
} from "../shared/types";
import { evaluateRule, getRuntimeKey } from "./conditional-engine";

/**
 * Helper function to get translated string with parameter substitution
 */
function t(key: string, params?: Record<string, string | number>): string {
  let translated = I18n.get(key) || key;
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      translated = translated.replace(`{${param}}`, String(value));
    });
  }
  return translated;
}

function buildValidationRules(
  field: FieldConfig,
): ValidationRule | ValidationRule[] | undefined {
  // Use Record for accessing validation-related properties
  const fieldWithValidation = field as unknown as Record<string, unknown>;
  const rules: ValidationRule[] = [];

  // Add validation type rule (from WordPress block attribute)
  if (
    fieldWithValidation.validationType &&
    fieldWithValidation.validationType !== "none"
  ) {
    if (
      fieldWithValidation.validationType === "custom" &&
      fieldWithValidation.validationPattern
    ) {
      rules.push({
        pattern: fieldWithValidation.validationPattern as string,
        message: (fieldWithValidation.validationMessage as string) || undefined,
      });
    } else {
      rules.push(fieldWithValidation.validationType as ValidationRule);
    }
  }

  // Add minLength/maxLength rules (from WordPress block attributes)
  if (
    fieldWithValidation.minLength !== undefined &&
    (fieldWithValidation.minLength as number) > 0
  ) {
    rules.push({ minLength: fieldWithValidation.minLength as number });
  }
  if (
    fieldWithValidation.maxLength !== undefined &&
    (fieldWithValidation.maxLength as number) > 0
  ) {
    rules.push({ maxLength: fieldWithValidation.maxLength as number });
  }

  // Also support direct validation property (programmatic usage)
  if (fieldWithValidation.validation) {
    const validationRules = Array.isArray(fieldWithValidation.validation)
      ? fieldWithValidation.validation
      : [fieldWithValidation.validation];
    rules.push(...(validationRules as ValidationRule[]));
  }

  return rules.length > 0 ? rules : undefined;
}

function applyValidationRules(
  base: z.ZodString,
  rules: ValidationRule | ValidationRule[] | undefined,
  fieldLabel: string,
): z.ZodString {
  if (!rules) {
    return base;
  }

  const ruleArray = Array.isArray(rules) ? rules : [rules];
  let schema = base;

  for (const rule of ruleArray) {
    if (typeof rule === "string") {
      // Predefined validation types
      switch (rule) {
        case "email":
          schema = schema.refine(
            (val) => {
              // Basic email validation regex
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(val);
            },
            {
              message: t("{fieldLabel} must be a valid email address.", {
                fieldLabel,
              }),
            },
          );
          break;
        case "url":
          schema = schema.refine(
            (val) => {
              try {
                new URL(val);
                return true;
              } catch {
                return false;
              }
            },
            {
              message: t("{fieldLabel} must be a valid URL.", { fieldLabel }),
            },
          );
          break;
        case "phone":
          // Simple phone validation - digits, spaces, dashes, parentheses, plus sign
          schema = schema.refine((val) => /^[\d\s\-+()]+$/.test(val), {
            message: t("{fieldLabel} must be a valid phone number.", {
              fieldLabel,
            }),
          });
          break;
        case "numeric":
          schema = schema.refine((val) => /^\d+$/.test(val), {
            message: t("{fieldLabel} must contain only numbers.", {
              fieldLabel,
            }),
          });
          break;
        case "alphanumeric":
          schema = schema.refine((val) => /^[a-zA-Z0-9]+$/.test(val), {
            message: t("{fieldLabel} must contain only letters and numbers.", {
              fieldLabel,
            }),
          });
          break;
      }
    } else if (typeof rule === "object") {
      // Custom validation rules
      if ("pattern" in rule) {
        const pattern = new RegExp(rule.pattern);
        schema = schema.refine((val) => pattern.test(val), {
          message:
            rule.message ||
            t("{fieldLabel} has an invalid format.", { fieldLabel }),
        });
      }
      if ("min" in rule) {
        schema = schema.refine(
          (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= rule.min,
          rule.message ||
            t("{fieldLabel} must be at least {min}.", {
              fieldLabel,
              min: String(rule.min),
            }),
        );
      }
      if ("max" in rule) {
        schema = schema.refine(
          (val) => !isNaN(parseFloat(val)) && parseFloat(val) <= rule.max,
          rule.message ||
            t("{fieldLabel} must be at most {max}.", {
              fieldLabel,
              max: String(rule.max),
            }),
        );
      }
      if ("minLength" in rule) {
        schema = schema.min(
          rule.minLength,
          rule.message ||
            t("{fieldLabel} must be at least {minLength} characters.", {
              fieldLabel,
              minLength: String(rule.minLength),
            }),
        );
      }
      if ("maxLength" in rule) {
        schema = schema.max(
          rule.maxLength,
          rule.message ||
            t("{fieldLabel} must be at most {maxLength} characters.", {
              fieldLabel,
              maxLength: String(rule.maxLength),
            }),
        );
      }
    }
  }

  return schema;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function isBrowserFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isUploadedFileReference(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("fileName" in (value as Record<string, unknown>) ||
        "key" in (value as Record<string, unknown>)),
  );
}

function hasFileSelection(value: unknown): boolean {
  if (isBrowserFile(value) || isUploadedFileReference(value)) return true;
  if (Array.isArray(value)) {
    return value.some(
      (item) => isBrowserFile(item) || isUploadedFileReference(item),
    );
  }
  return false;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isRangeValue(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function validateFieldValue(
  field: FieldConfig,
  value: unknown,
  runtimeState?: RuntimeFieldStateMap[string],
): string | undefined {
  if (!("label" in field)) return undefined;
  const fieldLabel =
    typeof field.label === "string" && field.label.trim().length > 0
      ? field.label
      : I18n.get("Field") || "Field";

  const isRequired = Boolean(
    runtimeState?.required ?? ("required" in field && field.required),
  );

  if (field.type === "checkbox") {
    if (isRequired && value !== true) {
      return t("{fieldLabel} is required.", { fieldLabel });
    }
    return undefined;
  }

  if (field.type === "checkbox-group") {
    if (isRequired && (!Array.isArray(value) || value.length === 0)) {
      return t("{fieldLabel} is required.", { fieldLabel });
    }

    if (value !== undefined && value !== null && !isStringArray(value)) {
      return t("{fieldLabel} must be a list of values.", { fieldLabel });
    }

    return undefined;
  }

  if (field.type === "file") {
    if (isRequired && !hasFileSelection(value)) {
      return t("{fieldLabel} is required.", { fieldLabel });
    }
    return undefined;
  }

  if (isRequired && isEmptyValue(value)) {
    return t("{fieldLabel} is required.", { fieldLabel });
  }

  if (!isRequired && isEmptyValue(value)) {
    return undefined;
  }

  switch (field.type) {
    case "tags":
      if (!isStringArray(value)) {
        return t("{fieldLabel} must be a list of tags.", { fieldLabel });
      }
      return undefined;
    case "slider":
    case "rating":
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return t("{fieldLabel} must be a valid number.", { fieldLabel });
      }
      return undefined;
    case "rangeslider":
      if (!isRangeValue(value)) {
        return t("{fieldLabel} must contain a valid range.", { fieldLabel });
      }
      return undefined;
    case "switch":
      if (typeof value !== "boolean") {
        return t("{fieldLabel} must be true or false.", { fieldLabel });
      }
      return undefined;
    case "text":
    case "textarea": {
      if (typeof value !== "string") {
        return t("{fieldLabel} must be text.", { fieldLabel });
      }
      const validationRules = buildValidationRules(field);
      if (!validationRules) return undefined;
      const parsed = applyValidationRules(
        z.string(),
        validationRules,
        fieldLabel,
      ).safeParse(value);
      return parsed.success ? undefined : parsed.error.issues[0]?.message;
    }
    case "select":
      if (field.multiple) {
        if (!isStringArray(value)) {
          return t("{fieldLabel} must be a list of values.", { fieldLabel });
        }
        return undefined;
      }
      if (typeof value !== "string") {
        return t("{fieldLabel} must be text.", { fieldLabel });
      }
      return undefined;
    case "date":
    case "radio":
    case "password":
    case "pin":
    case "color":
      if (typeof value !== "string") {
        return t("{fieldLabel} must be text.", { fieldLabel });
      }
      return undefined;
    default:
      return undefined;
  }
}

function isWizardStepVisible(
  step: Extract<FieldConfig, { type: "wizard" }>["steps"][number],
  values: FormValues,
): boolean {
  let visible = !step.hidden;
  const logic = step.conditionalLogic;

  if (!logic?.enabled || !logic.rules?.length) {
    return visible;
  }

  for (const rule of logic.rules) {
    if (!evaluateRule(rule, values)) continue;
    if (rule.then.action === "show") visible = true;
    if (rule.then.action === "hide") visible = false;
  }

  return visible;
}

type ValidatableFieldEntry = {
  field: FieldConfig;
  runtimeKey: string;
};

function collectValidatableFields(
  fields: FieldConfig[],
  values: FormValues,
  path: number[] = [],
): ValidatableFieldEntry[] {
  return fields.flatMap((field, index) => {
    const currentPath = [...path, index];

    if (
      field.type === "submit" ||
      field.type === "save-draft" ||
      field.type === "divider" ||
      field.type === "hidden"
    ) {
      return [];
    }

    if (
      field.type === "stack" ||
      field.type === "group" ||
      field.type === "grid" ||
      field.type === "fieldset" ||
      field.type === "collapse" ||
      field.type === "visuallyhidden"
    ) {
      return collectValidatableFields(field.children, values, currentPath);
    }

    if (field.type === "wizard") {
      return field.steps.flatMap((step, stepIndex) =>
        isWizardStepVisible(step, values)
          ? collectValidatableFields(step.children, values, [
              ...currentPath,
              stepIndex,
            ])
          : [],
      );
    }

    return [{ field, runtimeKey: getRuntimeKey(field, currentPath) }];
  });
}

export function validateValues(
  fields: FieldConfig[],
  values: FormValues,
  fieldStates: RuntimeFieldStateMap = {},
  path: number[] = [],
): FormErrors {
  return collectValidatableFields(fields, values, path).reduce<FormErrors>(
    (acc, entry) => {
      const { field, runtimeKey } = entry;
      if (!("name" in field)) return acc;
      const runtimeState = fieldStates[runtimeKey];
      if (runtimeState && (!runtimeState.visible || !runtimeState.enabled)) {
        return acc;
      }

      const error = validateFieldValue(field, values[field.name], runtimeState);
      if (error) {
        acc[field.name] = error;
      }
      return acc;
    },
    {},
  );
}

/**
 * Validate a single field by name
 */
export function validateField(
  fieldName: string,
  fields: FieldConfig[],
  values: FormValues,
  fieldStates: RuntimeFieldStateMap = {},
  runtimeKey?: string,
): string | undefined {
  // Find the field config
  const findField = (
    fieldList: FieldConfig[],
    path: number[] = [],
  ): ValidatableFieldEntry | undefined => {
    for (const [index, field] of fieldList.entries()) {
      const currentPath = [...path, index];
      const currentRuntimeKey = getRuntimeKey(field, currentPath);

      if (
        field.type === "submit" ||
        field.type === "divider" ||
        field.type === "hidden"
      )
        continue;

      if (
        field.type === "stack" ||
        field.type === "group" ||
        field.type === "grid" ||
        field.type === "fieldset" ||
        field.type === "collapse" ||
        field.type === "visuallyhidden"
      ) {
        const found = findField(field.children, currentPath);
        if (found) return found;
      } else if (field.type === "wizard") {
        for (const [stepIndex, step] of field.steps.entries()) {
          const found = findField(step.children, [...currentPath, stepIndex]);
          if (found) return found;
        }
      } else if (
        runtimeKey
          ? currentRuntimeKey === runtimeKey
          : "name" in field && field.name === fieldName
      ) {
        return { field, runtimeKey: currentRuntimeKey };
      }
    }
    return undefined;
  };

  const entry = findField(fields);
  if (!entry) {
    return undefined;
  }

  const { field, runtimeKey: matchedRuntimeKey } = entry;

  // Skip validation for non-input fields
  if (
    field.type === "submit" ||
    field.type === "stack" ||
    field.type === "group" ||
    field.type === "grid" ||
    field.type === "fieldset" ||
    field.type === "collapse" ||
    field.type === "visuallyhidden" ||
    field.type === "divider" ||
    field.type === "hidden"
  ) {
    return undefined;
  }

  // Additional type guard to ensure field has required properties
  if (!("name" in field) || !("label" in field)) {
    return undefined;
  }

  const validatedField = field;
  const runtimeState = fieldStates[matchedRuntimeKey];

  if (runtimeState && (!runtimeState.visible || !runtimeState.enabled)) {
    return undefined;
  }

  return validateFieldValue(validatedField, values[fieldName], runtimeState);
}
