import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  IconBrain,
  IconCloud,
  IconGripVertical,
  IconMail,
  IconPlus,
  IconTrash,
  IconWebhook,
} from "@tabler/icons-react";
import { useState } from "react";
import type { EmailTemplate, WebhookEndpoint } from "../api/types";
import { t } from "../operations/i18n";
import JsonDraftEditor from "./JsonDraftEditor";
import { useOperationsComboboxProps } from "./OperationsPortalContext";

const AI_AGENT_TOOL_OPTIONS = [
  {
    value: "web_grounding",
    label: "Web Grounding",
    description:
      "Allow the model to fetch and ground answers from explicit HTTPS URLs.",
  },
  {
    value: "calculator",
    label: "Calculator",
    description:
      "Allow the model to evaluate small sandboxed JavaScript expressions for calculations or deterministic transformations.",
  },
  {
    value: "script_runner",
    label: "Script Runner",
    description:
      "Allow the model to run short JavaScript snippets for best-effort debugging and tiny examples without imports, filesystem, or network access.",
  },
] as const;

const AI_AGENT_TOOL_SCHEMAS: Record<string, Record<string, unknown>> = {
  web_grounding: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 5,
      },
    },
    required: ["urls"],
    additionalProperties: false,
  },
  calculator: {
    type: "object",
    properties: {
      expression: { type: "string", minLength: 1 },
    },
    required: ["expression"],
    additionalProperties: false,
  },
  script_runner: {
    type: "object",
    properties: {
      language: {
        type: "string",
        enum: ["javascript"],
      },
      code: { type: "string", minLength: 1 },
      goal: { type: "string" },
      input: {
        type: ["object", "array", "string", "number", "boolean", "null"],
      },
    },
    required: ["code"],
    additionalProperties: false,
  },
};

function normalizeAiAgentToolNames(toolNames: string[]): string[] {
  return Array.from(
    new Set(
      toolNames.flatMap((toolName) => {
        switch (toolName.trim()) {
          case "code_interpreter":
            return ["calculator", "script_runner"];
          case "web_grounding":
          case "calculator":
          case "script_runner":
            return [toolName.trim()];
          default:
            return [];
        }
      }),
    ),
  );
}

const AI_AGENT_RESPONSE_CONSTRAINT_TEMPLATES = {
  generic: {
    type: "object",
    properties: {
      result: { type: "string" },
    },
  },
  summarize: {
    type: "object",
    properties: {
      summary: { type: "string" },
      actionItems: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
  classify: {
    type: "object",
    properties: {
      label: { type: "string" },
      confidence: { type: "number" },
      rationale: { type: "string" },
    },
  },
  extract: {
    type: "object",
    properties: {
      extracted: {
        type: "object",
        properties: {},
      },
      missingFields: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
} as const;

const ROUTING_REQUIRED_PROPERTIES = [
  "route",
  "confidence",
  "reason",
  "outcomes",
] as const;

const AI_ROUTING_PRESETS = [
  {
    value: "none",
    label: "No internal routing",
    description: "Free-form AI output without platform routing contract.",
  },
  {
    value: "route-by-category",
    label: "Route by category",
    description:
      "The model returns a stable routing envelope with route, confidence, reason, outcomes, and signals.",
  },
  {
    value: "route-by-outcomes",
    label: "Route by outcomes",
    description:
      "The model focuses on explicit actionable outcomes while still returning the platform routing envelope.",
  },
  {
    value: "draft-reply-only",
    label: "Draft reply only",
    description:
      "The model produces a structured draft reply and no internal routing-specific contract is required.",
  },
] as const;

type AiRoutingPreset = (typeof AI_ROUTING_PRESETS)[number]["value"];

interface RoutingAuthoringConfig {
  routes: string[];
  outcomeTypes: string[];
  signalKeys: string[];
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function getRoutingAuthoringConfig(
  config: Record<string, unknown>,
): RoutingAuthoringConfig {
  return {
    routes: normalizeStringList(config.routingRoutes),
    outcomeTypes: normalizeStringList(config.routingOutcomeTypes),
    signalKeys: normalizeStringList(config.routingSignalKeys),
  };
}

function buildRoutingResponseConstraint(
  preset: AiRoutingPreset,
  authoring: RoutingAuthoringConfig = {
    routes: [],
    outcomeTypes: [],
    signalKeys: [],
  },
) {
  if (preset === "draft-reply-only") {
    return {
      additionalProperties: false,
      type: "object",
      required: ["draftReply"],
      properties: {
        draftReply: {
          type: "object",
          required: ["subject", "body"],
          properties: {
            subject: { type: "string", minLength: 1, maxLength: 200 },
            body: { type: "string", minLength: 1, maxLength: 4000 },
            tone: { type: ["string", "null"] },
          },
        },
      },
    };
  }

  const routeProperty: Record<string, unknown> = {
    type: "string",
    minLength: 1,
    maxLength: 100,
    description: "Primary routing category chosen by the model.",
  };
  if (authoring.routes.length > 0) {
    routeProperty.enum = authoring.routes;
  }

  const outcomeTypeEnum =
    authoring.outcomeTypes.length > 0
      ? authoring.outcomeTypes
      : [
          "invoke_webhook",
          "invoke_workflow",
          "send_email",
          "set_status",
          "emit_event",
          "custom",
        ];

  const signalsProperty: Record<string, unknown> =
    authoring.signalKeys.length > 0
      ? {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(
            authoring.signalKeys.map((key) => [
              key,
              { type: ["string", "number", "boolean", "null"] },
            ]),
          ),
        }
      : {
          type: "object",
          additionalProperties: {
            type: ["string", "number", "boolean", "null"],
          },
        };

  return {
    additionalProperties: false,
    type: "object",
    required: ["routing"],
    properties: {
      routing: {
        type: "object",
        additionalProperties: false,
        required: [...ROUTING_REQUIRED_PROPERTIES],
        properties: {
          route: routeProperty,
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          reason: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
          outcomes: {
            type: "array",
            minItems: 0,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["type", "key"],
              properties: {
                type: {
                  type: "string",
                  enum: outcomeTypeEnum,
                },
                key: { type: "string", minLength: 1, maxLength: 120 },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                reason: { type: ["string", "null"] },
              },
            },
          },
          signals: signalsProperty,
        },
      },
    },
  };
}

function buildRoutingSystemPromptBlock(preset: AiRoutingPreset): string {
  if (preset === "none") return "";
  if (preset === "draft-reply-only") {
    return [
      "[Platform routing contract]",
      "Return a strictly valid JSON object that matches the response schema.",
      "Do not add undocumented properties.",
      "Focus on drafting the reply payload only; do not invent internal routing metadata.",
    ].join("\n");
  }

  return [
    "[Platform routing contract]",
    "Return a strictly valid JSON object that matches the response schema.",
    "Populate routing.route, routing.confidence, routing.reason, and routing.outcomes deterministically from the input event.",
    "Use routing.outcomes for actionable next steps. Each outcome must contain a stable type and key.",
    "Use routing.signals only for auxiliary classification data, not for arbitrary prose.",
    "Do not omit required routing properties and do not add undocumented properties.",
  ].join("\n");
}

function composeAiSystemPrompt(
  platformBlock: string,
  userGuidance: string,
): string {
  const parts = [platformBlock.trim(), userGuidance.trim()].filter(Boolean);
  return parts.join("\n\n");
}

function validateRoutingConstraint(
  schema: unknown,
  preset: AiRoutingPreset,
): string | null {
  if (preset === "none") return null;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return "Response Constraint must be a JSON object schema.";
  }

  const root = schema as Record<string, unknown>;
  const properties = root.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return "Response Constraint must contain a properties object.";
  }

  if (preset === "draft-reply-only") {
    if (!("draftReply" in (properties as Record<string, unknown>))) {
      return "Draft reply preset requires a draftReply property.";
    }
    return null;
  }

  const routing = (properties as Record<string, unknown>).routing;
  if (!routing || typeof routing !== "object" || Array.isArray(routing)) {
    return "Routing preset requires a routing object property.";
  }

  const routingProps = (routing as Record<string, unknown>).properties;
  if (
    !routingProps ||
    typeof routingProps !== "object" ||
    Array.isArray(routingProps)
  ) {
    return "Routing preset requires routing.properties.";
  }

  for (const key of ROUTING_REQUIRED_PROPERTIES) {
    if (!(key in (routingProps as Record<string, unknown>))) {
      return `Routing preset requires routing.${key}.`;
    }
  }

  return null;
}

function parseJsonTemplateDraft(input: string): unknown {
  const normalized = input.replace(/\{\{[\s\S]*?\}\}/g, "0");
  return JSON.parse(normalized);
}

function validateJsonTemplateDraft(
  input: string,
  options?: { requireObject?: boolean },
): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = parseJsonTemplateDraft(trimmed);

    if (
      options?.requireObject &&
      (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    ) {
      return "This field must contain a JSON object.";
    }

    return null;
  } catch {
    return "The JSON is currently invalid. Fix the editor content before saving.";
  }
}

function getDefaultAiAgentText(mode: string): string {
  switch (mode) {
    case "summarize":
      return "Summarize the submission context concisely and highlight the most important points.";
    case "classify":
      return "Classify the submission and explain briefly why that classification fits.";
    case "extract":
      return "Extract the requested structured data from the submission and return only supported values.";
    case "answer":
    default:
      return "Answer the request using the submission context and any available knowledge base evidence.";
  }
}

function getDefaultAiAgentConfig(mode = "answer"): Record<string, unknown> {
  return {
    mode,
    text: getDefaultAiAgentText(mode),
    systemPrompt: "",
    userSystemPrompt: "",
    routingPreset: "none",
    routingRoutes: [],
    routingOutcomeTypes: [],
    routingSignalKeys: [],
    enableReasoning: false,
    reasoningEffort: "low",
  };
}

function getDefaultStepConfig(actionType: string): Record<string, unknown> {
  switch (actionType) {
    case "email.send":
      return {
        templateKey: "",
        recipientEmail: "{{submission.email}}",
      };
    case "webhook.call":
      return {
        webhookKey: "",
        body: "",
      };
    case "ai.agent":
      return getDefaultAiAgentConfig();
    case "eventbridge.event":
      return {
        source: "smartcloud.flow",
        payloadMode: "full-submission",
      };
    default:
      return {};
  }
}

function getAiAgentToolNames(config: Record<string, unknown>): string[] {
  const toolSelection = config.toolSelection;

  if (
    toolSelection &&
    typeof toolSelection === "object" &&
    Array.isArray((toolSelection as { tools?: unknown[] }).tools)
  ) {
    return normalizeAiAgentToolNames(
      ((toolSelection as { tools?: unknown[] }).tools ?? [])
        .map((tool) => {
          if (
            tool &&
            typeof tool === "object" &&
            typeof (tool as { name?: unknown }).name === "string"
          ) {
            return String((tool as { name?: string }).name);
          }
          return "";
        })
        .filter(Boolean),
    );
  }

  if (Array.isArray(config.enabledTools)) {
    return normalizeAiAgentToolNames(
      config.enabledTools
        .filter((tool): tool is string => typeof tool === "string")
        .map((tool) => tool.trim())
        .filter(Boolean),
    );
  }

  return [];
}

function getAiAgentToolChoice(config: Record<string, unknown>): "auto" | "any" {
  const toolSelection = config.toolSelection;
  if (
    toolSelection &&
    typeof toolSelection === "object" &&
    (toolSelection as { toolChoice?: unknown }).toolChoice === "any"
  ) {
    return "any";
  }

  return "auto";
}

function buildAiAgentToolSelection(
  selectedTools: string[],
  toolChoice: "auto" | "any",
) {
  if (selectedTools.length === 0) {
    return undefined;
  }

  return {
    toolChoice,
    tools: selectedTools.map((toolName) => {
      const option = AI_AGENT_TOOL_OPTIONS.find(
        (candidate) => candidate.value === toolName,
      );

      return {
        name: toolName,
        description:
          option?.description ||
          `Tool ${toolName} available for this workflow step.`,
        inputSchema: AI_AGENT_TOOL_SCHEMAS[toolName] || {
          type: "object",
          properties: {},
          additionalProperties: true,
        },
      };
    }),
  };
}

function getResponseConstraintTemplate(mode: string): Record<string, unknown> {
  switch (mode) {
    case "summarize":
      return AI_AGENT_RESPONSE_CONSTRAINT_TEMPLATES.summarize;
    case "classify":
      return AI_AGENT_RESPONSE_CONSTRAINT_TEMPLATES.classify;
    case "extract":
      return AI_AGENT_RESPONSE_CONSTRAINT_TEMPLATES.extract;
    default:
      return AI_AGENT_RESPONSE_CONSTRAINT_TEMPLATES.generic;
  }
}

export interface WorkflowStep {
  actionType: string;
  config: Record<string, unknown>;
}

export interface StepBuilderProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
  templates?: EmailTemplate[];
  webhooks?: WebhookEndpoint[];
}

const ACTION_TYPES = [
  { value: "email.send", label: "Send Email", icon: IconMail },
  { value: "webhook.call", label: "Call Webhook", icon: IconWebhook },
  { value: "eventbridge.event", label: "EventBridge Event", icon: IconCloud },
  { value: "ai.agent", label: "AI Agent", icon: IconBrain },
  { value: "status.update", label: "Update Status", icon: null },
  { value: "delay", label: "Delay/Wait", icon: null },
];

const STATUS_VALUES = [
  "new",
  "seen",
  "in-progress",
  "approved",
  "completed",
  "rejected",
  "deleted",
  "resolved",
];

export default function StepBuilder({
  steps,
  onChange,
  templates = [],
  webhooks = [],
}: StepBuilderProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const comboboxProps = useOperationsComboboxProps(100001);
  const actionTypeOptions = ACTION_TYPES.map((action) => ({
    ...action,
    label: t(action.label),
  }));

  const addStep = () => {
    onChange([
      ...steps,
      {
        actionType: "email.send",
        config: getDefaultStepConfig("email.send"),
      },
    ]);
    setExpandedStep(steps.length);
  };

  const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onChange(newSteps);
  };

  const updateStepConfig = (
    index: number,
    configUpdates: Record<string, unknown>,
  ) => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      config: { ...newSteps[index].config, ...configUpdates },
    };
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
    if (expandedStep === index) {
      setExpandedStep(null);
    }
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [
      newSteps[targetIndex],
      newSteps[index],
    ];
    onChange(newSteps);
    setExpandedStep(targetIndex);
  };

  const getStepIcon = (actionType: string) => {
    const action = ACTION_TYPES.find((a) => a.value === actionType);
    const Icon = action?.icon;
    return Icon ? <Icon size={16} /> : null;
  };

  const getStepLabel = (actionType: string) => {
    return t(
      ACTION_TYPES.find((a) => a.value === actionType)?.label ?? actionType,
    );
  };

  const renderStepConfig = (step: WorkflowStep, index: number) => {
    switch (step.actionType) {
      case "email.send":
        return (
          <Stack gap="sm">
            <Select
              label={t("Email Template")}
              description={t("Select the template to use for this email")}
              placeholder={t("Choose a template")}
              data={templates.map((t) => ({
                value: t.templateKey,
                label: t.name || t.templateKey,
              }))}
              value={String(step.config.templateKey ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { templateKey: value ?? "" })
              }
              searchable
              comboboxProps={comboboxProps}
            />
            <TextInput
              label={t("Recipient Email")}
              description={t("Use {{submission.email}} for submitter's email")}
              placeholder={t("{{submission.email}}")}
              value={String(step.config.recipientEmail ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  recipientEmail: e.currentTarget.value,
                })
              }
            />
            <TextInput
              label={t("CC (optional)")}
              description={t("Comma-separated email addresses")}
              placeholder={t("admin@example.com, manager@example.com")}
              value={String(step.config.cc ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { cc: e.currentTarget.value })
              }
            />
            <TextInput
              label={t("BCC (optional)")}
              placeholder={t("archive@example.com")}
              value={String(step.config.bcc ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { bcc: e.currentTarget.value })
              }
            />
          </Stack>
        );

      case "webhook.call": {
        const webhookBodyDraftError = validateJsonTemplateDraft(
          String(step.config.body ?? ""),
        );

        return (
          <Stack gap="sm">
            <Select
              label={t("Webhook Endpoint")}
              description={t(
                "Choose a saved webhook endpoint. Zapier endpoints are configured in the Webhooks screen.",
              )}
              placeholder={t("Choose webhook endpoint")}
              data={webhooks.map((w) => ({
                value: w.webhookKey,
                label:
                  (w.name || w.webhookKey) +
                  (w.provider === "zapier" ? ` (${t("Zapier")})` : ""),
              }))}
              value={String(step.config.webhookKey ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { webhookKey: value ?? "" })
              }
              searchable
              comboboxProps={comboboxProps}
            />
            <JsonDraftEditor
              label="Request Body Template (optional)"
              description="Leave empty to send the default payload. Use dotted placeholders like {{submission.email}}."
              height={180}
              minHeight={160}
              value={String(step.config.body ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { body: value ?? "" })
              }
              warnings={[webhookBodyDraftError]}
            />
            <Text size="xs" c="dimmed">
              {t(
                "Endpoint URL, method, headers, signing, and provider preset are managed on the webhook endpoint itself.",
              )}
            </Text>
          </Stack>
        );
      }

      case "status.update":
        return (
          <Stack gap="sm">
            <Select
              label={t("New Status")}
              description={t("The status to set on the submission")}
              data={STATUS_VALUES}
              value={String(step.config.status ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { status: value ?? "" })
              }
              comboboxProps={comboboxProps}
            />
            <TextInput
              label={t("Notes (optional)")}
              description={t("Internal notes to add to the submission")}
              placeholder={t("Status updated by workflow")}
              value={String(step.config.notes ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { notes: e.currentTarget.value })
              }
            />
          </Stack>
        );

      case "delay":
        return (
          <Stack gap="sm">
            <TextInput
              label={t("Duration (seconds)")}
              description={t("How long to wait before the next step")}
              type="number"
              placeholder="300"
              value={String(step.config.durationSeconds ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  durationSeconds: Number(e.currentTarget.value),
                })
              }
            />
            <Text size="xs" c="dimmed">
              {t(
                "Note: Delays are useful for rate limiting or waiting for external processes",
              )}
            </Text>
          </Stack>
        );

      case "eventbridge.event": {
        const customPayloadDraftError = validateJsonTemplateDraft(
          String(step.config.customPayload ?? ""),
          { requireObject: true },
        );

        return (
          <Stack gap="sm">
            <TextInput
              label={t("Event Source")}
              description={t(
                "The source identifier for the event (default: smartcloud.flow)",
              )}
              placeholder={t("smartcloud.flow")}
              value={String(step.config.source ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { source: e.currentTarget.value })
              }
            />
            <TextInput
              label={t("Detail Type")}
              description={t("The type of event to publish (required)")}
              placeholder={t("lead.requested")}
              value={String(step.config.detailType ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { detailType: e.currentTarget.value })
              }
              required
            />
            <TextInput
              label={t("Event Bus Name (optional)")}
              description={t("Leave empty to use default event bus")}
              placeholder={t("default")}
              value={String(step.config.eventBusName ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { eventBusName: e.currentTarget.value })
              }
            />
            <Select
              label={t("Payload Mode")}
              description={t("How to construct the event payload")}
              data={[
                { value: "full-submission", label: t("Full Submission Data") },
                { value: "custom", label: t("Custom Template Only") },
                { value: "merged", label: t("Merged (Submission + Custom)") },
              ]}
              value={String(step.config.payloadMode ?? "full-submission")}
              onChange={(value) =>
                updateStepConfig(index, {
                  payloadMode: value ?? "full-submission",
                })
              }
              comboboxProps={comboboxProps}
            />
            {(step.config.payloadMode === "custom" ||
              step.config.payloadMode === "merged") && (
              <JsonDraftEditor
                label="Custom Payload (JSON)"
                description="Use dotted template paths like {{result.routing.route}}, {{submission.fields.workEmail}}, {{submission.source.pageUrl}}, {{submission.submissionId}}, or {{site.baseUrl}}. accountId, siteId, and occurredAt are added automatically."
                height={220}
                minHeight={180}
                value={String(step.config.customPayload ?? "")}
                onChange={(value) =>
                  updateStepConfig(index, {
                    customPayload: value ?? "",
                  })
                }
                warnings={[customPayloadDraftError]}
              />
            )}
            <Checkbox
              label={t("Include workflow metadata")}
              description={t("Add workflow ID and step info to event")}
              checked={Boolean(step.config.includeWorkflowMetadata)}
              onChange={(e) =>
                updateStepConfig(index, {
                  includeWorkflowMetadata: e.currentTarget.checked,
                })
              }
            />
            <Checkbox
              label={t("Include submission metadata")}
              description={t(
                "Add submission ID, form ID, status, and timestamps",
              )}
              checked={Boolean(step.config.includeSubmissionMetadata)}
              onChange={(e) =>
                updateStepConfig(index, {
                  includeSubmissionMetadata: e.currentTarget.checked,
                })
              }
            />
            <Select
              label={t("Update Status on Success (optional)")}
              description={t(
                "Change submission status after successful event publish",
              )}
              data={[
                { value: "", label: t("Don't update status") },
                ...STATUS_VALUES,
              ]}
              value={String(step.config.statusOnSuccess ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { statusOnSuccess: value ?? "" })
              }
              clearable
              comboboxProps={comboboxProps}
            />
            <Text size="xs" c="dimmed">
              {t(
                "This action publishes an event to EventBridge. Configure AWS EventBridge rules in your account to route events to Lambda, Step Functions, or other targets.",
              )}
            </Text>
          </Stack>
        );
      }

      case "ai.agent": {
        const selectedTools = getAiAgentToolNames(step.config);
        const selectedToolChoice = getAiAgentToolChoice(step.config);
        const routingPreset = String(
          step.config.routingPreset ?? "none",
        ) as AiRoutingPreset;
        const routingAuthoring = getRoutingAuthoringConfig(step.config);
        const platformSystemPrompt =
          buildRoutingSystemPromptBlock(routingPreset);
        const userSystemPrompt = String(
          step.config.userSystemPrompt ??
            (platformSystemPrompt &&
            String(step.config.systemPrompt ?? "").startsWith(
              platformSystemPrompt,
            )
              ? String(step.config.systemPrompt ?? "")
                  .slice(platformSystemPrompt.length)
                  .trim()
              : step.config.systemPrompt ?? ""),
        );
        const routingValidation = validateRoutingConstraint(
          step.config.responseConstraint,
          routingPreset,
        );
        return (
          <Stack gap="sm">
            <Select
              label={t("Mode")}
              description={t("High-level intent passed to the AI agent")}
              data={[
                { value: "answer", label: t("Answer") },
                { value: "summarize", label: t("Summarize") },
                { value: "classify", label: t("Classify") },
                { value: "extract", label: t("Extract structured data") },
              ]}
              value={String(step.config.mode ?? "answer")}
              onChange={(value) => {
                const nextMode = value ?? "answer";
                updateStepConfig(index, {
                  mode: nextMode,
                  ...(String(step.config.text ?? "").trim()
                    ? {}
                    : { text: getDefaultAiAgentText(nextMode) }),
                });
              }}
              comboboxProps={comboboxProps}
            />
            <Select
              label={t("Internal routing")}
              description={t(
                "Use a platform-owned routing contract when you want downstream conditional branching from the AI result.",
              )}
              data={AI_ROUTING_PRESETS.map((preset) => ({
                value: preset.value,
                label: t(preset.label),
              }))}
              value={routingPreset}
              onChange={(value) => {
                const nextPreset = (value ?? "none") as AiRoutingPreset;
                const nextPlatformBlock =
                  buildRoutingSystemPromptBlock(nextPreset);
                updateStepConfig(index, {
                  routingPreset: nextPreset,
                  responseConstraint:
                    nextPreset === "none"
                      ? step.config.responseConstraint
                      : buildRoutingResponseConstraint(
                          nextPreset,
                          routingAuthoring,
                        ),
                  userSystemPrompt,
                  systemPrompt: composeAiSystemPrompt(
                    nextPlatformBlock,
                    userSystemPrompt,
                  ),
                });
              }}
              comboboxProps={comboboxProps}
            />
            <Text size="xs" c="dimmed">
              {t(
                AI_ROUTING_PRESETS.find(
                  (preset) => preset.value === routingPreset,
                )?.description ?? "",
              )}
            </Text>
            {routingPreset !== "none" &&
            routingPreset !== "draft-reply-only" ? (
              <Stack gap="xs">
                <TagsInput
                  label={t("Route Keys")}
                  description={t(
                    "Explicit route values that the AI is allowed to emit. These directly seed process-map branch suggestions.",
                  )}
                  placeholder={t("Add route keys like support, sales, billing")}
                  value={routingAuthoring.routes}
                  onChange={(value) => {
                    const nextAuthoring = {
                      ...routingAuthoring,
                      routes: normalizeStringList(value),
                    };
                    updateStepConfig(index, {
                      routingRoutes: nextAuthoring.routes,
                      responseConstraint: buildRoutingResponseConstraint(
                        routingPreset,
                        nextAuthoring,
                      ),
                    });
                  }}
                  comboboxProps={comboboxProps}
                  clearable
                />
                <TagsInput
                  label={t("Outcome Types")}
                  description={t(
                    "Stable outcome type keys used for downstream workflow actions. Prefer generic verbs over tenant-specific booleans.",
                  )}
                  placeholder={t(
                    "Add outcome types like invoke_webhook, invoke_workflow, send_email",
                  )}
                  value={routingAuthoring.outcomeTypes}
                  onChange={(value) => {
                    const nextAuthoring = {
                      ...routingAuthoring,
                      outcomeTypes: normalizeStringList(value),
                    };
                    updateStepConfig(index, {
                      routingOutcomeTypes: nextAuthoring.outcomeTypes,
                      responseConstraint: buildRoutingResponseConstraint(
                        routingPreset,
                        nextAuthoring,
                      ),
                    });
                  }}
                  comboboxProps={comboboxProps}
                  clearable
                />
                <TagsInput
                  label={t("Signal Keys")}
                  description={t(
                    "Optional structured signal names for auxiliary metadata like priority, language, or urgency.",
                  )}
                  placeholder={t(
                    "Add signal keys like priority, language, urgency",
                  )}
                  value={routingAuthoring.signalKeys}
                  onChange={(value) => {
                    const nextAuthoring = {
                      ...routingAuthoring,
                      signalKeys: normalizeStringList(value),
                    };
                    updateStepConfig(index, {
                      routingSignalKeys: nextAuthoring.signalKeys,
                      responseConstraint: buildRoutingResponseConstraint(
                        routingPreset,
                        nextAuthoring,
                      ),
                    });
                  }}
                  comboboxProps={comboboxProps}
                  clearable
                />
              </Stack>
            ) : null}
            <Textarea
              label={t("Prompt Text")}
              description={t(
                "Main user prompt. This is required at runtime. Templates like {{submission.email}} are supported.",
              )}
              placeholder={getDefaultAiAgentText(
                String(step.config.mode ?? "answer"),
              )}
              minRows={4}
              styles={{
                input: {
                  resize: "vertical",
                  overflow: "auto",
                  minHeight: "110px",
                },
              }}
              value={String(step.config.text ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { text: e.currentTarget.value })
              }
              required
            />
            {platformSystemPrompt ? (
              <Textarea
                label={t("Platform System Block")}
                description={t(
                  "Automatically injected guardrails for the selected routing preset. This part is not user-editable.",
                )}
                autosize
                minRows={5}
                value={platformSystemPrompt}
                readOnly
              />
            ) : null}
            <Textarea
              label={t("Additional System Guidance")}
              description={t(
                "Optional user-owned instructions appended after the platform block. Leave empty to rely on the preset guardrails and backend defaults.",
              )}
              placeholder={t(
                "You are a support agent. Be concise and cite sources when available.",
              )}
              minRows={3}
              styles={{
                input: {
                  resize: "vertical",
                  overflow: "auto",
                  minHeight: "90px",
                },
              }}
              value={userSystemPrompt}
              onChange={(e) =>
                updateStepConfig(index, {
                  userSystemPrompt: e.currentTarget.value,
                  systemPrompt: composeAiSystemPrompt(
                    platformSystemPrompt,
                    e.currentTarget.value,
                  ),
                })
              }
            />
            <TextInput
              label={t("Knowledge Base ID (optional)")}
              description={t(
                "Leave empty to use the backend default KB configuration",
              )}
              placeholder={t("KB12345678")}
              value={String(step.config.knowledgeBaseId ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  knowledgeBaseId: e.currentTarget.value,
                })
              }
            />
            <TextInput
              label={t("Top K (optional)")}
              description={t("Maximum retrieved KB chunks")}
              type="number"
              placeholder="5"
              value={String(step.config.topK ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  topK: e.currentTarget.value
                    ? Number(e.currentTarget.value)
                    : undefined,
                })
              }
            />
            <Checkbox
              label={t("Enable reasoning")}
              description={t("Enables Bedrock reasoning config for this step.")}
              checked={Boolean(step.config.enableReasoning)}
              onChange={(e) =>
                updateStepConfig(index, {
                  enableReasoning: e.currentTarget.checked,
                })
              }
            />
            <Select
              label={t("Reasoning Effort")}
              data={[
                { value: "low", label: t("Low") },
                { value: "medium", label: t("Medium") },
                { value: "high", label: t("High") },
              ]}
              value={String(step.config.reasoningEffort ?? "low")}
              onChange={(value) =>
                updateStepConfig(index, {
                  reasoningEffort: value ?? "low",
                })
              }
              disabled={!step.config.enableReasoning}
              comboboxProps={comboboxProps}
            />
            <Select
              label={t("Tool Invocation Policy")}
              description={t(
                "Controls how Bedrock may use the enabled tools below.",
              )}
              data={[
                {
                  value: "auto",
                  label: t("Auto - model decides if a tool is needed"),
                },
                {
                  value: "any",
                  label: t(
                    "Require tool use - model must use one enabled tool",
                  ),
                },
              ]}
              value={selectedToolChoice}
              onChange={(value) => {
                const nextChoice = value === "any" ? "any" : "auto";
                updateStepConfig(index, {
                  toolSelection: buildAiAgentToolSelection(
                    selectedTools,
                    nextChoice,
                  ),
                  enabledTools: selectedTools,
                });
              }}
              disabled={selectedTools.length === 0}
              comboboxProps={comboboxProps}
            />
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {t("Enabled Tools")}
              </Text>
              {AI_AGENT_TOOL_OPTIONS.map((tool) => (
                <Checkbox
                  key={tool.value}
                  label={t(tool.label)}
                  description={t(tool.description)}
                  checked={selectedTools.includes(tool.value)}
                  onChange={(e) => {
                    const nextTools = e.currentTarget.checked
                      ? [...selectedTools, tool.value]
                      : selectedTools.filter((item) => item !== tool.value);

                    updateStepConfig(index, {
                      toolSelection: buildAiAgentToolSelection(
                        nextTools,
                        selectedToolChoice,
                      ),
                      enabledTools: nextTools,
                    });
                  }}
                />
              ))}
            </Stack>
            <Group gap="xs">
              <Text size="sm" fw={500}>
                {t("Response Schema Presets")}
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() =>
                  updateStepConfig(index, {
                    responseConstraint:
                      routingPreset === "none"
                        ? getResponseConstraintTemplate(
                            String(step.config.mode ?? "answer"),
                          )
                        : buildRoutingResponseConstraint(
                            routingPreset,
                            routingAuthoring,
                          ),
                  })
                }
              >
                {routingPreset === "none"
                  ? t("Use preset for current mode")
                  : t("Apply routing preset")}
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() =>
                  updateStepConfig(index, { responseConstraint: undefined })
                }
              >
                {t("Clear")}
              </Button>
            </Group>
            <JsonDraftEditor
              label="Response Constraint (JSON schema, optional)"
              description="Use a JSON object schema. Invalid JSON stays in the editor until you fix it, and the workflow keeps the draft text instead of discarding it."
              height={220}
              value={
                typeof step.config.responseConstraint === "string"
                  ? step.config.responseConstraint
                  : JSON.stringify(
                      step.config.responseConstraint ?? {},
                      null,
                      2,
                    )
              }
              onChange={(value) => {
                const nextValue = value ?? "";
                try {
                  updateStepConfig(index, {
                    responseConstraint: nextValue.trim()
                      ? JSON.parse(nextValue)
                      : undefined,
                  });
                } catch {
                  updateStepConfig(index, { responseConstraint: nextValue });
                }
              }}
              warnings={[
                typeof step.config.responseConstraint === "string" &&
                step.config.responseConstraint.trim()
                  ? "The schema is currently invalid JSON. Fix the editor content before saving."
                  : null,
                routingValidation,
              ]}
            />
            <Select
              label={t("Update Status on Dispatch (optional)")}
              description={t(
                "Change submission status immediately after the AI request event is published",
              )}
              data={[
                { value: "", label: t("Don't update status") },
                ...STATUS_VALUES,
              ]}
              value={String(step.config.statusOnSuccess ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { statusOnSuccess: value ?? "" })
              }
              clearable
              comboboxProps={comboboxProps}
            />
            <Text size="xs" c="dimmed">
              {routingPreset === "none"
                ? t(
                    "This step emits an `ai.agent.requested` event. The AI backend then emits `ai.agent.completed` or `ai.agent.failed`, and process-map connections can scope downstream workflows to this exact AI step.",
                  )
                : t(
                    "This step emits an `ai.agent.requested` event with a routing contract. Downstream workflows should branch on routing.route, routing.outcomes, or routing.signals instead of prompt-specific booleans.",
                  )}
            </Text>
          </Stack>
        );
      }
      default:
        return (
          <Textarea
            label={t("Configuration (JSON)")}
            autosize
            minRows={6}
            value={JSON.stringify(step.config, null, 2)}
            onChange={(e) => {
              try {
                const config = JSON.parse(e.currentTarget.value);
                updateStepConfig(index, config);
              } catch {
                // Invalid JSON, ignore
              }
            }}
          />
        );
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {t("Workflow Steps")}
        </Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addStep}
        >
          {t("Add Step")}
        </Button>
      </Group>

      {steps.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t(
            "No steps configured - add a step to define what happens when the workflow triggers",
          )}
        </Text>
      ) : (
        <Stack gap="sm">
          {steps.map((step, index) => (
            <Card key={index} withBorder p="md" style={{ overflow: "visible" }}>
              <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <IconGripVertical size={16} color="gray" />
                    {getStepIcon(step.actionType)}
                    <Text size="sm" fw={500}>
                      {t("Step")} {index + 1}: {getStepLabel(step.actionType)}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    {index > 0 && (
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => moveStep(index, "up")}
                      >
                        ↑
                      </Button>
                    )}
                    {index < steps.length - 1 && (
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => moveStep(index, "down")}
                      >
                        ↓
                      </Button>
                    )}
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => removeStep(index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>

                <Select
                  label={t("Action Type")}
                  data={actionTypeOptions}
                  value={step.actionType}
                  onChange={(value) =>
                    updateStep(index, {
                      actionType: value ?? "email.send",
                      config: getDefaultStepConfig(value ?? "email.send"),
                    })
                  }
                  comboboxProps={comboboxProps}
                />

                {renderStepConfig(step, index)}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
