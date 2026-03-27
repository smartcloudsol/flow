import YAML from "yaml";
import { parseOptions } from "./field-utils";
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
    ...fieldAttributes
  } = attributes;
  return fieldAttributes;
}

export function encodeData<T>(value: T): string {
  return window.btoa(encodeURIComponent(JSON.stringify(value)));
}

export function decodeData<T>(value: string): T {
  return JSON.parse(decodeURIComponent(window.atob(value))) as T;
}

export function parseFormElement(element: HTMLElement): {
  form: FormAttributes;
  fields: FieldConfig[];
  states: FormStateContents;
} {
  const formEncoded = element.dataset.config;
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
  const configContainers = element.querySelectorAll<HTMLElement>(
    ".smartcloud-flow-form__config",
  );
  const configContainer =
    configContainers[configContainers.length - 1] || element;

  // Parse fields recursively (handle nested containers)
  const fields = parseFieldsRecursive(configContainer);
  const states = parseFormStates(configContainer);

  return {
    form: config,
    fields,
    states,
  };
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

  // Boolean fields
  const booleanFields = ["required", "cacheEnabled"];
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
    "cacheTTL",
    "autocompleteMinChars",
    "autocompleteDebounce",
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
    (mutableField.type === "radio" || mutableField.type === "checkbox-group") &&
    !Array.isArray(mutableField.options) &&
    typeof mutableField.optionsText === "string"
  ) {
    mutableField.options = parseOptions(mutableField.optionsText);
  }

  if (mutableField.type === "radio" || mutableField.type === "checkbox-group") {
    delete mutableField.optionsText;
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
  const directChildren: HTMLElement[] = [];

  // Get only direct children with data-smartcloud-flow-form-field (not nested)
  for (const child of Array.from(container.children)) {
    if (child.hasAttribute("data-smartcloud-flow-form-field")) {
      directChildren.push(child as HTMLElement);
    }
  }

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
      const wizardStepNodes = Array.from(node.children).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          (child.hasAttribute("data-smartcloud-flow-form-field") ||
            child.hasAttribute("data-wizard-step-title") ||
            child.hasAttribute("data-wizard-step-description")),
      );

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
