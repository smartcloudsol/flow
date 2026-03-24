import { __ } from "@wordpress/i18n";
import { TEXT_DOMAIN } from "@smart-cloud/flow-core";
import type {
  ConditionalCondition,
  ConditionalOperator,
  ConditionalRule,
  FieldConfig,
} from "./types";

export type WatcherFieldKind =
  | "text"
  | "number"
  | "boolean"
  | "choice"
  | "date"
  | "unknown";

export function getWatcherFieldKind(field?: FieldConfig): WatcherFieldKind {
  if (!field) return "unknown";
  switch (field.type) {
    case "checkbox":
    case "switch":
      return "boolean";
    case "number":
    case "slider":
    case "rangeslider":
    case "rating":
      return "number";
    case "select":
    case "radio":
    case "tags":
      return "choice";
    case "date":
      return "date";
    case "text":
    case "textarea":
    case "password":
    case "pin":
    case "color":
    case "file":
      return "text";
    default:
      return "unknown";
  }
}

const operatorMap: Record<WatcherFieldKind | "common", ConditionalOperator[]> = {
  common: ["equals", "notEquals", "isEmpty", "isNotEmpty"],
  text: ["contains", "notContains", "startsWith", "endsWith"],
  number: ["greaterThan", "lessThan", "greaterOrEqual", "lessOrEqual"],
  boolean: ["isChecked", "isNotChecked"],
  choice: ["contains", "notContains", "isAnyOf", "isNoneOf"],
  date: ["greaterThan", "lessThan", "greaterOrEqual", "lessOrEqual"],
  unknown: ["contains", "notContains"],
};

export function getAllowedOperators(field?: FieldConfig): ConditionalOperator[] {
  const kind = getWatcherFieldKind(field);
  return [...operatorMap.common, ...operatorMap[kind]];
}

export function isOperatorAllowed(
  operator: ConditionalOperator,
  field?: FieldConfig,
): boolean {
  return getAllowedOperators(field).includes(operator);
}

export function getOperatorLabel(operator: ConditionalOperator): string {
  const labels: Record<ConditionalOperator, string> = {
    equals: __("equals", TEXT_DOMAIN),
    notEquals: __("does not equal", TEXT_DOMAIN),
    contains: __("contains", TEXT_DOMAIN),
    notContains: __("does not contain", TEXT_DOMAIN),
    startsWith: __("starts with", TEXT_DOMAIN),
    endsWith: __("ends with", TEXT_DOMAIN),
    greaterThan: __("is greater than", TEXT_DOMAIN),
    lessThan: __("is less than", TEXT_DOMAIN),
    greaterOrEqual: __("is greater than or equal to", TEXT_DOMAIN),
    lessOrEqual: __("is less than or equal to", TEXT_DOMAIN),
    isEmpty: __("is empty", TEXT_DOMAIN),
    isNotEmpty: __("is not empty", TEXT_DOMAIN),
    isChecked: __("is checked", TEXT_DOMAIN),
    isNotChecked: __("is not checked", TEXT_DOMAIN),
    isAnyOf: __("is any of", TEXT_DOMAIN),
    isNoneOf: __("is none of", TEXT_DOMAIN),
  };
  return labels[operator];
}

export function getActionLabel(action: ConditionalRule["then"]["action"]): string {
  const labels: Record<ConditionalRule["then"]["action"], string> = {
    show: __("show this field", TEXT_DOMAIN),
    hide: __("hide this field", TEXT_DOMAIN),
    enable: __("enable this field", TEXT_DOMAIN),
    disable: __("disable this field", TEXT_DOMAIN),
    setRequired: __("mark as required", TEXT_DOMAIN),
    setOptional: __("mark as optional", TEXT_DOMAIN),
    updateOptions: __("replace options", TEXT_DOMAIN),
    setValue: __("set value", TEXT_DOMAIN),
    clearValue: __("clear value", TEXT_DOMAIN),
  };
  return labels[action];
}

export function getRuleConditions(rule: ConditionalRule): ConditionalCondition[] {
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

export function summarizeCondition(
  condition: ConditionalCondition,
  watcherLabel?: string,
): string {
  const fieldLabel = watcherLabel || condition.field || __("another field", TEXT_DOMAIN);
  const operator = getOperatorLabel(condition.operator);
  const rawValue = condition.value;
  let valuePart = "";
  if (!["isEmpty", "isNotEmpty", "isChecked", "isNotChecked"].includes(condition.operator)) {
    if (Array.isArray(rawValue)) valuePart = ` ${JSON.stringify(rawValue)}`;
    else if (rawValue !== undefined && rawValue !== null && String(rawValue) !== "") valuePart = ` "${String(rawValue)}"`;
  }
  return `${fieldLabel} ${operator}${valuePart}`;
}

export function summarizeRule(
  rule: ConditionalRule,
  watcherLabels: Record<string, string> = {},
): string {
  const conditions = getRuleConditions(rule);
  const joiner = rule.matchType === "any" ? ` ${__("OR", TEXT_DOMAIN)} ` : ` ${__("AND", TEXT_DOMAIN)} `;
  const conditionSummary = conditions.length
    ? conditions
        .map((condition) =>
          summarizeCondition(condition, watcherLabels[condition.field]),
        )
        .join(joiner)
    : __("No conditions", TEXT_DOMAIN);
  const action = getActionLabel(rule.then.action);
  return `${conditionSummary} → ${action}`;
}

export function detectConditionalIssues(
  targetFieldName: string | undefined,
  rules: ConditionalRule[] | undefined,
): string[] {
  if (!targetFieldName || !rules?.length) return [];
  const issues = new Set<string>();
  for (const rule of rules) {
    const conditions = getRuleConditions(rule);
    if (conditions.some((condition) => condition.field === targetFieldName)) {
      issues.add(__("This rule watches the same field it modifies.", TEXT_DOMAIN));
    }
    const uniqueFields = new Set(conditions.map((condition) => condition.field).filter(Boolean));
    if (uniqueFields.size !== conditions.length) {
      issues.add(__("The same watcher field is used more than once in a single rule.", TEXT_DOMAIN));
    }
  }
  return Array.from(issues);
}
