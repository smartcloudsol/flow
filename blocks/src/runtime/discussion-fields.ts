import type { FieldConfig } from "../shared/types";

export function applyHiddenFormField(
  fields: FieldConfig[],
  fieldName: string | undefined,
  hide: boolean,
): FieldConfig[] {
  if (!hide || !fieldName) return fields;
  return fields.map((field) => {
    const record = field as FieldConfig & {
      name?: string;
      children?: FieldConfig[];
      steps?: Array<Record<string, unknown> & { children?: FieldConfig[] }>;
    };
    const next =
      record.name === fieldName
        ? ({ ...record, hidden: true, required: false } as FieldConfig)
        : field;
    const nextRecord = next as typeof record;
    return {
      ...nextRecord,
      ...(Array.isArray(nextRecord.children)
        ? {
            children: applyHiddenFormField(
              nextRecord.children,
              fieldName,
              hide,
            ),
          }
        : {}),
      ...(Array.isArray(nextRecord.steps)
        ? {
            steps: nextRecord.steps.map((step) => ({
              ...step,
              ...(Array.isArray(step.children)
                ? {
                    children: applyHiddenFormField(
                      step.children,
                      fieldName,
                      hide,
                    ),
                  }
                : {}),
            })),
          }
        : {}),
    } as FieldConfig;
  });
}

export function omitReplyRatingValue(
  values: Record<string, unknown>,
  ratingField: string | undefined,
  replying: boolean,
): Record<string, unknown> {
  if (!replying || !ratingField) return values;
  const nextValues = { ...values };
  delete nextValues[ratingField];
  return nextValues;
}
