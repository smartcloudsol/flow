import type {
  ConditionalCondition,
  ConditionalRule,
  FieldConfig,
  FormValues,
  RuntimeFieldState,
  RuntimeFieldStateMap,
  SelectFieldConfig,
  SelectOption,
} from "../shared/types";

const containerTypes = new Set([
  "stack",
  "group",
  "grid",
  "fieldset",
  "collapse",
  "visuallyhidden",
  "wizard",
]);

const nonInteractiveTypes = new Set(["submit", "divider"]);

function normalizeToArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [value];
}

export function getRuntimeKey(field: FieldConfig, path: number[]): string {
  if ("name" in field && field.name) return field.name;
  return `${field.type}:${path.join(".")}`;
}

function getRuleConditions(rule: ConditionalRule): ConditionalCondition[] {
  if (Array.isArray(rule.conditions) && rule.conditions.length > 0) {
    return rule.conditions;
  }
  if (rule.when?.field) {
    return [
      {
        id: `legacy_${rule.id}`,
        field: rule.when.field,
        operator: rule.when.operator,
        value: rule.when.value,
      },
    ];
  }
  return [];
}

export function evaluateCondition(
  condition: ConditionalCondition,
  values: FormValues,
): boolean {
  const fieldValue = values[condition.field];
  const compareValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return fieldValue === compareValue;
    case "notEquals":
      return fieldValue !== compareValue;
    case "contains":
      return String(fieldValue ?? "").includes(String(compareValue ?? ""));
    case "notContains":
      return !String(fieldValue ?? "").includes(String(compareValue ?? ""));
    case "startsWith":
      return String(fieldValue ?? "").startsWith(String(compareValue ?? ""));
    case "endsWith":
      return String(fieldValue ?? "").endsWith(String(compareValue ?? ""));
    case "greaterThan":
      return Number(fieldValue) > Number(compareValue);
    case "lessThan":
      return Number(fieldValue) < Number(compareValue);
    case "greaterOrEqual":
      return Number(fieldValue) >= Number(compareValue);
    case "lessOrEqual":
      return Number(fieldValue) <= Number(compareValue);
    case "isEmpty":
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "isNotEmpty":
      return !(
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "isChecked":
      return Boolean(fieldValue);
    case "isNotChecked":
      return !fieldValue;
    case "isAnyOf": {
      const compare = normalizeToArray(compareValue);
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((item) => compare.includes(item));
      }
      return compare.includes(fieldValue);
    }
    case "isNoneOf": {
      const compare = normalizeToArray(compareValue);
      if (Array.isArray(fieldValue)) {
        return fieldValue.every((item) => !compare.includes(item));
      }
      return !compare.includes(fieldValue);
    }
    default:
      return false;
  }
}

export function evaluateRule(
  rule: ConditionalRule,
  values: FormValues,
): boolean {
  const conditions = getRuleConditions(rule);
  if (!conditions.length) return false;
  const results = conditions.map((condition) =>
    evaluateCondition(condition, values),
  );
  return rule.matchType === "any"
    ? results.some(Boolean)
    : results.every(Boolean);
}

function getDefaultRuntimeState(field: FieldConfig): RuntimeFieldState {
  const selectLike = field as Partial<SelectFieldConfig>;

  return {
    visible: !field.hidden,
    enabled: !nonInteractiveTypes.has(field.type),
    required: "required" in field ? Boolean(field.required) : undefined,
    options: Array.isArray(selectLike.options) ? selectLike.options : undefined,
    optionsSource: selectLike.optionsSource,
    apiEndpoint: selectLike.apiEndpoint,
    apiMethod: selectLike.apiMethod,
    apiHeaders: selectLike.apiHeaders,
    apiParams: selectLike.apiParams,
    apiResponsePath: selectLike.apiResponsePath,
    cacheEnabled: selectLike.cacheEnabled,
    cacheTTL: selectLike.cacheTTL,
    autocompleteMinChars: selectLike.autocompleteMinChars,
    autocompleteDebounce: selectLike.autocompleteDebounce,
    searchParam: selectLike.searchParam,
  };
}

function hasChildren(
  field: FieldConfig,
): field is FieldConfig & { children: FieldConfig[] } {
  return (
    containerTypes.has(field.type) &&
    field.type !== "wizard" &&
    Array.isArray((field as { children?: unknown }).children)
  );
}

function hasSteps(field: FieldConfig): field is FieldConfig & {
  type: "wizard";
  steps: Array<{ children: FieldConfig[] }>;
} {
  return (
    field.type === "wizard" &&
    Array.isArray((field as { steps?: unknown }).steps)
  );
}

function visitFields(
  fields: FieldConfig[],
  visitor: (field: FieldConfig, key: string, path: number[]) => void,
  path: number[] = [],
) {
  fields.forEach((field, index) => {
    const currentPath = [...path, index];
    visitor(field, getRuntimeKey(field, currentPath), currentPath);
    if (hasChildren(field)) {
      visitFields(field.children, visitor, currentPath);
    } else if (hasSteps(field)) {
      field.steps.forEach((step, stepIndex) => {
        visitFields(step.children, visitor, [...currentPath, stepIndex]);
      });
    }
  });
}

export function buildRuntimeFieldStates(
  fields: FieldConfig[],
  values: FormValues,
): RuntimeFieldStateMap {
  const states: RuntimeFieldStateMap = {};

  visitFields(fields, (field, key) => {
    states[key] = getDefaultRuntimeState(field);
  });

  visitFields(fields, (field, key) => {
    const logic =
      "conditionalLogic" in field ? field.conditionalLogic : undefined;
    if (!logic?.enabled || !logic.rules?.length) return;

    for (const rule of logic.rules) {
      const matched = evaluateRule(rule, values);
      if (!matched) continue;

      const current = states[key];
      switch (rule.then.action) {
        case "show":
          current.visible = true;
          break;
        case "hide":
          current.visible = false;
          break;
        case "enable":
          current.enabled = true;
          break;
        case "disable":
          current.enabled = false;
          break;
        case "setRequired":
          current.required = true;
          break;
        case "setOptional":
          current.required = false;
          break;
        case "updateOptions":
          current.options = rule.then.params?.options as
            | SelectOption[]
            | undefined;
          current.optionsSource = rule.then.params?.optionsSource;
          current.apiEndpoint = rule.then.params?.apiEndpoint;
          current.apiMethod = rule.then.params?.apiMethod;
          current.apiHeaders = rule.then.params?.apiHeaders;
          current.apiParams = rule.then.params?.apiParams;
          current.apiResponsePath = rule.then.params?.apiResponsePath;
          current.cacheEnabled = rule.then.params?.cacheEnabled;
          current.cacheTTL = rule.then.params?.cacheTTL;
          current.autocompleteMinChars = rule.then.params?.autocompleteMinChars;
          current.autocompleteDebounce = rule.then.params?.autocompleteDebounce;
          current.searchParam = rule.then.params?.searchParam;
          break;
        case "setValue":
          current.setValue = rule.then.params?.value;
          current.clearValue = false;
          break;
        case "clearValue":
          current.clearValue = true;
          current.setValue = undefined;
          break;
      }
    }
  });

  return states;
}

export function applyValueActions(
  fields: FieldConfig[],
  values: FormValues,
): FormValues {
  const nextValues = { ...values };
  visitFields(fields, (field) => {
    const logic =
      "conditionalLogic" in field ? field.conditionalLogic : undefined;
    if (!logic?.enabled || !logic.rules?.length) return;
    logic.rules.forEach((rule) => {
      if (!evaluateRule(rule, nextValues)) return;
      if (!("name" in field)) return;
      if (rule.then.action === "setValue") {
        nextValues[field.name] = rule.then.params?.value;
      }
      if (rule.then.action === "clearValue") {
        nextValues[field.name] = Array.isArray(nextValues[field.name])
          ? []
          : "";
      }
    });
  });
  return nextValues;
}

export const CONDITIONAL_CONTAINER_TYPES = containerTypes;
