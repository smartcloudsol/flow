import type { FieldConfig, FormValues } from "../../shared/types";

function hasNamedValueField(
  field: FieldConfig,
): field is Extract<FieldConfig, { name: string }> {
  return "name" in field && typeof field.name === "string" && field.name !== "";
}

function collectNamedFields(
  fields: FieldConfig[],
  acc: Array<{ name: string; label?: string }>,
) {
  for (const field of fields) {
    if (hasNamedValueField(field)) {
      acc.push({
        name: field.name,
        label: "label" in field ? field.label : undefined,
      });
    }
    if (
      "children" in field &&
      Array.isArray((field as { children?: FieldConfig[] }).children)
    ) {
      collectNamedFields((field as { children: FieldConfig[] }).children, acc);
    }
    if (field.type === "wizard") {
      field.steps.forEach((step) => collectNamedFields(step.children, acc));
    }
  }
  return acc;
}

export function stringifyFieldsForPrompt(
  fields: FieldConfig[],
  values: FormValues,
): string {
  return collectNamedFields(fields, [])
    .map(({ name, label }) => {
      const value = values[name];
      const rendered = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value ?? "");
      return `- ${label || name} (${name}): ${rendered}`;
    })
    .join("\n");
}

export function buildAiSuggestionsPrompt(
  template: string,
  fields: FieldConfig[],
  values: FormValues,
): string {
  const fieldsText = stringifyFieldsForPrompt(fields, values);
  return template
    .replace(/{{\s*fields\s*}}/g, fieldsText)
    .replace(/{{\s*values\s*}}/g, JSON.stringify(values, null, 2));
}
