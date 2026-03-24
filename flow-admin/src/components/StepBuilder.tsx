import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  IconBrain,
  IconBolt,
  IconCloud,
  IconGripVertical,
  IconMail,
  IconPlus,
  IconTrash,
  IconWebhook,
} from "@tabler/icons-react";
import { useState } from "react";
import type { EmailTemplate, WebhookEndpoint } from "../api/types";
import MonacoEditor from "./MonacoEditor";

const AI_AGENT_TOOL_OPTIONS = [
  {
    value: "web_grounding",
    label: "Web Grounding",
    description:
      "Allow the model to fetch and ground answers from explicit HTTPS URLs.",
  },
  {
    value: "code_interpreter",
    label: "Code Interpreter",
    description:
      "Allow the model to evaluate small sandboxed JavaScript expressions for calculations or transformations.",
  },
  {
    value: "computer_use",
    label: "Computer Use",
    description:
      "Return a server-side fallback when the model asks for interactive browser or desktop control.",
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
  code_interpreter: {
    type: "object",
    properties: {
      expression: { type: "string", minLength: 1 },
    },
    required: ["expression"],
    additionalProperties: false,
  },
  computer_use: {
    type: "object",
    properties: {
      task: { type: "string" },
    },
    additionalProperties: true,
  },
};

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
    return ((toolSelection as { tools?: unknown[] }).tools ?? [])
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
      .filter(Boolean);
  }

  if (Array.isArray(config.enabledTools)) {
    return config.enabledTools
      .filter((tool): tool is string => typeof tool === "string")
      .map((tool) => tool.trim())
      .filter(Boolean);
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
  retryPolicy?: {
    maxAttempts?: number;
    backoffMultiplier?: number;
  };
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
  { value: "zapier", label: "Zapier (Webhook Preset)", icon: IconBolt },
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
    return (
      ACTION_TYPES.find((a) => a.value === actionType)?.label ?? actionType
    );
  };

  const renderStepConfig = (step: WorkflowStep, index: number) => {
    switch (step.actionType) {
      case "email.send":
        return (
          <Stack gap="sm">
            <Select
              label="Email Template"
              description="Select the template to use for this email"
              placeholder="Choose a template"
              data={templates.map((t) => ({
                value: t.templateKey,
                label: t.name || t.templateKey,
              }))}
              value={String(step.config.templateKey ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { templateKey: value ?? "" })
              }
              searchable
              comboboxProps={{ zIndex: 100001 }}
            />
            <TextInput
              label="Recipient Email"
              description="Use {{submission.email}} for submitter's email"
              placeholder="{{submission.email}}"
              value={String(step.config.recipientEmail ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  recipientEmail: e.currentTarget.value,
                })
              }
            />
            <TextInput
              label="CC (optional)"
              description="Comma-separated email addresses"
              placeholder="admin@example.com, manager@example.com"
              value={String(step.config.cc ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { cc: e.currentTarget.value })
              }
            />
            <TextInput
              label="BCC (optional)"
              placeholder="archive@example.com"
              value={String(step.config.bcc ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { bcc: e.currentTarget.value })
              }
            />
          </Stack>
        );

      case "webhook.call":
        return (
          <Stack gap="sm">
            <Select
              label="Use Webhook Endpoint"
              description="Select a predefined webhook or leave empty for inline URL"
              placeholder="Choose webhook endpoint (optional)"
              data={webhooks.map((w) => ({
                value: w.webhookKey,
                label: w.name || w.webhookKey,
              }))}
              value={String(step.config.webhookKey ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { webhookKey: value ?? "" })
              }
              searchable
              clearable
              comboboxProps={{ zIndex: 100001 }}
            />
            <TextInput
              label="Webhook URL (if not using endpoint)"
              description="The endpoint to send the webhook to"
              placeholder="https://example.com/api/webhook"
              value={String(step.config.url ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { url: e.currentTarget.value })
              }
              disabled={!!step.config.webhookKey}
            />
            <Select
              label="HTTP Method"
              data={["POST", "PUT", "PATCH", "GET"]}
              value={String(step.config.method ?? "POST")}
              onChange={(value) =>
                updateStepConfig(index, { method: value ?? "POST" })
              }
              comboboxProps={{ zIndex: 100001 }}
            />
            <Textarea
              label="Request Body (JSON)"
              description="Use {{submission}} to include submission data"
              placeholder='{"submission": {{submission}}, "event": "workflow_triggered"}'
              minRows={4}
              value={String(step.config.body ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { body: e.currentTarget.value })
              }
            />
            <Textarea
              label="Headers (JSON, optional)"
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              minRows={3}
              value={String(step.config.headers ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { headers: e.currentTarget.value })
              }
            />
          </Stack>
        );

      case "status.update":
        return (
          <Stack gap="sm">
            <Select
              label="New Status"
              description="The status to set on the submission"
              data={STATUS_VALUES}
              value={String(step.config.status ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { status: value ?? "" })
              }
              comboboxProps={{ zIndex: 100001 }}
            />
            <TextInput
              label="Notes (optional)"
              description="Internal notes to add to the submission"
              placeholder="Status updated by workflow"
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
              label="Duration (seconds)"
              description="How long to wait before the next step"
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
              Note: Delays are useful for rate limiting or waiting for external
              processes
            </Text>
          </Stack>
        );

      case "eventbridge.event":
        return (
          <Stack gap="sm">
            <TextInput
              label="Event Source"
              description="The source identifier for the event (default: smartcloud.flow)"
              placeholder="smartcloud.flow"
              value={String(step.config.source ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { source: e.currentTarget.value })
              }
            />
            <TextInput
              label="Detail Type"
              description="The type of event to publish (required)"
              placeholder="lead.requested"
              value={String(step.config.detailType ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { detailType: e.currentTarget.value })
              }
              required
            />
            <TextInput
              label="Event Bus Name (optional)"
              description="Leave empty to use default event bus"
              placeholder="default"
              value={String(step.config.eventBusName ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { eventBusName: e.currentTarget.value })
              }
            />
            <Select
              label="Payload Mode"
              description="How to construct the event payload"
              data={[
                { value: "full-submission", label: "Full Submission Data" },
                { value: "custom", label: "Custom Template Only" },
                { value: "merged", label: "Merged (Submission + Custom)" },
              ]}
              value={String(step.config.payloadMode ?? "full-submission")}
              onChange={(value) =>
                updateStepConfig(index, {
                  payloadMode: value ?? "full-submission",
                })
              }
              comboboxProps={{ zIndex: 100001 }}
            />
            {(step.config.payloadMode === "custom" ||
              step.config.payloadMode === "merged") && (
              <Textarea
                label="Custom Payload (JSON)"
                description="Use {{submission.field}} for dynamic values"
                placeholder='{\n  "leadEmail": "{{submission.email}}",\n  "leadName": "{{submission.name}}"\n}'
                minRows={6}
                value={String(step.config.customPayload ?? "")}
                onChange={(e) =>
                  updateStepConfig(index, {
                    customPayload: e.currentTarget.value,
                  })
                }
              />
            )}
            <Checkbox
              label="Include workflow metadata"
              description="Add workflow ID and step info to event"
              checked={Boolean(step.config.includeWorkflowMetadata)}
              onChange={(e) =>
                updateStepConfig(index, {
                  includeWorkflowMetadata: e.currentTarget.checked,
                })
              }
            />
            <Checkbox
              label="Include submission metadata"
              description="Add submission ID, form ID, status, and timestamps"
              checked={Boolean(step.config.includeSubmissionMetadata)}
              onChange={(e) =>
                updateStepConfig(index, {
                  includeSubmissionMetadata: e.currentTarget.checked,
                })
              }
            />
            <Select
              label="Update Status on Success (optional)"
              description="Change submission status after successful event publish"
              data={[
                { value: "", label: "Don't update status" },
                ...STATUS_VALUES,
              ]}
              value={String(step.config.statusOnSuccess ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { statusOnSuccess: value ?? "" })
              }
              clearable
              comboboxProps={{ zIndex: 100001 }}
            />
            <Text size="xs" c="dimmed">
              💡 This action publishes an event to EventBridge. Configure AWS
              EventBridge rules in your account to route events to Lambda, Step
              Functions, or other targets.
            </Text>
          </Stack>
        );

      case "ai.agent":
        const selectedTools = getAiAgentToolNames(step.config);
        const selectedToolChoice = getAiAgentToolChoice(step.config);
        return (
          <Stack gap="sm">
            <Select
              label="Mode"
              description="High-level intent passed to the AI agent"
              data={[
                { value: "answer", label: "Answer" },
                { value: "summarize", label: "Summarize" },
                { value: "classify", label: "Classify" },
                { value: "extract", label: "Extract structured data" },
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
              comboboxProps={{ zIndex: 100001 }}
            />
            <Textarea
              label="Prompt Text"
              description="Main user prompt. This is required at runtime. Templates like {{submission.email}} are supported."
              placeholder={getDefaultAiAgentText(
                String(step.config.mode ?? "answer"),
              )}
              minRows={4}
              value={String(step.config.text ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { text: e.currentTarget.value })
              }
              required
            />
            <Textarea
              label="System Prompt"
              description="Optional. If you leave this empty, the AI backend uses its built-in answer template/system prompt."
              placeholder="You are a support agent. Be concise and cite sources when available."
              minRows={3}
              value={String(step.config.systemPrompt ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  systemPrompt: e.currentTarget.value,
                })
              }
            />
            <TextInput
              label="Knowledge Base ID (optional)"
              description="Leave empty to use the backend default KB configuration"
              placeholder="KB12345678"
              value={String(step.config.knowledgeBaseId ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  knowledgeBaseId: e.currentTarget.value,
                })
              }
            />
            <TextInput
              label="Top K (optional)"
              description="Maximum retrieved KB chunks"
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
              label="Enable reasoning"
              description="Enables Bedrock reasoning config for this step."
              checked={Boolean(step.config.enableReasoning)}
              onChange={(e) =>
                updateStepConfig(index, {
                  enableReasoning: e.currentTarget.checked,
                })
              }
            />
            <Select
              label="Reasoning Effort"
              data={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              value={String(step.config.reasoningEffort ?? "low")}
              onChange={(value) =>
                updateStepConfig(index, {
                  reasoningEffort: value ?? "low",
                })
              }
              disabled={!step.config.enableReasoning}
              comboboxProps={{ zIndex: 100001 }}
            />
            <Select
              label="Tool Invocation Policy"
              description="Controls how Bedrock may use the enabled tools below."
              data={[
                {
                  value: "auto",
                  label: "Auto - model decides if a tool is needed",
                },
                {
                  value: "any",
                  label: "Require tool use - model must use one enabled tool",
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
              comboboxProps={{ zIndex: 100001 }}
            />
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Enabled Tools
              </Text>
              {AI_AGENT_TOOL_OPTIONS.map((tool) => (
                <Checkbox
                  key={tool.value}
                  label={tool.label}
                  description={tool.description}
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
                Response Schema Presets
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() =>
                  updateStepConfig(index, {
                    responseConstraint: getResponseConstraintTemplate(
                      String(step.config.mode ?? "answer"),
                    ),
                  })
                }
              >
                Use preset for current mode
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() =>
                  updateStepConfig(index, { responseConstraint: undefined })
                }
              >
                Clear
              </Button>
            </Group>
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Response Constraint (JSON schema, optional)
              </Text>
              <Text size="xs" c="dimmed">
                Use a JSON object schema. Invalid JSON stays in the editor until
                you fix it, and the workflow keeps the draft text instead of
                discarding it.
              </Text>
              <MonacoEditor
                language="json"
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
              />
              {typeof step.config.responseConstraint === "string" &&
              step.config.responseConstraint.trim() ? (
                <Text size="xs" c="orange">
                  The schema is currently invalid JSON. Fix the editor content
                  before saving.
                </Text>
              ) : null}
            </Stack>
            <Select
              label="Update Status on Dispatch (optional)"
              description="Change submission status immediately after the AI request event is published"
              data={[
                { value: "", label: "Don't update status" },
                ...STATUS_VALUES,
              ]}
              value={String(step.config.statusOnSuccess ?? "")}
              onChange={(value) =>
                updateStepConfig(index, { statusOnSuccess: value ?? "" })
              }
              clearable
              comboboxProps={{ zIndex: 100001 }}
            />
            <Text size="xs" c="dimmed">
              This step emits an `ai.agent.requested` event. The AI backend then
              emits `ai.agent.completed` or `ai.agent.failed`, which can trigger
              downstream workflows.
            </Text>
          </Stack>
        );

      case "zapier":
        return (
          <Stack gap="sm">
            <TextInput
              label="Zapier Webhook URL"
              description="Get this URL from your Zapier webhook trigger"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={String(step.config.url ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { url: e.currentTarget.value })
              }
              required
            />
            <TextInput
              label="Event Name"
              description="A friendly name for this event in Zapier"
              placeholder="New Form Submission"
              value={String(step.config.eventName ?? "")}
              onChange={(e) =>
                updateStepConfig(index, { eventName: e.currentTarget.value })
              }
            />
            <Checkbox
              label="Include full submission data"
              description="Send all submission fields to Zapier"
              checked={Boolean(step.config.includeFullSubmission ?? true)}
              onChange={(e) =>
                updateStepConfig(index, {
                  includeFullSubmission: e.currentTarget.checked,
                })
              }
            />
            <Textarea
              label="Additional Fields (JSON, optional)"
              description="Add custom fields to the Zapier payload"
              placeholder='{\n  "customField": "{{submission.field}}"\n}'
              minRows={4}
              value={String(step.config.additionalFields ?? "")}
              onChange={(e) =>
                updateStepConfig(index, {
                  additionalFields: e.currentTarget.value,
                })
              }
            />
            <Text size="xs" c="dimmed">
              ⚡ Zapier webhook calls are made with POST method and
              application/json content type.
            </Text>
          </Stack>
        );

      default:
        return (
          <Textarea
            label="Configuration (JSON)"
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
          Workflow Steps
        </Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addStep}
        >
          Add Step
        </Button>
      </Group>

      {steps.length === 0 ? (
        <Text size="sm" c="dimmed">
          No steps configured - add a step to define what happens when the
          workflow triggers
        </Text>
      ) : (
        <Stack gap="sm">
          {steps.map((step, index) => (
            <Card key={index} withBorder p="md">
              <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <IconGripVertical size={16} color="gray" />
                    {getStepIcon(step.actionType)}
                    <Text size="sm" fw={500}>
                      Step {index + 1}: {getStepLabel(step.actionType)}
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
                  label="Action Type"
                  data={ACTION_TYPES}
                  value={step.actionType}
                  onChange={(value) =>
                    updateStep(index, {
                      actionType: value ?? "email.send",
                      config: getDefaultStepConfig(value ?? "email.send"),
                    })
                  }
                  comboboxProps={{ zIndex: 100001 }}
                />

                {renderStepConfig(step, index)}

                <Checkbox
                  label="Enable retry on failure"
                  checked={Boolean(step.retryPolicy)}
                  onChange={(e) =>
                    updateStep(index, {
                      retryPolicy: e.currentTarget.checked
                        ? { maxAttempts: 3, backoffMultiplier: 2 }
                        : undefined,
                    })
                  }
                />

                {step.retryPolicy && (
                  <Group>
                    <TextInput
                      label="Max Attempts"
                      type="number"
                      style={{ flex: 1 }}
                      value={step.retryPolicy.maxAttempts ?? 3}
                      onChange={(e) =>
                        updateStep(index, {
                          retryPolicy: {
                            ...step.retryPolicy,
                            maxAttempts: Number(e.currentTarget.value),
                          },
                        })
                      }
                    />
                    <TextInput
                      label="Backoff Multiplier"
                      type="number"
                      style={{ flex: 1 }}
                      value={step.retryPolicy.backoffMultiplier ?? 2}
                      onChange={(e) =>
                        updateStep(index, {
                          retryPolicy: {
                            ...step.retryPolicy,
                            backoffMultiplier: Number(e.currentTarget.value),
                          },
                        })
                      }
                    />
                  </Group>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
