import type { FieldConfig, FormValues } from "../../shared/types";

export const DEFAULT_AI_SUGGESTIONS_PROMPT = `
You are assisting a visitor on the website that contains the current form.

Your job:
Review the submitted form context and suggest the most relevant immediate answer before the request is sent to the team.

Important goals:
- Help the visitor solve the issue immediately when possible.
- Prefer concise, practical, product-grounded answers.
- Do not invent features, documentation links, setup steps, or URLs.
- If the request sounds commercial, partnership-related, or pricing-related, do not try to fully answer it technically. Instead suggest the clearest next step.
- If the request sounds like existing customer support, prioritize troubleshooting-oriented suggestions.
- If the request sounds like documentation or architecture guidance, prioritize grounded technical guidance.
- If the request is too vague, provide the best likely direction and use nextBestAction for what will happen after submission or, only if strictly necessary, one missing detail that would materially change the answer.
- Never tell the visitor to contact the website through this same form, open a support ticket, or reach out to the team as the immediate next step, because they are already submitting the form.
- When escalation is appropriate, explain what will happen after submission. Avoid asking the visitor to revise or expand the form unless a single missing fact is critical to avoid a misleading answer.
- Prefer immediate product-grounded guidance, realistic post-submission expectations, or optional preparation advice over generic escalation wording.

Form context:
{{fields}}

Raw values:
{{values}}

When suggesting documentation:
- only include relatedDocumentation when the knowledge base clearly provides the exact title or exact URL
- otherwise leave relatedDocumentation empty

Good suggestions are:
- specific
- realistic
- short enough to scan quickly
- clearly different from one another when multiple are returned

Bad suggestions are:
- generic sales fluff
- vague escalation answers with no useful direction
- made-up implementation details
- invented documentation links
- telling the visitor to contact the team, submit the form, open a ticket, or reach support when they are already doing that
- recommending escalation as the primary immediate action unless it is genuinely necessary
- asking the visitor to edit, expand, or complete the form on this final review step unless that missing fact is critical
`.trim();

const AI_SUGGESTIONS_RUNTIME_GUARDRAILS = `
Runtime context:
- The visitor is already on the final review step of the form.
- Treat the current form content as effectively final.
- Do not assume the visitor will add more details before submitting.
- nextBestAction should usually tell the visitor one of the following:
  - they can proceed with submission
  - what will likely happen after submission
  - one optional thing they can prepare independently after submission
- Only ask for one missing detail in nextBestAction when that fact is critical to avoid a misleading answer.
- Do not use nextBestAction for generic “include more detail before submitting” advice.
`.trim();

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
- The form is already at a final review stage. Do not tell the visitor to add more form details before submitting unless one missing fact is critical.
- Prefer nextBestAction that confirms they can proceed, explains what happens after submission, or suggests optional preparation outside the form.
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
  template: string | undefined,
  fields: FieldConfig[],
  values: FormValues,
  runtimeContext: AiPromptRuntimeContext = {},
): string {
  const fieldsText = stringifyFieldsForPrompt(fields, values);
  const context = buildPromptContext(values, runtimeContext);
  const promptTemplate = template?.trim() || DEFAULT_AI_SUGGESTIONS_PROMPT;
  const promptBody = promptTemplate
    .replace(/{{\s*fields\s*}}/g, fieldsText)
    .replace(/{{\s*values\s*}}/g, JSON.stringify(values, null, 2))
    .replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
      return context[key] ?? "";
    });

  const languageInstruction = context.formLanguage
    ? `\nWrite every end-user-facing field in the response in this language/locale: "${context.formLanguage}".`
    : "";

  return `${promptBody.trim()}\n\n${AI_SUGGESTIONS_RUNTIME_GUARDRAILS}${languageInstruction}\n\n${AI_SUGGESTIONS_RESPONSE_INSTRUCTIONS}`;
}
