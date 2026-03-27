import type { FieldConfig, FormValues } from "../../shared/types";

const AI_SUGGESTIONS_RESPONSE_INSTRUCTIONS = `
Return only valid JSON.
Use this exact shape:
{
  "suggestions": [
    {
      "id": "short-stable-id",
      "title": "short heading",
      "possibleAnswer": "direct answer or recommended resolution",
      "whyThisMayHelp": "brief explanation grounded in the provided form context",
      "relatedDocumentation": [
        {
          "title": "documentation title",
          "url": "https://example.com/doc"
        }
      ],
      "nextBestAction": "clear next step for the user",
      "confidence": 0.0
    }
  ]
}
Rules:
- Return 1 to 3 suggestions.
- Keep each field concise and actionable.
- Use an empty array for relatedDocumentation when no safe reference exists.
- Never invent, guess, or extrapolate documentation URLs.
- Only include a relatedDocumentation item when you know the exact documentation title or exact URL from the retrieved knowledge base context.
- If the retrieved knowledge base context does not contain a safe documentation reference, relatedDocumentation must be an empty array.
- confidence must be between 0 and 1.
- Do not wrap the JSON in markdown fences or explanatory text.
`.trim();

type AiPromptRuntimeContext = {
  formLanguage?: string;
  currentLanguage?: string;
  language?: string;
};

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

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function getBranchMainDescription(values: FormValues): string {
  const inquiryType = String(values.inquiryType ?? "");

  if (inquiryType === "support") {
    return stringifyValue(values.supportTaskDescription);
  }
  if (inquiryType === "sales") {
    return stringifyValue(values.projectGoals);
  }
  if (inquiryType === "integration") {
    return stringifyValue(values.technicalQuestion);
  }
  if (inquiryType === "partnership") {
    return stringifyValue(values.partnershipMessage);
  }

  return (
    [
      values.supportTaskDescription,
      values.projectGoals,
      values.technicalQuestion,
      values.partnershipMessage,
    ]
      .map((value) => stringifyValue(value))
      .find(Boolean) || ""
  );
}

function getAdditionalDetails(values: FormValues): string {
  const parts = [
    ["errorDetails", values.errorDetails],
    ["apiEndpointName", values.apiEndpointName],
    ["httpStatusCode", values.httpStatusCode],
    ["checkedDocumentation", values.checkedDocumentation],
    ["plannedTimeline", values.plannedTimeline],
    ["preferredCloudEnvironment", values.preferredCloudEnvironment],
    ["affectedUsersSystems", values.affectedUsersSystems],
    ["enterpriseSupportNeeded", values.enterpriseSupportNeeded],
    ["architecturePriorities", values.architecturePriorities],
    ["partnershipTopic", values.partnershipTopic],
  ]
    .map(([label, value]) => {
      const rendered = stringifyValue(value);
      return rendered ? `${label}: ${rendered}` : "";
    })
    .filter(Boolean);

  return parts.join("\n");
}

function buildPromptContext(
  values: FormValues,
  runtimeContext: AiPromptRuntimeContext = {},
): Record<string, string> {
  const context = Object.entries(values).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key] = stringifyValue(value);
      return acc;
    },
    {
      inquiryType: stringifyValue(values.inquiryType),
      role: stringifyValue(values.role),
      company: stringifyValue(values.company ?? values.companyName),
      companyName: stringifyValue(values.companyName),
      product: stringifyValue(values.product ?? values.supportProduct),
      supportProduct: stringifyValue(values.supportProduct),
      environment: stringifyValue(
        values.environment ?? values.supportEnvironment,
      ),
      supportEnvironment: stringifyValue(values.supportEnvironment),
      issueCategory: stringifyValue(values.issueCategory),
      businessImpact: stringifyValue(values.businessImpact),
      useCase: stringifyValue(values.useCase ?? values.primaryUseCase),
      primaryUseCase: stringifyValue(values.primaryUseCase),
      deploymentPreference: stringifyValue(values.deploymentPreference),
      projectStage: stringifyValue(values.projectStage),
      mainDescription: getBranchMainDescription(values),
      additionalDetails: getAdditionalDetails(values),
    },
  );

  const resolvedLanguage =
    runtimeContext.formLanguage ||
    runtimeContext.currentLanguage ||
    runtimeContext.language ||
    "";

  context.language = resolvedLanguage;
  context.formLanguage = resolvedLanguage;
  context.currentLanguage = resolvedLanguage;

  return context;
}

export function stringifyFieldsForPrompt(
  fields: FieldConfig[],
  values: FormValues,
): string {
  return collectNamedFields(fields, [])
    .map(({ name, label }) => {
      const value = values[name];
      const rendered = stringifyValue(value);
      return `- ${label || name} (${name}): ${rendered}`;
    })
    .join("\n");
}

export function buildAiSuggestionsInputSignature(values: FormValues): string {
  return JSON.stringify(
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function buildAiSuggestionsPrompt(
  template: string,
  fields: FieldConfig[],
  values: FormValues,
  runtimeContext: AiPromptRuntimeContext = {},
): string {
  const fieldsText = stringifyFieldsForPrompt(fields, values);
  const context = buildPromptContext(values, runtimeContext);
  const promptBody = template
    .replace(/{{\s*fields\s*}}/g, fieldsText)
    .replace(/{{\s*values\s*}}/g, JSON.stringify(values, null, 2))
    .replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
      return context[key] ?? "";
    });

  const languageInstruction = context.formLanguage
    ? `\nWrite every end-user-facing field in the response in this language/locale: "${context.formLanguage}".`
    : "";

  return `${promptBody.trim()}${languageInstruction}\n\n${AI_SUGGESTIONS_RESPONSE_INSTRUCTIONS}`;
}
