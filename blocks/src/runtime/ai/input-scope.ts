import type {
  FieldConfig,
  FormValues,
  RuntimeFieldState,
} from "../../shared/types";
import { evaluateRule, getRuntimeKey } from "../conditional-engine";

function hasChildren(
  field: FieldConfig,
): field is FieldConfig & { children: FieldConfig[] } {
  return (
    "children" in field &&
    Array.isArray((field as { children?: FieldConfig[] }).children)
  );
}

function hasSteps(
  field: FieldConfig,
): field is Extract<FieldConfig, { type: "wizard" }> {
  return field.type === "wizard";
}

function isWizardStepVisible(
  step: Extract<FieldConfig, { type: "wizard" }>["steps"][number],
  values: FormValues,
) {
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

function isNamedInteractiveField(
  field: FieldConfig,
): field is Extract<FieldConfig, { name: string }> {
  return (
    "name" in field && typeof field.name === "string" && field.name.length > 0
  );
}

function collectAiInputFieldsBeforeTarget(
  fields: FieldConfig[],
  targetRuntimeKey: string,
  values: FormValues,
  fieldStates: Record<string, RuntimeFieldState>,
  acc: Array<Extract<FieldConfig, { name: string }>>,
  path: number[] = [],
): boolean {
  for (const [index, field] of fields.entries()) {
    const currentPath = [...path, index];
    const runtimeKey = getRuntimeKey(field, currentPath);

    if (runtimeKey === targetRuntimeKey) {
      return true;
    }

    if (hasChildren(field)) {
      if (
        collectAiInputFieldsBeforeTarget(
          field.children,
          targetRuntimeKey,
          values,
          fieldStates,
          acc,
          currentPath,
        )
      ) {
        return true;
      }
      continue;
    }

    if (hasSteps(field)) {
      for (const [stepIndex, step] of field.steps.entries()) {
        if (!isWizardStepVisible(step, values)) continue;
        if (
          collectAiInputFieldsBeforeTarget(
            step.children,
            targetRuntimeKey,
            values,
            fieldStates,
            acc,
            [...currentPath, stepIndex],
          )
        ) {
          return true;
        }
      }
      continue;
    }

    if (!isNamedInteractiveField(field)) {
      continue;
    }

    const runtime = fieldStates[runtimeKey];
    if (runtime?.visible === false || runtime?.enabled === false) {
      continue;
    }

    acc.push(field);
  }

  return false;
}

export function getAiSuggestionsInputScope(
  fields: FieldConfig[],
  targetRuntimeKey: string,
  values: FormValues,
  fieldStates: Record<string, RuntimeFieldState>,
) {
  const scopedFields: Array<Extract<FieldConfig, { name: string }>> = [];
  collectAiInputFieldsBeforeTarget(
    fields,
    targetRuntimeKey,
    values,
    fieldStates,
    scopedFields,
  );

  const scopedValues = scopedFields.reduce<FormValues>((acc, field) => {
    if (field.name in values) {
      acc[field.name] = values[field.name];
    }
    return acc;
  }, {});

  return {
    fields: scopedFields,
    values: scopedValues,
  };
}
