import {
  Autocomplete,
  Button,
  Card,
  Collapse,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Switch,
  Select,
  Title,
  TextInput,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowBackendClient } from "../api/backend-client";
import type { BootConfig, FormDefinition, Workflow } from "../api/types";
import ConditionBuilder, { type WorkflowCondition } from "./ConditionBuilder";
import {
  normalizeConditionFieldValue,
  normalizeConditionStoredValue,
} from "./condition-builder-utils";
import StepBuilder, { type WorkflowStep } from "./StepBuilder";
import { JsonBlock } from "./JsonBlock";
import { useOperationsComboboxProps } from "./OperationsPortalContext";
import { t } from "../operations/i18n";

export interface WorkflowEditorModalProps {
  opened: boolean;
  onClose: () => void;
  /** null = create new, non-null = edit existing */
  initialWorkflow: Workflow | null;
  client: FlowBackendClient;
  boot: BootConfig;
  onSaved: (workflow: Workflow, isNew: boolean) => void;
  allowedTriggerEvents?: string[];
  defaultTriggerEvent?: string;
  defaultConditions?: WorkflowCondition[];
  persistTriggerEvent?: boolean;
  zIndex?: number;
}

const TRIGGER_OPTIONS = [
  {
    value: "submission.created",
    label: "Submission Created - When a new form is submitted",
  },
  {
    value: "submission.updated",
    label: "Submission Updated - When submission status or fields change",
  },
  {
    value: "submission.action-invoked",
    label: "Action Invoked - When a manual action is triggered",
  },
  {
    value: "integration.webhook.requested",
    label: "Webhook Requested - External webhook trigger",
  },
  {
    value: "ai.agent.completed",
    label: "AI Agent Completed - After AI processing finishes",
  },
  {
    value: "ai.agent.failed",
    label: "AI Agent Failed - When AI processing errors",
  },
] as const;

function validateAiRoutingPreset(step: WorkflowStep): string | null {
  const preset = String(step.config?.routingPreset ?? "none");
  if (preset === "none") return null;

  const schema = step.config?.responseConstraint;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return t("requires a valid JSON object response constraint for routing.");
  }

  const root = schema as Record<string, unknown>;
  const properties = root.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return t("requires a schema properties object for routing.");
  }

  if (preset === "draft-reply-only") {
    if (!("draftReply" in (properties as Record<string, unknown>))) {
      return t("requires a draftReply property in the response constraint.");
    }
    return null;
  }

  const routing = (properties as Record<string, unknown>).routing;
  if (!routing || typeof routing !== "object" || Array.isArray(routing)) {
    return t("requires a routing object in the response constraint.");
  }

  const routingProperties = (routing as Record<string, unknown>).properties;
  if (
    !routingProperties ||
    typeof routingProperties !== "object" ||
    Array.isArray(routingProperties)
  ) {
    return t("requires routing.properties in the response constraint.");
  }

  for (const field of ["route", "confidence", "reason", "outcomes"]) {
    if (!(field in (routingProperties as Record<string, unknown>))) {
      return t(`requires routing.${field} in the response constraint.`);
    }
  }

  return null;
}

function makeEmpty(boot: BootConfig): Workflow {
  return {
    workflowId: "",
    accountId: boot.accountId ?? "",
    siteId: boot.siteId ?? "",
    name: "",
    description: "",
    enabled: true,
    trigger: {
      eventType: "submission.created",
      conditions: [],
      repeatPolicy: "always",
    },
    steps: [],
  };
}

function getInitialConditions(
  workflow: Workflow,
  forms: FormDefinition[] = [],
  fallbackConditions?: WorkflowCondition[],
): WorkflowCondition[] {
  const baseConditions = Array.isArray(workflow.trigger?.conditions)
    ? (
        (workflow.trigger?.conditions ?? []) as unknown as WorkflowCondition[]
      ).map((condition) => ({
        ...condition,
        field: normalizeConditionFieldValue(String(condition.field ?? "")),
        value: normalizeConditionStoredValue(
          String(condition.field ?? ""),
          String(condition.value ?? ""),
          forms,
        ),
      }))
    : fallbackConditions ?? [];

  return [...baseConditions];
}

export default function WorkflowEditorModal({
  opened,
  onClose,
  initialWorkflow,
  client,
  boot,
  onSaved,
  allowedTriggerEvents,
  defaultTriggerEvent,
  defaultConditions,
  persistTriggerEvent = true,
  zIndex = 100010,
}: WorkflowEditorModalProps) {
  const queryClient = useQueryClient();
  const comboboxProps = useOperationsComboboxProps(zIndex + 1);
  const isNew = !initialWorkflow?.workflowId;

  const [editing, setEditing] = useState<Workflow>(
    initialWorkflow ?? makeEmpty(boot),
  );
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [showJsonView, setShowJsonView] = useState(false);
  const lastInitKeyRef = useRef<string | null>(null);

  const defaultConditionsKey = JSON.stringify(defaultConditions ?? null);
  const initKey = JSON.stringify({
    opened,
    workflowId: initialWorkflow?.workflowId ?? null,
    defaultTriggerEvent: defaultTriggerEvent ?? null,
    defaultConditions: defaultConditions ?? null,
    accountId: boot.accountId ?? null,
    siteId: boot.siteId ?? null,
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => client.listTemplates(),
  });
  const webhookQuery = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => client.listWebhookEndpoints(),
  });
  const formsQuery = useQuery({
    queryKey: ["forms"],
    queryFn: () => client.listForms(),
  });

  const forms = useMemo(() => formsQuery.data?.items ?? [], [formsQuery.data]);

  useEffect(() => {
    if (!opened) {
      lastInitKeyRef.current = null;
      return;
    }

    if (lastInitKeyRef.current === initKey) {
      return;
    }

    lastInitKeyRef.current = initKey;

    queueMicrotask(() => {
      if (!opened) return;
      const emptyWorkflow = makeEmpty(boot);
      const resolvedTriggerEvent =
        defaultTriggerEvent ??
        initialWorkflow?.trigger?.eventType ??
        emptyWorkflow.trigger?.eventType;
      const wf = initialWorkflow ?? {
        ...emptyWorkflow,
        trigger: {
          ...emptyWorkflow.trigger,
          eventType: resolvedTriggerEvent,
        },
      };
      setEditing(
        persistTriggerEvent
          ? wf
          : {
              ...wf,
              trigger: {
                ...wf.trigger,
                eventType: resolvedTriggerEvent,
              },
            },
      );
      if (!initialWorkflow) {
        setConditions(
          defaultConditions ?? [
            { field: "status", operator: "equals", value: "new" },
          ],
        );
        setSteps([
          {
            actionType: "email.send",
            config: {
              templateKey: "",
              recipientEmail: "{{submission.email}}",
            },
          },
        ]);
      } else {
        setConditions(getInitialConditions(wf, forms));
        setSteps((wf.steps ?? []) as unknown as WorkflowStep[]);
      }
      setShowJsonView(false);
    });
  }, [
    opened,
    initKey,
    initialWorkflow,
    boot,
    defaultTriggerEvent,
    defaultConditions,
    defaultConditionsKey,
    forms,
    persistTriggerEvent,
  ]);

  const triggerOptions = TRIGGER_OPTIONS.filter(
    (option) =>
      !allowedTriggerEvents || allowedTriggerEvents.includes(option.value),
  ).map((option) => ({ value: option.value, label: t(option.label) }));
  const triggerEventSuggestions = triggerOptions.map((option) => ({
    value: option.value,
    label: `${option.label} (${option.value})`,
  }));
  const resolvedTriggerEventValue = String(
    editing.trigger?.eventType ??
      defaultTriggerEvent ??
      triggerOptions[0]?.value ??
      "submission.created",
  );

  const saveMutation = useMutation({
    mutationFn: (wf: Workflow) =>
      isNew
        ? client.createWorkflow(wf)
        : client.updateWorkflow(wf.workflowId, wf),
    onSuccess: (saved) => {
      notifications.show({
        message: t("Workflow saved"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
      onSaved(saved, isNew);
      onClose();
    },
    onError: (error: Error) =>
      notifications.show({ message: error.message, color: "red" }),
  });

  const handleSave = () => {
    const missingAiPromptIndex = steps.findIndex(
      (step) =>
        step.actionType === "ai.agent" &&
        !String(step.config?.text ?? "").trim(),
    );
    if (missingAiPromptIndex >= 0) {
      notifications.show({
        message: `AI Agent step ${missingAiPromptIndex + 1} ${t(
          "requires Prompt Text.",
        )}`,
        color: "red",
      });
      return;
    }
    const invalidResponseSchemaIndex = steps.findIndex(
      (step) =>
        step.actionType === "ai.agent" &&
        typeof step.config?.responseConstraint === "string" &&
        String(step.config.responseConstraint).trim(),
    );
    if (invalidResponseSchemaIndex >= 0) {
      notifications.show({
        message: `AI Agent step ${invalidResponseSchemaIndex + 1} ${t(
          "has an invalid Response Constraint JSON schema.",
        )}`,
        color: "red",
      });
      return;
    }
    const invalidRoutingPresetIndex = steps.findIndex(
      (step) =>
        step.actionType === "ai.agent" &&
        Boolean(validateAiRoutingPreset(step)),
    );
    if (invalidRoutingPresetIndex >= 0) {
      notifications.show({
        message: `AI Agent step ${
          invalidRoutingPresetIndex + 1
        } ${validateAiRoutingPreset(steps[invalidRoutingPresetIndex])}`,
        color: "red",
      });
      return;
    }
    const triggerWithoutLegacy = {
      ...(((editing.trigger ?? {}) as Record<string, unknown>) || {}),
    };
    delete triggerWithoutLegacy.formId;
    delete triggerWithoutLegacy.actionKey;
    delete triggerWithoutLegacy.status;

    const next: Workflow = {
      ...editing,
      trigger: {
        ...triggerWithoutLegacy,
        eventType: String(editing.trigger?.eventType ?? "").trim(),
        conditions: conditions.map((condition) => ({
          ...condition,
          field: normalizeConditionFieldValue(String(condition.field ?? "")),
          operator: String(condition.operator ?? "").trim(),
          value: normalizeConditionStoredValue(
            String(condition.field ?? ""),
            String(condition.value ?? ""),
            forms,
          ),
        })) as unknown as Record<string, unknown>[],
      },
      steps: steps as unknown as Workflow["steps"],
    };
    void saveMutation.mutate(next);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      zIndex={zIndex}
      title={isNew ? t("New workflow") : t("Edit workflow")}
    >
      <Stack>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <TextInput
            label={t("Workflow name")}
            description={t("A descriptive name for the workflow")}
            placeholder={t("e.g., Send welcome email")}
            value={editing.name}
            onChange={(e) =>
              setEditing({ ...editing, name: e.currentTarget.value })
            }
          />
          <TextInput
            label={t("Workflow ID")}
            description={t(
              "Unique identifier (lowercase, hyphens, underscores)",
            )}
            placeholder={t("e.g., welcome-email-workflow")}
            value={editing.workflowId}
            disabled={!isNew}
            onChange={(e) =>
              setEditing({ ...editing, workflowId: e.currentTarget.value })
            }
          />
        </SimpleGrid>
        <Textarea
          label={t("Description")}
          description={t("Optional description of what this workflow does")}
          minRows={3}
          styles={{
            input: {
              resize: "vertical",
              overflow: "auto",
              minHeight: "90px",
            },
          }}
          placeholder={t(
            "This workflow sends a welcome email to new subscribers...",
          )}
          value={editing.description ?? ""}
          onChange={(e) =>
            setEditing({ ...editing, description: e.currentTarget.value })
          }
        />
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Autocomplete
            label={t("Trigger event")}
            description={t(
              persistTriggerEvent
                ? "Choose a built-in trigger or type any EventBridge detail-type, for example contact.intake.completed."
                : "This trigger is managed by the Process Map connection. Changing it here will also update the incoming Process Map branch.",
            )}
            data={triggerEventSuggestions}
            value={resolvedTriggerEventValue}
            onChange={(value) =>
              setEditing({
                ...editing,
                trigger: {
                  ...editing.trigger,
                  eventType: value,
                },
              })
            }
            comboboxProps={comboboxProps}
          />
          <Switch
            mt={30}
            label={t("Enabled")}
            checked={Boolean(editing.enabled)}
            onChange={(e) =>
              setEditing({ ...editing, enabled: e.currentTarget.checked })
            }
          />
        </SimpleGrid>
        <Select
          label={t("Repeat policy")}
          description={t(
            "For status-based workflows, choose whether the workflow should run every time the matching status is reached, or only the first time per submission.",
          )}
          data={[
            {
              value: "always",
              label: t("Always run when the trigger matches"),
            },
            {
              value: "first-match-only",
              label: t("Run only the first time per submission"),
            },
          ]}
          value={editing.trigger?.repeatPolicy ?? "always"}
          onChange={(value) =>
            setEditing({
              ...editing,
              trigger: {
                ...editing.trigger,
                repeatPolicy:
                  value === "first-match-only" ? "first-match-only" : "always",
              },
            })
          }
          comboboxProps={comboboxProps}
        />
        <ConditionBuilder
          conditions={conditions}
          onChange={setConditions}
          forms={formsQuery.data?.items ?? []}
        />
        <StepBuilder
          steps={steps}
          onChange={setSteps}
          templates={templatesQuery.data?.items ?? []}
          webhooks={webhookQuery.data?.items ?? []}
        />
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setShowJsonView(!showJsonView)}
        >
          {showJsonView ? t("Hide") : t("Show")} {t("JSON view")}
        </Button>
        <Collapse in={showJsonView}>
          <Card withBorder>
            <Title order={5} mb="sm">
              {t("Current workflow payload")}
            </Title>
            <JsonBlock
              value={{
                ...editing,
                trigger: { ...editing.trigger, conditions },
                steps,
              }}
            />
          </Card>
        </Collapse>
        <Group>
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            {t("Save workflow")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
