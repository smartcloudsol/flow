import YAML from "yaml";
import { parseOptions } from "./field-utils";
import {
  normalizeNumberTuple,
  normalizeSliderMarks,
  normalizeStringArray,
} from "./mantine-prop-utils";
import type {
  FieldConfig,
  FormAttributes,
  FormStateContents,
  SuccessStateTrigger,
} from "./types";

const decodeB64Utf8 = (b64: string): string => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
};

/**
 * Filter out WordPress-specific attributes that should not be serialized to field config
 */
export function filterWordPressAttributes(
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    anchor: _anchor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lock: _lock,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    className: _className,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    style: _style,
    // Some editor extensions inject transient generated class metadata into
    // block attributes. If we serialize that into the payload, later reloads
    // can fail validation when the extension no longer provides the same value.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    epGeneratedClass: _epGeneratedClass,
    ...fieldAttributes
  } = attributes;

  for (const key of Object.keys(fieldAttributes)) {
    if (/generatedclass$/i.test(key) && key !== "className") {
      delete fieldAttributes[key];
    }
  }

  if (fieldAttributes.hidden === false) {
    delete fieldAttributes.hidden;
  }

  if (
    fieldAttributes.conditionalLogic &&
    typeof fieldAttributes.conditionalLogic === "object" &&
    !Array.isArray(fieldAttributes.conditionalLogic)
  ) {
    const conditionalLogic = fieldAttributes.conditionalLogic as Record<
      string,
      unknown
    >;
    const rules = Array.isArray(conditionalLogic.rules)
      ? conditionalLogic.rules
      : [];

    if (conditionalLogic.enabled !== true && rules.length === 0) {
      delete fieldAttributes.conditionalLogic;
    }
  }

  return fieldAttributes;
}

export function encodeData<T>(value: T): string {
  return window.btoa(encodeURIComponent(JSON.stringify(value)));
}

export function decodeData<T>(value: string): T {
  const v = window.atob(value);
  try {
    return JSON.parse(decodeURIComponent(v)) as T;
  } catch {
    return JSON.parse(v) as T;
  }
}

function resolveFormRoot(element: HTMLElement): HTMLElement {
  if (typeof element.dataset.config === "string") {
    return element;
  }

  const closestRoot = element.closest<HTMLElement>(
    ".smartcloud-flow-form[data-config]",
  );
  if (closestRoot) {
    return closestRoot;
  }

  const nestedRoot = element.querySelector<HTMLElement>(
    ".smartcloud-flow-form[data-config]",
  );
  if (nestedRoot) {
    return nestedRoot;
  }

  throw new Error("Missing form config");
}

export function parseFormElement(element: HTMLElement): {
  form: FormAttributes;
  fields: FieldConfig[];
  states: FormStateContents;
} {
  const formRoot = resolveFormRoot(element);
  const formEncoded = formRoot.dataset.config;
  if (!formEncoded) {
    throw new Error("Missing form config");
  }
  let config = decodeData<FormAttributes>(formEncoded);

  // If there's YAML config from shortcode, parse and merge it
  if (config.configB64) {
    try {
      const raw = decodeB64Utf8(config.configB64);
      if ((config.configFormat || "yaml.v1").startsWith("yaml")) {
        const yamlConfig = YAML.parse(raw);
        if (
          yamlConfig &&
          typeof yamlConfig === "object" &&
          !Array.isArray(yamlConfig)
        ) {
          // YAML overrides config attributes
          config = { ...config, ...yamlConfig };
        }
      }
    } catch (e) {
      console.warn("Invalid shortcode YAML config", e);
    }
    // Clean up internal fields
    delete config.configB64;
    delete config.configFormat;
  }

  // Type normalization for form attributes
  config = normalizeFormAttributes(config);

  // Find the config container (where InnerBlocks.Content is rendered)
  const configContainers = formRoot.querySelectorAll<HTMLElement>(
    ".smartcloud-flow-form__config",
  );
  const configContainer =
    configContainers[configContainers.length - 1] || formRoot;

  // Parse fields recursively (handle nested containers)
  const fields = applyFieldOverrides(
    parseFieldsRecursive(configContainer),
    config.fieldOverrides,
  );
  const states = parseFormStates(configContainer);

  delete config.fieldOverrides;

  return {
    form: config,
    fields,
    states,
  };
}

function getScopedFieldNodes(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "[data-smartcloud-flow-form-field]",
    ),
  ).filter((node) => {
    const nearestFieldAncestor = node.parentElement?.closest<HTMLElement>(
      "[data-smartcloud-flow-form-field]",
    );

    return !nearestFieldAncestor || nearestFieldAncestor === container;
  });
}

function parseFormStates(container: HTMLElement): FormStateContents {
  const states: FormStateContents = {
    successStates: {},
  };

  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const stateType = child.dataset.smartcloudFlowFormState;
    if (!stateType) continue;

    if (stateType === "success") {
      const trigger =
        child.dataset.smartcloudFlowFormStateTrigger === "ai-accepted"
          ? "ai-accepted"
          : "submit-success";

      states.successStates![trigger as SuccessStateTrigger] = {
        html: child.innerHTML,
      };

      if (trigger === "submit-success") {
        states.success = { html: child.innerHTML };
      }
    }
  }

  return states;
}

/**
 * Normalize form attributes: convert string values to proper types
 */
function normalizeFormAttributes(config: FormAttributes): FormAttributes {
  // Boolean fields
  const booleanFields: Array<keyof FormAttributes> = [
    "allowDrafts",
    "showDraftResumePanel",
    "draftAllowDelete",
    "hideFormOnSuccess",
  ];
  for (const fieldName of booleanFields) {
    const value = config[fieldName];
    if (value === "true") {
      (config as Record<string, unknown>)[fieldName] = true;
    } else if (value === "false") {
      (config as Record<string, unknown>)[fieldName] = false;
    }
  }

  // Number fields
  if (
    typeof config.draftExpiryDays === "string" &&
    config.draftExpiryDays !== ""
  ) {
    const parsed = parseInt(config.draftExpiryDays, 10);
    if (!isNaN(parsed)) {
      config.draftExpiryDays = parsed;
    }
  }

  // Number fields in primaryShade
  if (config.primaryShade) {
    if (
      typeof config.primaryShade.light === "string" &&
      config.primaryShade.light !== ""
    ) {
      const num = parseInt(config.primaryShade.light, 10);
      if (!isNaN(num)) {
        config.primaryShade.light = num;
      }
    }
    if (
      typeof config.primaryShade.dark === "string" &&
      config.primaryShade.dark !== ""
    ) {
      const num = parseInt(config.primaryShade.dark, 10);
      if (!isNaN(num)) {
        config.primaryShade.dark = num;
      }
    }
  }

  // Remove null/empty values
  for (const key of Object.keys(config)) {
    if (
      config[key as keyof FormAttributes] === null ||
      config[key as keyof FormAttributes] === ""
    ) {
      delete config[key as keyof FormAttributes];
    }
  }

  return config;
}

/**
 * Normalize field attributes: convert string values to proper types
 */
function normalizeFieldAttributes(field: FieldConfig): FieldConfig {
  // Use Record for mutable access to field properties
  // Double cast needed due to FieldConfig being a union type
  const mutableField = field as unknown as Record<string, unknown>;

  delete mutableField.epGeneratedClass;
  for (const key of Object.keys(mutableField)) {
    if (/generatedclass$/i.test(key) && key !== "className") {
      delete mutableField[key];
    }
  }

  // Boolean fields
  const booleanFields = [
    "required",
    "cacheEnabled",
    "hidden",
    "disabled",
    "pointer",
    "autosize",
    "allowDeselect",
    "autoSelectOnBlur",
    "clearable",
    "defaultDropdownOpened",
    "searchable",
    "selectFirstOptionOnChange",
    "withAlignedLabels",
    "withCheckIcon",
    "withScrollArea",
    "autoContrast",
    "withThumbIndicator",
    "allowLeadingZeros",
    "fixedDecimalScale",
    "hideControls",
    "closeOnColorSwatchClick",
    "disallowInput",
    "withPreview",
    "multiple",
    "inverted",
    "labelAlwaysOn",
    "restrictToMarks",
    "pushOnOverlap",
    "acceptValueOnBlur",
    "allowDuplicates",
    "loading",
    "animateOpacity",
    "expanded",
    "preventGrowOverflow",
    "grow",
    "wrap",
    "allowNegative",
    "allowDecimal",
    "withPicker",
    "withEyeDropper",
    "mask",
    "visible",
    "defaultVisible",
  ];
  for (const fieldName of booleanFields) {
    if (fieldName in mutableField) {
      const val = mutableField[fieldName];
      if (val === "true" || val === true) {
        mutableField[fieldName] = true;
      } else if (val === "false" || val === false) {
        mutableField[fieldName] = false;
      } else if (val === "" || val === null || val === undefined) {
        delete mutableField[fieldName];
      }
    }
  }

  // Number fields
  const numberFields = [
    "minLength",
    "maxLength",
    "minRows",
    "maxRows",
    "cacheTTL",
    "autocompleteMinChars",
    "autocompleteDebounce",
    "limit",
    "swatchesPerRow",
    "maxSize",
    "maxFiles",
    "min",
    "max",
    "step",
    "decimalScale",
    "startValue",
    "length",
    "gap",
    "thumbSize",
    "precision",
    "maxRange",
    "minRange",
    "maxDropdownHeight",
    "maxTags",
    "count",
    "fractions",
    "rows",
    "columns",
  ];
  for (const fieldName of numberFields) {
    if (
      fieldName in mutableField &&
      typeof mutableField[fieldName] === "string"
    ) {
      const num = parseInt(mutableField[fieldName] as string, 10);
      if (!isNaN(num)) {
        mutableField[fieldName] = num;
      }
    }
  }

  if (
    (mutableField.type === "radio" ||
      mutableField.type === "checkbox-group" ||
      mutableField.type === "tags") &&
    !Array.isArray(mutableField.options) &&
    typeof mutableField.optionsText === "string"
  ) {
    mutableField.options = parseOptions(mutableField.optionsText);
  }

  if (
    mutableField.type === "radio" ||
    mutableField.type === "checkbox-group" ||
    mutableField.type === "tags"
  ) {
    delete mutableField.optionsText;
  }

  const stringArrayFields = ["allowedDecimalSeparators", "swatches"];
  for (const fieldName of stringArrayFields) {
    if (fieldName in mutableField) {
      const normalized = normalizeStringArray(mutableField[fieldName]);
      if (normalized?.length) {
        mutableField[fieldName] = normalized;
      }
    }
  }

  if ("domain" in mutableField) {
    const normalized = normalizeNumberTuple(mutableField.domain);
    if (normalized) {
      mutableField.domain = normalized;
    }
  }

  if ("marksData" in mutableField && !Array.isArray(mutableField.marks)) {
    const normalizedMarks = normalizeSliderMarks(mutableField.marksData);
    if (normalizedMarks?.length) {
      mutableField.marks = normalizedMarks;
    }
    delete mutableField.marksData;
  }

  if (Array.isArray(mutableField.marks)) {
    const normalizedMarks = normalizeSliderMarks(mutableField.marks);
    if (normalizedMarks?.length) {
      mutableField.marks = normalizedMarks;
    }
  } else if (mutableField.marks === true) {
    const min = Number(mutableField.min);
    const max = Number(mutableField.max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      mutableField.marks = [{ value: min }, { value: max }];
    } else {
      delete mutableField.marks;
    }
  } else if (mutableField.marks === false) {
    delete mutableField.marks;
  }

  // Normalize conditional logic (migrate legacy format, filter empty options, ensure IDs)
  if (
    mutableField.conditionalLogic &&
    typeof mutableField.conditionalLogic === "object"
  ) {
    const logic = {
      ...(mutableField.conditionalLogic as Record<string, unknown>),
    };

    // Remove deprecated logicType field (moved to rule.matchType)
    delete logic.logicType;

    if (Array.isArray(logic.rules)) {
      logic.rules = logic.rules.map((rule) => {
        const mutableRule = { ...(rule as Record<string, unknown>) };
        const thenObj = (mutableRule.then as Record<string, unknown>) || {};
        const params = (thenObj.params as Record<string, unknown>) || {};

        // Filter out null/empty options
        if (Array.isArray(params.options)) {
          params.options = params.options.filter(Boolean);
        }
        thenObj.params = params;
        mutableRule.then = thenObj;

        // Migrate legacy single-condition format to multi-condition format
        if (
          !Array.isArray(mutableRule.conditions) &&
          mutableRule.when &&
          typeof mutableRule.when === "object"
        ) {
          const when = mutableRule.when as Record<string, unknown>;
          mutableRule.conditions = [
            {
              id: `legacy_${String(mutableRule.id || "rule")}`,
              field: String(when.field || ""),
              operator: when.operator,
              value: when.value,
            },
          ];
        }

        // Ensure all conditions have IDs
        if (Array.isArray(mutableRule.conditions)) {
          mutableRule.conditions = mutableRule.conditions.map(
            (condition, index) => {
              const mutableCondition = {
                ...(condition as Record<string, unknown>),
              };
              if (!mutableCondition.id) {
                mutableCondition.id = `cond_${String(
                  mutableRule.id || "rule",
                )}_${index}`;
              }
              return mutableCondition;
            },
          );
        }

        // Remove legacy 'when' field
        delete mutableRule.when;
        return mutableRule;
      });
    }
    mutableField.conditionalLogic = logic;
  }

  // Remove null/empty values
  for (const key of Object.keys(mutableField)) {
    if (mutableField[key] === null || mutableField[key] === "") {
      delete mutableField[key];
    }
  }

  return mutableField as unknown as FieldConfig;
}

function coerceLegacyFieldData(
  fieldData: Record<string, unknown>,
  node: HTMLElement,
): Record<string, unknown> {
  if (
    node.classList.contains("wp-block-smartcloud-flow-pin-field") &&
    (fieldData.type === "number" || fieldData.type === "alphanumeric")
  ) {
    return {
      ...fieldData,
      type: "pin",
      inputType: fieldData.type,
    };
  }

  return fieldData;
}

/**
 * Recursively parse field elements and their nested children
 */
function parseFieldsRecursive(container: HTMLElement): FieldConfig[] {
  const directChildren = getScopedFieldNodes(container);

  return directChildren.map((node) => {
    const decodedFieldData = decodeData<Record<string, unknown>>(
      node.dataset.smartcloudFlowFormField ?? "",
    );
    const fieldData = coerceLegacyFieldData(decodedFieldData, node);

    // Normalize field attributes
    const normalizedField = normalizeFieldAttributes(
      fieldData as unknown as FieldConfig,
    );

    // If this is a container field, recursively parse children
    if (
      normalizedField.type === "stack" ||
      normalizedField.type === "group" ||
      normalizedField.type === "grid" ||
      normalizedField.type === "fieldset" ||
      normalizedField.type === "collapse" ||
      normalizedField.type === "visuallyhidden"
    ) {
      const children = parseFieldsRecursive(node);
      return {
        ...normalizedField,
        children,
      } as FieldConfig;
    }

    if (normalizedField.type === "wizard") {
      const wizardStepNodes = getScopedFieldNodes(node);

      const steps = wizardStepNodes
        .map((stepNode) => {
          const encodedStep = stepNode.dataset.smartcloudFlowFormField;
          const stepData = encodedStep
            ? decodeData<Record<string, unknown>>(encodedStep)
            : {
                type: "wizard-step",
                title: stepNode.dataset.wizardStepTitle,
                description: stepNode.dataset.wizardStepDescription,
                hidden: stepNode.dataset.wizardStepHidden === "true",
              };

          if (stepData.type !== "wizard-step") return null;

          const normalizedStepData = normalizeFieldAttributes(
            stepData as unknown as FieldConfig,
          ) as unknown as Record<string, unknown>;

          return {
            title:
              typeof normalizedStepData.title === "string"
                ? normalizedStepData.title
                : undefined,
            description:
              typeof normalizedStepData.description === "string"
                ? normalizedStepData.description
                : undefined,
            hidden: Boolean(normalizedStepData.hidden),
            conditionalLogic:
              typeof normalizedStepData.conditionalLogic === "object"
                ? normalizedStepData.conditionalLogic
                : undefined,
            children: parseFieldsRecursive(stepNode),
          };
        })
        .filter(Boolean) as Array<{
        title?: string;
        description?: string;
        children: FieldConfig[];
      }>;

      return {
        ...normalizedField,
        steps,
      } as FieldConfig;
    }

    return normalizedField;
  });
}

function getFieldOverride(
  overrides: unknown,
  key: string | undefined,
): Record<string, unknown> | undefined {
  if (!key || !overrides || typeof overrides !== "object") {
    return undefined;
  }

  const candidate = (overrides as Record<string, unknown>)[key];
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? (candidate as Record<string, unknown>)
    : undefined;
}

function applyFieldOverrides(
  fields: FieldConfig[],
  overrides: unknown,
  path: number[] = [],
): FieldConfig[] {
  return fields.map((field, index) => {
    const fieldPath = [...path, index];
    const legacyPathKey = fieldPath.join(".");
    const oneBasedPathKey = fieldPath.map((segment) => segment + 1).join(".");
    const fieldName = (field as { name?: unknown }).name;
    const nameKey = typeof fieldName === "string" ? fieldName : undefined;
    const mergedOverride = {
      ...getFieldOverride(overrides, nameKey),
      ...getFieldOverride(overrides, legacyPathKey),
      ...getFieldOverride(overrides, oneBasedPathKey),
    };

    const nextField = Object.keys(mergedOverride).length
      ? normalizeFieldAttributes({
          ...field,
          ...mergedOverride,
        } as FieldConfig)
      : field;

    if (
      nextField.type === "stack" ||
      nextField.type === "group" ||
      nextField.type === "grid" ||
      nextField.type === "fieldset" ||
      nextField.type === "collapse" ||
      nextField.type === "visuallyhidden"
    ) {
      return {
        ...nextField,
        children: applyFieldOverrides(nextField.children, overrides, fieldPath),
      } as FieldConfig;
    }

    if (nextField.type === "wizard") {
      return {
        ...nextField,
        steps: nextField.steps.map((step, stepIndex) => ({
          ...step,
          children: applyFieldOverrides(step.children, overrides, [
            ...fieldPath,
            stepIndex,
          ]),
        })),
      } as FieldConfig;
    }

    return nextField;
  });
}
