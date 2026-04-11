import dagre from "dagre";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  Edge,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  type NodeChange,
  useEdgesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Autocomplete,
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconArrowsMaximize,
  IconBrain,
  IconClockHour4,
  IconCloud,
  IconDeviceFloppy,
  IconEdit,
  IconFocusCentered,
  IconLayoutGrid,
  IconMail,
  IconMinimize,
  IconPlus,
  IconTrash,
  IconWebhook,
  IconX,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { Connection } from "@xyflow/react";
import type { FlowBackendClient } from "../api/backend-client";
import type {
  BootConfig,
  EmailTemplate,
  ProcessConnection,
  ProcessDraftEdge,
  ProcessDraftLinkedEntity,
  ProcessDraftStepActionType,
  ProcessDraftStepNode,
  ProcessEventConnection,
  ProcessLogicalConnection,
  ProcessMap,
  WebhookEndpoint,
  Workflow,
  WorkflowStep,
} from "../api/types";
import { t } from "../operations/i18n";
import { useOperationsComboboxProps } from "./OperationsPortalContext";
import StepBuilder from "./StepBuilder";
import TemplateEditorModal from "./TemplateEditorModal";
import WebhookEditorModal from "./WebhookEditorModal";
import WorkflowEditorModal from "./WorkflowEditorModal";

interface WorkflowNodeData extends Record<string, unknown> {
  nodeKind: "workflow";
  workflowId: string;
  name: string;
  triggerEventType: string;
  stepCount: number;
  enabled: boolean;
}

interface StepNodeData extends Record<string, unknown> {
  nodeKind: "step";
  stepId: string;
  parentWorkflowId: string;
  actionType: ProcessDraftStepActionType;
  name: string;
  config: Record<string, unknown>;
  linkedEntity?: ProcessDraftLinkedEntity;
  order?: number;
}

type CanvasNodeData = WorkflowNodeData | StepNodeData;

interface WorkflowConnectionEdgeData extends Record<string, unknown> {
  edgeKind: "workflow-connection";
  connectionType: ProcessConnection["type"];
  eventName?: string;
  label?: string;
  filter?: Record<string, unknown>;
}

interface WorkflowStepEdgeData extends Record<string, unknown> {
  edgeKind: "workflow-step";
}

interface AiBranchEdgeData extends Record<string, unknown> {
  edgeKind: "step-trigger";
  branchKey: string;
  label?: string;
  triggerEvent?: string;
  sourceActionType?: ProcessDraftStepActionType;
}

type CanvasEdgeData =
  | WorkflowConnectionEdgeData
  | WorkflowStepEdgeData
  | AiBranchEdgeData;

type StepEntityType = ProcessDraftLinkedEntity["entityType"];

interface StepActionDef {
  value: ProcessDraftStepActionType;
  label: string;
  icon?: typeof IconMail;
  color: string;
  entityType?: StepEntityType;
  canTriggerWorkflow?: boolean;
}

const STEP_ACTIONS: StepActionDef[] = [
  {
    value: "email.send",
    label: "Send Email",
    icon: IconMail,
    color: "grape",
    entityType: "template",
  },
  {
    value: "webhook.call",
    label: "Call Webhook",
    icon: IconWebhook,
    color: "cyan",
    entityType: "webhook",
  },
  {
    value: "ai.agent",
    label: "AI Agent",
    icon: IconBrain,
    color: "orange",
    canTriggerWorkflow: true,
  },
  {
    value: "eventbridge.event",
    label: "EventBridge Event",
    icon: IconCloud,
    color: "indigo",
  },
  {
    value: "status.update",
    label: "Update Status",
    color: "teal",
    canTriggerWorkflow: true,
  },
  {
    value: "delay",
    label: "Delay / Wait",
    icon: IconClockHour4,
    color: "gray",
  },
];

const STEP_TRIGGER_BRANCH_SUGGESTIONS = [
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "route:support", label: "route:support" },
  { value: "route:sales", label: "route:sales" },
  {
    value: "outcome:invoke_webhook:support_ticket",
    label: "outcome:invoke_webhook:support_ticket",
  },
  {
    value: "signal:priority:high",
    label: "signal:priority:high",
  },
];

const GENERIC_NEW_WORKFLOW_TRIGGERS = [
  "submission.created",
  "submission.action-invoked",
  "integration.webhook.requested",
];

const AI_TRIGGER_OPTIONS = ["ai.agent.completed", "ai.agent.failed"];
const STATUS_TRIGGER_OPTIONS = ["submission.updated"];

function normalizeStepTriggerEvent(
  sourceActionType: ProcessDraftStepActionType | undefined,
  branchKey: string | undefined,
  triggerEvent?: string,
): string {
  const normalizedBranchKey = branchKey?.trim();
  const normalizedTriggerEvent = triggerEvent?.trim();

  if (
    sourceActionType === "status.update" ||
    normalizedBranchKey === "submission.updated"
  ) {
    return "submission.updated";
  }

  if (normalizedBranchKey === "failed") {
    return "ai.agent.failed";
  }

  if (
    normalizedBranchKey === "completed" ||
    normalizedBranchKey?.startsWith("route:") ||
    normalizedBranchKey?.startsWith("outcome:") ||
    normalizedBranchKey?.startsWith("signal:")
  ) {
    return "ai.agent.completed";
  }

  return normalizedTriggerEvent || "ai.agent.completed";
}

function getAllowedStepTriggerEvents(
  sourceActionType: ProcessDraftStepActionType | undefined,
  branchKey: string | undefined,
): string[] {
  return [normalizeStepTriggerEvent(sourceActionType, branchKey)];
}

function stringifyConnectionFilter(
  filter: Record<string, unknown> | undefined,
) {
  return filter ? JSON.stringify(filter, null, 2) : "";
}

interface ProcessMapActionsCtxValue {
  onEditWorkflow: (workflowId: string) => void;
  onAddStep: (workflowId: string) => void;
  onAddTriggeredWorkflow: (stepNodeId: string) => void;
  onEditLinkedEntity: (stepNodeId: string) => void;
}

const ProcessMapActionsCtx = createContext<ProcessMapActionsCtxValue>({
  onEditWorkflow: () => {},
  onAddStep: () => {},
  onAddTriggeredWorkflow: () => {},
  onEditLinkedEntity: () => {},
});

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStepNodeId(stepId: string): string {
  return `step:${stepId}`;
}

function getStepActionDef(actionType: string): StepActionDef {
  return (
    STEP_ACTIONS.find((item) => item.value === actionType) ?? {
      value: "status.update",
      label: actionType,
      color: "gray",
    }
  );
}

function getStepActionLabel(actionType: string): string {
  return t(getStepActionDef(actionType).label);
}

function getStepDefaultName(actionType: ProcessDraftStepActionType): string {
  return getStepActionLabel(actionType);
}

function getDefaultAiAgentText(mode = "answer"): string {
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

function getDefaultStepConfig(
  actionType: ProcessDraftStepActionType,
): Record<string, unknown> {
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
      return {
        mode: "answer",
        text: getDefaultAiAgentText(),
      };
    case "eventbridge.event":
      return {
        source: "smartcloud.flow",
      };
    case "status.update":
      return {
        status: "in-progress",
      };
    case "delay":
      return {
        duration: "15m",
      };
    default:
      return {};
  }
}

function normalizeImportedStepConfig(
  actionType: ProcessDraftStepActionType,
  rawConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const config = { ...(rawConfig ?? {}) };

  if (actionType === "ai.agent") {
    const mode =
      typeof config.mode === "string" && config.mode.trim()
        ? config.mode.trim()
        : "answer";

    if (!String(config.text ?? "").trim()) {
      config.mode = mode;
      config.text = getDefaultAiAgentText(mode);
    }
  }

  return config;
}

function isWorkflowNode(
  node: Node | null | undefined,
): node is Node<WorkflowNodeData> {
  return Boolean(node && node.type === "workflow");
}

function isStepNode(node: Node | null | undefined): node is Node<StepNodeData> {
  return Boolean(node && node.type === "step");
}

function slugifyKeyPart(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function ensureUniqueKey(base: string, existingKeys: string[]): string {
  const normalizedBase = slugifyKeyPart(base, "item");
  const seen = new Set(existingKeys.filter(Boolean));
  if (!seen.has(normalizedBase)) {
    return normalizedBase;
  }

  let index = 2;
  while (seen.has(`${normalizedBase}-${index}`)) {
    index += 1;
  }
  return `${normalizedBase}-${index}`;
}

function buildEmptyTemplate(
  boot: BootConfig,
  name: string,
  templateKey: string,
): EmailTemplate {
  return {
    templateKey,
    accountId: boot.accountId ?? "",
    siteId: boot.siteId ?? "",
    name,
    subject: name,
    htmlBody: "<p>Hello {{submission.fields.name}}</p>",
    textBody: "Hello {{submission.fields.name}}",
    templateEngine: "handlebars",
    enabled: true,
  };
}

function buildEmptyWebhook(
  boot: BootConfig,
  name: string,
  webhookKey: string,
): WebhookEndpoint {
  return {
    webhookKey,
    accountId: boot.accountId ?? "",
    siteId: boot.siteId ?? "",
    url: "",
    provider: "generic",
    name,
    description: "",
    enabled: true,
    method: "POST",
    signingMode: "none",
    headers: {},
  };
}

function getDefaultLinkedEntityName(
  actionType: ProcessDraftStepActionType,
  stepName: string,
  entityType: "template" | "webhook",
): string {
  return `${stepName || getStepActionLabel(actionType)} ${
    entityType === "template" ? "Template" : "Webhook"
  }`;
}

function deriveLinkedEntityFromConfig(
  actionType: ProcessDraftStepActionType,
  config: Record<string, unknown>,
  currentLinkedEntity?: ProcessDraftLinkedEntity,
): ProcessDraftLinkedEntity | undefined {
  if (actionType === "email.send") {
    const templateKey = String(config.templateKey ?? "").trim();
    if (templateKey) {
      return {
        entityType: "template",
        mode: "existing",
        key: templateKey,
      };
    }
    return currentLinkedEntity?.entityType === "template"
      ? currentLinkedEntity
      : undefined;
  }

  if (actionType === "webhook.call") {
    const webhookKey = String(config.webhookKey ?? "").trim();
    if (webhookKey) {
      return {
        entityType: "webhook",
        mode: "existing",
        key: webhookKey,
      };
    }
    return currentLinkedEntity?.entityType === "webhook"
      ? currentLinkedEntity
      : undefined;
  }

  return undefined;
}

function workflowToNode(
  workflow: Workflow,
  x: number,
  y: number,
  layoutOverride?: { x: number; y: number },
): Node<WorkflowNodeData> {
  return {
    id: workflow.workflowId,
    type: "workflow",
    position: layoutOverride ?? { x, y },
    data: {
      nodeKind: "workflow",
      workflowId: workflow.workflowId,
      name: workflow.name,
      triggerEventType: workflow.trigger?.eventType ?? "—",
      stepCount: workflow.steps?.length ?? 0,
      enabled: Boolean(workflow.enabled),
    },
  };
}

function draftStepToNode(
  step: ProcessDraftStepNode,
  x: number,
  y: number,
  layoutOverride?: { x: number; y: number },
): Node<StepNodeData> {
  const normalizedConfig = normalizeImportedStepConfig(
    step.actionType,
    step.config,
  );

  return {
    id: getStepNodeId(step.stepId),
    type: "step",
    position: layoutOverride ?? { x, y },
    data: {
      nodeKind: "step",
      stepId: step.stepId,
      parentWorkflowId: step.parentWorkflowId,
      actionType: step.actionType,
      name: step.name,
      config: normalizedConfig,
      linkedEntity: step.linkedEntity,
      order: step.order,
    },
  };
}

function syncLinkedEntityNodes(sourceNodes: Node[]): Node[] {
  const baseNodes = sourceNodes;
  const stepCounts = new Map<string, number>();

  for (const node of baseNodes) {
    if (!isStepNode(node)) {
      continue;
    }
    stepCounts.set(
      node.data.parentWorkflowId,
      (stepCounts.get(node.data.parentWorkflowId) ?? 0) + 1,
    );
  }

  const countedNodes = baseNodes.map((node) => {
    if (!isWorkflowNode(node)) {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        stepCount: stepCounts.get(node.id) ?? 0,
      },
    };
  });

  return countedNodes;
}

function workflowStepToDraftStep(
  workflow: Workflow,
  step: WorkflowStep,
  index: number,
): ProcessDraftStepNode {
  const actionType =
    (step.actionType as ProcessDraftStepActionType | undefined) ??
    "status.update";
  const config = normalizeImportedStepConfig(
    actionType,
    (step.config ?? {}) as Record<string, unknown>,
  );
  const stepId = String(
    step.stepId ?? `${workflow.workflowId}-step-${index + 1}`,
  );

  let linkedEntity: ProcessDraftLinkedEntity | undefined;
  if (actionType === "email.send" && typeof config.templateKey === "string") {
    linkedEntity = {
      entityType: "template",
      mode: "existing",
      key: config.templateKey,
    };
  }
  if (actionType === "webhook.call" && typeof config.webhookKey === "string") {
    linkedEntity = {
      entityType: "webhook",
      mode: "existing",
      key: config.webhookKey,
    };
  }

  return {
    stepId,
    parentWorkflowId: workflow.workflowId,
    actionType,
    name: getStepActionLabel(actionType),
    config,
    linkedEntity,
    order: index,
  };
}

function materializeExecutableWorkflowStep(
  step: ProcessDraftStepNode,
): WorkflowStep | null {
  const config = {
    ...(step.config ?? {}),
    ...(step.linkedEntity?.entityType === "template" &&
    step.linkedEntity.mode === "existing"
      ? { templateKey: step.linkedEntity.key ?? "" }
      : {}),
    ...(step.linkedEntity?.entityType === "webhook" &&
    step.linkedEntity.mode === "existing"
      ? { webhookKey: step.linkedEntity.key ?? "" }
      : {}),
  } as Record<string, unknown>;

  switch (step.actionType) {
    case "email.send":
      if (!String(config.templateKey ?? "").trim()) {
        return null;
      }
      break;
    case "webhook.call":
      if (!String(config.webhookKey ?? "").trim()) {
        return null;
      }
      break;
    case "status.update":
      if (!String(config.status ?? "").trim()) {
        return null;
      }
      break;
    case "eventbridge.event":
      if (!String(config.detailType ?? "").trim()) {
        return null;
      }
      break;
    case "ai.agent":
      if (!String(config.text ?? "").trim()) {
        return null;
      }
      break;
    default:
      break;
  }

  return {
    stepId: step.stepId,
    actionType: step.actionType,
    config,
  };
}

function materializeWorkflowFromDraftSteps(
  workflow: Workflow,
  stepNodes: ProcessDraftStepNode[],
): Workflow {
  return {
    ...workflow,
    steps: stepNodes
      .filter((step) => step.parentWorkflowId === workflow.workflowId)
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .map(materializeExecutableWorkflowStep)
      .filter((step): step is WorkflowStep => Boolean(step)),
  };
}

function getBootstrapDraftSteps(workflows: Workflow[]): ProcessDraftStepNode[] {
  return workflows.flatMap((workflow) =>
    (workflow.steps ?? []).map((step, index) =>
      workflowStepToDraftStep(workflow, step, index),
    ),
  );
}

function getBootstrapDraftEdges(
  stepNodes: ProcessDraftStepNode[],
): ProcessDraftEdge[] {
  return stepNodes.map((step) => ({
    id: `edge:${step.parentWorkflowId}:${step.stepId}`,
    source: step.parentWorkflowId,
    target: getStepNodeId(step.stepId),
    kind: "workflow-step",
  }));
}

function mergeDraftStepNodes(
  workflows: Workflow[],
  storedDraftSteps: ProcessDraftStepNode[] | undefined,
  currentDraftSteps: ProcessDraftStepNode[] = [],
): ProcessDraftStepNode[] {
  const workflowIds = new Set(workflows.map((workflow) => workflow.workflowId));
  const merged = new Map<string, ProcessDraftStepNode>();

  for (const step of getBootstrapDraftSteps(workflows)) {
    merged.set(step.stepId, step);
  }

  for (const step of storedDraftSteps ?? []) {
    if (!workflowIds.has(step.parentWorkflowId)) continue;
    merged.set(step.stepId, step);
  }

  for (const step of currentDraftSteps) {
    if (!workflowIds.has(step.parentWorkflowId)) continue;
    merged.set(step.stepId, step);
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.parentWorkflowId !== right.parentWorkflowId) {
      return left.parentWorkflowId.localeCompare(right.parentWorkflowId);
    }
    return (left.order ?? 0) - (right.order ?? 0);
  });
}

function mergeDraftEdges(
  stepNodes: ProcessDraftStepNode[],
  preferredEdges: ProcessDraftEdge[] | undefined,
): ProcessDraftEdge[] {
  const merged = new Map<string, ProcessDraftEdge>();

  for (const edge of getBootstrapDraftEdges(stepNodes)) {
    merged.set(edge.id, edge);
  }

  for (const edge of preferredEdges ?? []) {
    merged.set(edge.id, edge);
  }

  return Array.from(merged.values());
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)]),
    );
  }

  return value;
}

function normalizeForDirtyCheck(map: ProcessMap): Record<string, unknown> {
  return {
    processMapId: map.processMapId ?? "",
    accountId: map.accountId ?? "",
    siteId: map.siteId ?? "",
    name: map.name ?? "",
    description: map.description ?? "",
    workflowIds: [...(map.workflowIds ?? [])].sort(),
    connections: [...(map.connections ?? [])]
      .map((connection) => normalizeJsonValue(connection))
      .sort((left, right) =>
        String((left as { id?: string }).id ?? "").localeCompare(
          String((right as { id?: string }).id ?? ""),
        ),
      ),
    layout: {
      nodes: Object.fromEntries(
        Object.entries(map.layout?.nodes ?? {})
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([nodeId, position]) => [nodeId, normalizeJsonValue(position)]),
      ),
    },
    metadata: {
      draftGraph: {
        stepNodes: [...(map.metadata?.draftGraph?.stepNodes ?? [])]
          .map((step) => normalizeJsonValue(step))
          .sort((left, right) =>
            String((left as { stepId?: string }).stepId ?? "").localeCompare(
              String((right as { stepId?: string }).stepId ?? ""),
            ),
          ),
        edges: [...(map.metadata?.draftGraph?.edges ?? [])]
          .map((edge) => normalizeJsonValue(edge))
          .sort((left, right) =>
            String((left as { id?: string }).id ?? "").localeCompare(
              String((right as { id?: string }).id ?? ""),
            ),
          ),
      },
    },
  };
}

function serializeProcessMap(map: ProcessMap): string {
  return JSON.stringify(normalizeForDirtyCheck(map));
}

function connectionToEdge(c: ProcessConnection): Edge<CanvasEdgeData> {
  return {
    id: c.id,
    source: c.sourceWorkflowId,
    target: c.targetWorkflowId,
    label: c.type === "event" ? c.eventName : c.label ?? "",
    type: "smoothstep",
    animated: c.type === "event",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke:
        c.type === "event"
          ? "var(--mantine-color-blue-5)"
          : "var(--mantine-color-gray-5)",
    },
    data: {
      edgeKind: "workflow-connection",
      connectionType: c.type,
      eventName: c.type === "event" ? c.eventName : undefined,
      label: c.type === "logical" ? c.label : undefined,
      filter: c.type === "event" ? c.filter : undefined,
    },
  };
}

function draftEdgeToEdge(edge: ProcessDraftEdge): Edge<CanvasEdgeData> {
  if (edge.kind === "step-trigger") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      label: edge.label || edge.branchKey || "completed",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: "var(--mantine-color-orange-5)",
        strokeDasharray: "6 4",
      },
      data: {
        edgeKind: "step-trigger",
        branchKey: edge.branchKey ?? "completed",
        label: edge.label,
        triggerEvent: edge.triggerEvent,
        sourceActionType: edge.sourceActionType,
      },
    };
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: "var(--mantine-color-gray-4)",
      strokeDasharray: "4 4",
    },
    data: { edgeKind: "workflow-step" },
  };
}

function edgeToConnection(
  edge: Edge<CanvasEdgeData>,
  id: string,
): ProcessConnection {
  const data = (edge.data ?? {}) as CanvasEdgeData;
  if (
    data.edgeKind === "workflow-connection" &&
    data.connectionType === "event"
  ) {
    return {
      id,
      type: "event",
      sourceWorkflowId: edge.source,
      targetWorkflowId: edge.target,
      eventName: String(data.eventName ?? "workflow.completed"),
      filter: data.filter,
    };
  }

  return {
    id,
    type: "logical",
    sourceWorkflowId: edge.source,
    targetWorkflowId: edge.target,
    label:
      data.edgeKind === "workflow-connection" ? String(data.label ?? "") : "",
  };
}

function edgeToDraftEdge(edge: Edge<CanvasEdgeData>): ProcessDraftEdge | null {
  const data = (edge.data ?? {}) as CanvasEdgeData;
  if (data.edgeKind === "workflow-step") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: "workflow-step",
    };
  }
  if (data.edgeKind === "step-trigger") {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: "step-trigger",
      label: data.label,
      branchKey: data.branchKey,
      triggerEvent: data.triggerEvent,
      sourceActionType: data.sourceActionType,
    };
  }
  return null;
}

function serializeDetailedStepDraft(
  step: Pick<
    ProcessDraftStepNode,
    "name" | "actionType" | "config" | "linkedEntity"
  > | null,
): string {
  if (!step) {
    return "";
  }

  return JSON.stringify({
    name: step.name,
    actionType: step.actionType,
    config: step.config ?? {},
    linkedEntity: step.linkedEntity ?? null,
  });
}

function cloneDetailedStepDraft(
  step: ProcessDraftStepNode | null,
): ProcessDraftStepNode | null {
  if (!step) {
    return null;
  }

  return {
    ...step,
    config: { ...(step.config ?? {}) },
    linkedEntity: step.linkedEntity ? { ...step.linkedEntity } : undefined,
  };
}

function nodeToDraftStep(node: Node<StepNodeData>): ProcessDraftStepNode {
  return {
    stepId: node.data.stepId,
    parentWorkflowId: node.data.parentWorkflowId,
    actionType: node.data.actionType,
    name: node.data.name,
    config: node.data.config,
    linkedEntity: node.data.linkedEntity,
    order: node.data.order,
  };
}

function computeGraphLayout(nodes: Node[], edges: Edge[]): Node[] {
  const baseNodes = nodes;
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "LR",
    nodesep: 36,
    ranksep: 90,
    marginx: 12,
    marginy: 12,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  baseNodes.forEach((node) => {
    const width = node.type === "step" ? 220 : 240;
    const height = node.type === "step" ? 88 : 108;
    graph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return syncLinkedEntityNodes(
    baseNodes.map((node) => {
      const layoutNode = graph.node(node.id);
      const width = node.type === "step" ? 220 : 240;
      const height = node.type === "step" ? 88 : 108;
      return {
        ...node,
        position: {
          x: (layoutNode?.x ?? 0) - width / 2,
          y: (layoutNode?.y ?? 0) - height / 2,
        },
      };
    }),
  );
}

function gridPosition(index: number, total: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(total)) || 1;
  return { x: (index % cols) * 300, y: Math.floor(index / cols) * 220 };
}

function WorkflowNode({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const ctx = useContext(ProcessMapActionsCtx);

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <Group gap={6}>
          <Button
            size="xs"
            variant="filled"
            color="blue"
            leftSection={<IconEdit size={12} />}
            className="nopan"
            onClick={(e) => {
              e.stopPropagation();
              ctx.onEditWorkflow(d.workflowId);
            }}
          >
            {t("Edit workflow")}
          </Button>
          <Button
            size="xs"
            variant="light"
            color="indigo"
            leftSection={<IconPlus size={12} />}
            className="nopan"
            onClick={(e) => {
              e.stopPropagation();
              ctx.onAddStep(d.workflowId);
            }}
          >
            {t("Add step")}
          </Button>
        </Group>
      </NodeToolbar>

      <Box
        style={{
          background: "var(--mantine-color-white)",
          border: `2px solid ${
            selected
              ? "var(--mantine-color-blue-6)"
              : "var(--mantine-color-gray-3)"
          }`,
          borderRadius: "var(--mantine-radius-md)",
          padding: "12px 16px",
          minWidth: 220,
          position: "relative",
          boxShadow: selected
            ? "0 0 0 3px var(--mantine-color-blue-1)"
            : "0 1px 4px rgba(0,0,0,0.1)",
          cursor: "default",
        }}
        onDoubleClick={() => ctx.onEditWorkflow(d.workflowId)}
      >
        <Handle type="target" position={Position.Left} />
        <Stack gap={4}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} size="sm" truncate>
              {d.name}
            </Text>
            <Badge
              size="xs"
              color={d.enabled ? "green" : "gray"}
              variant="light"
            >
              {d.enabled ? t("On") : t("Off")}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {d.triggerEventType}
          </Text>
          <Text size="xs" c="dimmed">
            {d.stepCount} {t("step(s)")}
          </Text>
        </Stack>
        <Handle type="source" position={Position.Right} />
      </Box>
    </>
  );
}

function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as StepNodeData;
  const ctx = useContext(ProcessMapActionsCtx);
  const def = getStepActionDef(d.actionType);
  const Icon = def.icon;
  const linkedLabel =
    d.linkedEntity?.mode === "existing"
      ? d.linkedEntity.key
      : d.linkedEntity?.name;

  return (
    <>
      {def.canTriggerWorkflow ? (
        <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
          <Button
            size="xs"
            variant="light"
            color="orange"
            leftSection={<IconPlus size={12} />}
            className="nopan"
            onClick={(e) => {
              e.stopPropagation();
              ctx.onAddTriggeredWorkflow(getStepNodeId(d.stepId));
            }}
          >
            {t("Add triggered workflow")}
          </Button>
        </NodeToolbar>
      ) : null}
      <Box
        style={{
          background: "var(--mantine-color-white)",
          border: `1px solid var(--mantine-color-${def.color}-5)`,
          borderLeft: `6px solid var(--mantine-color-${def.color}-6)`,
          borderRadius: "var(--mantine-radius-md)",
          padding: "10px 12px",
          minWidth: 200,
          position: "relative",
          boxShadow: selected
            ? "0 0 0 3px var(--mantine-color-gray-1)"
            : "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <Handle type="target" position={Position.Left} />
        <Stack gap={3}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              {Icon ? <Icon size={15} /> : null}
              <Text fw={600} size="sm" truncate>
                {d.name || getStepActionLabel(d.actionType)}
              </Text>
            </Group>
            <Badge size="xs" color={def.color} variant="light">
              {getStepActionLabel(d.actionType)}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {t("Step for workflow")}: {d.parentWorkflowId}
          </Text>
          {linkedLabel ? (
            <Text size="xs" c="dimmed" truncate>
              {d.linkedEntity?.entityType === "template"
                ? t("Template")
                : t("Webhook")}
              : {linkedLabel}
            </Text>
          ) : null}
        </Stack>
        {def.canTriggerWorkflow ? (
          <Handle type="source" position={Position.Right} />
        ) : null}
      </Box>
    </>
  );
}

const nodeTypes = {
  workflow: WorkflowNode,
  step: StepNode,
};

interface PendingConnection {
  source: string;
  target: string;
}

interface PendingAiBranch {
  source: string;
  target: string;
  sourceActionType: ProcessDraftStepActionType;
  sourceConfig?: Record<string, unknown>;
}

interface BranchSuggestionOption {
  value: string;
  label: string;
}

function createOutcomeBranchSuggestion(
  outcomeType: string,
): BranchSuggestionOption {
  return {
    value: `outcome:${outcomeType}:`,
    label: `outcome:${outcomeType}:<key>`,
  };
}

function createSignalBranchSuggestion(
  signalKey: string,
): BranchSuggestionOption {
  return {
    value: `signal:${signalKey}:`,
    label: `signal:${signalKey}:<value>`,
  };
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

function parseSchemaObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getSchemaProperty(
  schema: Record<string, unknown> | null,
  path: string[],
): Record<string, unknown> | null {
  let current: Record<string, unknown> | null = schema;
  for (const segment of path) {
    if (!current) return null;
    const next = current[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      return null;
    }
    current = next as Record<string, unknown>;
  }
  return current;
}

function getStringEnumValues(node: Record<string, unknown> | null): string[] {
  const values = Array.isArray(node?.enum) ? node.enum : [];
  return values.filter((value): value is string => typeof value === "string");
}

function getObjectPropertyKeys(node: Record<string, unknown> | null): string[] {
  const properties = node?.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return [];
  }
  return Object.keys(properties as Record<string, unknown>);
}

function dedupeBranchSuggestions(
  options: BranchSuggestionOption[],
): BranchSuggestionOption[] {
  const seen = new Set<string>();
  const deduped: BranchSuggestionOption[] = [];
  for (const option of options) {
    if (!option.value || seen.has(option.value)) continue;
    seen.add(option.value);
    deduped.push(option);
  }
  return deduped;
}

function getDefaultStepTriggerLabel(branchKey: string): string {
  return branchKey;
}

function getStepTriggerSuggestions(
  actionType: ProcessDraftStepActionType,
  config?: Record<string, unknown>,
): {
  options: BranchSuggestionOption[];
  defaultBranchKey: string;
  hint: string | null;
} {
  if (actionType === "status.update") {
    return {
      options: [
        { value: "submission.updated", label: t("Submission Updated") },
      ],
      defaultBranchKey: "submission.updated",
      hint: t(
        "Status update steps create submission.updated downstream triggers.",
      ),
    };
  }

  const fallback = dedupeBranchSuggestions(
    STEP_TRIGGER_BRANCH_SUGGESTIONS.map((item) => ({
      value: item.value,
      label: t(item.label),
    })),
  );

  if (actionType !== "ai.agent") {
    return {
      options: fallback,
      defaultBranchKey: "completed",
      hint: t(
        "Prefer stable generic keys such as route:*, outcome:*, or signal:* so downstream workflow edges do not depend on tenant-specific schema booleans.",
      ),
    };
  }

  const routingPreset = String(config?.routingPreset ?? "none");
  const schema = parseSchemaObject(config?.responseConstraint);
  const configuredRoutes = normalizeStringList(config?.routingRoutes).map(
    (value) => ({
      value: `route:${value}`,
      label: `route:${value}`,
    }),
  );
  const configuredOutcomeTypes = normalizeStringList(
    config?.routingOutcomeTypes,
  ).map((value) => createOutcomeBranchSuggestion(value));
  const configuredSignalKeys = normalizeStringList(
    config?.routingSignalKeys,
  ).map((value) => createSignalBranchSuggestion(value));
  const routeNode = getSchemaProperty(schema, [
    "properties",
    "routing",
    "properties",
    "route",
  ]);
  const routeEnums = getStringEnumValues(routeNode).map((value) => ({
    value: `route:${value}`,
    label: `route:${value}`,
  }));
  const signalKeys = getObjectPropertyKeys(
    getSchemaProperty(schema, [
      "properties",
      "routing",
      "properties",
      "signals",
    ]),
  ).map((value) => createSignalBranchSuggestion(value));
  const outcomeTypes = getStringEnumValues(
    getSchemaProperty(schema, [
      "properties",
      "routing",
      "properties",
      "outcomes",
      "items",
      "properties",
      "type",
    ]),
  ).map((value) => createOutcomeBranchSuggestion(value));

  const presetDefaults: BranchSuggestionOption[] =
    routingPreset === "route-by-category"
      ? [
          { value: "route:primary", label: "route:primary" },
          { value: "route:secondary", label: "route:secondary" },
          { value: "signal:priority:high", label: "signal:priority:high" },
        ]
      : routingPreset === "route-by-outcomes"
      ? [
          createOutcomeBranchSuggestion("invoke_webhook"),
          createOutcomeBranchSuggestion("invoke_workflow"),
          { value: "route:follow-up", label: "route:follow-up" },
        ]
      : routingPreset === "draft-reply-only"
      ? [{ value: "completed", label: "Completed" }]
      : [];

  const options = dedupeBranchSuggestions([
    { value: "completed", label: t("Completed") },
    { value: "failed", label: t("Failed") },
    ...configuredRoutes,
    ...configuredOutcomeTypes,
    ...configuredSignalKeys,
    ...routeEnums,
    ...outcomeTypes,
    ...signalKeys,
    ...presetDefaults,
    ...fallback,
  ]);

  const defaultBranchKey =
    configuredRoutes[0]?.value ?? routeEnums[0]?.value ?? "completed";
  const hint =
    routingPreset === "draft-reply-only"
      ? t(
          "This AI step is configured for draft replies. Use completed or failed unless you intentionally add custom downstream keys.",
        )
      : t(
          "Suggestions come from the AI routing preset and any enum-like hints in the response schema. Prefer route:*, outcome:*, or signal:* keys over tenant-specific booleans.",
        );

  return { options, defaultBranchKey, hint };
}

interface ConnectionModalProps {
  pending: PendingConnection | null;
  onConfirm: (conn: Omit<ProcessConnection, "id">) => void;
  onClose: () => void;
}

function ConnectionModal({
  pending,
  onConfirm,
  onClose,
}: ConnectionModalProps) {
  const comboboxProps = useOperationsComboboxProps(200010);
  const [connType, setConnType] = useState<"event" | "logical">("event");
  const [eventName, setEventName] = useState("");
  const [eventFilterText, setEventFilterText] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setConnType("event");
      setEventName("");
      setEventFilterText("");
      setLabel("");
    });
    return () => {
      cancelled = true;
    };
  }, [pending]);

  const handleConfirm = () => {
    if (!pending) return;
    if (connType === "event") {
      let filter: Record<string, unknown> | undefined;
      if (eventFilterText.trim()) {
        try {
          const parsed = JSON.parse(eventFilterText);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Filter must be a JSON object.");
          }
          filter = parsed as Record<string, unknown>;
        } catch (error) {
          notifications.show({
            color: "red",
            message:
              error instanceof Error
                ? error.message
                : t("Filter must be valid JSON object."),
          });
          return;
        }
      }
      const conn: Omit<ProcessEventConnection, "id"> = {
        type: "event",
        sourceWorkflowId: pending.source,
        targetWorkflowId: pending.target,
        eventName: eventName.trim() || "workflow.completed",
        filter,
      };
      onConfirm(conn);
      return;
    }
    const conn: Omit<ProcessLogicalConnection, "id"> = {
      type: "logical",
      sourceWorkflowId: pending.source,
      targetWorkflowId: pending.target,
      label: label.trim(),
    };
    onConfirm(conn);
  };

  return (
    <Modal
      opened={Boolean(pending)}
      onClose={onClose}
      title={t("Add connection")}
      zIndex={200000}
      size="sm"
    >
      <Stack>
        <Select
          label={t("Connection type")}
          data={[
            {
              value: "event",
              label: t("Event — workflow emits an event that triggers another"),
            },
            {
              value: "logical",
              label: t("Logical — visual grouping or sequential hint"),
            },
          ]}
          value={connType}
          onChange={(value) =>
            setConnType(value === "logical" ? "logical" : "event")
          }
          comboboxProps={comboboxProps}
        />
        {connType === "event" ? (
          <>
            <TextInput
              label={t("Event name")}
              value={eventName}
              onChange={(e) => setEventName(e.currentTarget.value)}
            />
            <Textarea
              label={t("Event filter JSON")}
              minRows={4}
              value={eventFilterText}
              onChange={(e) => setEventFilterText(e.currentTarget.value)}
              placeholder='{"status":"approved"}'
            />
          </>
        ) : (
          <TextInput
            label={t("Label")}
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleConfirm}>{t("Add")}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface StepSkeletonModalProps {
  opened: boolean;
  parentWorkflowId: string | null;
  templates: EmailTemplate[];
  webhooks: WebhookEndpoint[];
  onClose: () => void;
  onCreate: (step: ProcessDraftStepNode) => Promise<void>;
}

function StepSkeletonModal({
  opened,
  parentWorkflowId,
  templates,
  webhooks,
  onClose,
  onCreate,
}: StepSkeletonModalProps) {
  const comboboxProps = useOperationsComboboxProps(200011);
  const [actionType, setActionType] =
    useState<ProcessDraftStepActionType>("email.send");
  const [name, setName] = useState(getStepDefaultName("email.send"));
  const [entityMode, setEntityMode] = useState<"existing" | "draft">(
    "existing",
  );
  const [existingKey, setExistingKey] = useState("");
  const [draftName, setDraftName] = useState("");
  const [aiPrompt, setAiPrompt] = useState(getDefaultAiAgentText());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setActionType("email.send");
      setName(getStepDefaultName("email.send"));
      setEntityMode("existing");
      setExistingKey("");
      setDraftName("");
      setAiPrompt(getDefaultAiAgentText());
    });
    return () => {
      cancelled = true;
    };
  }, [opened]);

  const entityType = getStepActionDef(actionType).entityType;
  const entityOptions =
    entityType === "template"
      ? templates.map((item) => ({
          value: item.templateKey,
          label: item.name || item.templateKey,
        }))
      : webhooks.map((item) => ({
          value: item.webhookKey,
          label: item.name || item.webhookKey,
        }));

  const handleSubmit = async () => {
    if (!parentWorkflowId) return;
    const stepId = makeId("step");
    const config = getDefaultStepConfig(actionType);
    if (actionType === "ai.agent") {
      config.text = aiPrompt;
    }

    let linkedEntity: ProcessDraftLinkedEntity | undefined;
    if (entityType) {
      linkedEntity =
        entityMode === "existing"
          ? {
              entityType,
              mode: "existing",
              key: existingKey,
            }
          : {
              entityType,
              mode: "draft",
              draftId: makeId(entityType),
              name: draftName,
            };

      if (entityType === "template" && linkedEntity.mode === "existing") {
        config.templateKey = existingKey;
      }
      if (entityType === "webhook" && linkedEntity.mode === "existing") {
        config.webhookKey = existingKey;
      }
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        stepId,
        parentWorkflowId,
        actionType,
        name: name.trim() || getStepDefaultName(actionType),
        config,
        linkedEntity,
        order: 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Add step skeleton")}
      size="md"
      zIndex={200001}
    >
      <Stack>
        <Select
          label={t("Action type")}
          data={STEP_ACTIONS.map((item) => ({
            value: item.value,
            label: t(item.label),
          }))}
          value={actionType}
          onChange={(value) => {
            const next =
              (value as ProcessDraftStepActionType | null) ?? "email.send";
            setActionType(next);
            setName(getStepDefaultName(next));
            setAiPrompt(next === "ai.agent" ? getDefaultAiAgentText() : "");
          }}
          comboboxProps={comboboxProps}
        />
        <TextInput
          label={t("Step name")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        {actionType === "ai.agent" ? (
          <Textarea
            label={t("Prompt skeleton")}
            autosize
            minRows={3}
            placeholder={t(
              "Describe the baseline prompt this AI step should start from.",
            )}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.currentTarget.value)}
          />
        ) : null}
        {entityType ? (
          <>
            <Select
              label={
                entityType === "template"
                  ? t("Template source")
                  : t("Webhook source")
              }
              data={[
                { value: "existing", label: t("Attach existing") },
                { value: "draft", label: t("Create new") },
              ]}
              value={entityMode}
              onChange={(value) =>
                setEntityMode(value === "draft" ? "draft" : "existing")
              }
              comboboxProps={comboboxProps}
            />
            {entityMode === "existing" ? (
              <Select
                label={entityType === "template" ? t("Template") : t("Webhook")}
                data={entityOptions}
                value={existingKey}
                onChange={(value) => setExistingKey(value ?? "")}
                searchable
                comboboxProps={comboboxProps}
              />
            ) : (
              <TextInput
                label={
                  entityType === "template"
                    ? t("New template name")
                    : t("New webhook name")
                }
                placeholder={
                  entityType === "template"
                    ? t("Order confirmation email")
                    : t("CRM lead intake webhook")
                }
                value={draftName}
                onChange={(e) => setDraftName(e.currentTarget.value)}
              />
            )}
          </>
        ) : null}
        <Text size="xs" c="dimmed">
          {t(
            "Template and webhook steps can point to an existing linked entity or keep a draft reference until you explicitly save the template or webhook editor.",
          )}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={isSubmitting} onClick={() => void handleSubmit()}>
            {t("Create step")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface AiBranchModalProps {
  pending: PendingAiBranch | null;
  onClose: () => void;
  onConfirm: (branchKey: string, label: string, triggerEvent: string) => void;
}

function AiBranchModal({ pending, onClose, onConfirm }: AiBranchModalProps) {
  const comboboxProps = useOperationsComboboxProps(200012);
  const suggestions = getStepTriggerSuggestions(
    pending?.sourceActionType ?? "ai.agent",
    pending?.sourceConfig,
  );
  const [branchKey, setBranchKey] = useState(suggestions.defaultBranchKey);
  const [label, setLabel] = useState("");
  const isStatusUpdate = pending?.sourceActionType === "status.update";
  const branchOptions = suggestions.options;
  const triggerEvent = isStatusUpdate
    ? "submission.updated"
    : branchKey === "failed"
    ? "ai.agent.failed"
    : "ai.agent.completed";

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBranchKey(suggestions.defaultBranchKey);
      setLabel("");
    });
    return () => {
      cancelled = true;
    };
  }, [pending, suggestions.defaultBranchKey]);

  return (
    <Modal
      opened={Boolean(pending)}
      onClose={onClose}
      title={t("Add triggered workflow")}
      size="sm"
      zIndex={200000}
    >
      <Stack>
        <Autocomplete
          label={isStatusUpdate ? t("Trigger") : t("Branch key")}
          data={branchOptions}
          value={branchKey}
          onChange={(value) =>
            setBranchKey(
              value ?? (isStatusUpdate ? "submission.updated" : "completed"),
            )
          }
          comboboxProps={comboboxProps}
        />
        <TextInput
          label={t("Label")}
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          placeholder={t("Optional visible label on the branch")}
        />
        {suggestions.hint ? (
          <Text size="xs" c="dimmed">
            {suggestions.hint}
          </Text>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => onConfirm(branchKey, label, triggerEvent)}>
            {t("Add branch")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

type EdgeFieldUpdate =
  | { eventName: string }
  | { label: string }
  | { branchKey: string }
  | { triggerEvent: string }
  | { filter?: Record<string, unknown> };

interface DetailPanelProps {
  selected: Node | Edge | null;
  nodes: Node[];
  templates: EmailTemplate[];
  webhooks: WebhookEndpoint[];
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onUpdateEdge: (edgeId: string, update: EdgeFieldUpdate) => void;
  onEditWorkflow: (workflowId: string) => void;
  onUpdateStep: (nodeId: string, update: Partial<ProcessDraftStepNode>) => void;
  onOpenStepDetails: (nodeId: string) => void;
  onEditLinkedEntity: (stepNodeId: string) => void;
  onCreateLinkedEntityForStep: (stepNodeId: string) => void;
}

function DetailPanel({
  selected,
  nodes,
  templates,
  webhooks,
  onDeleteNode,
  onDeleteEdge,
  onUpdateEdge,
  onEditWorkflow,
  onUpdateStep,
  onOpenStepDetails,
  onEditLinkedEntity,
  onCreateLinkedEntityForStep,
}: DetailPanelProps) {
  const comboboxProps = useOperationsComboboxProps(200013);
  const [eventFilterText, setEventFilterText] = useState("");

  useEffect(() => {
    if (!selected || !("source" in selected)) {
      setEventFilterText("");
      return;
    }

    const edge = selected as Edge<CanvasEdgeData>;
    const data = (edge.data ?? {}) as CanvasEdgeData;
    if (
      data.edgeKind === "workflow-connection" &&
      data.connectionType === "event"
    ) {
      setEventFilterText(stringifyConnectionFilter(data.filter));
      return;
    }

    setEventFilterText("");
  }, [selected]);

  if (!selected) {
    return (
      <Card withBorder w={280} style={{ minHeight: 120 }}>
        <Text size="sm" c="dimmed">
          {t("Select a workflow, step, or connection to view its properties.")}
        </Text>
      </Card>
    );
  }

  const isEdge = "source" in selected;

  if (!isEdge) {
    const node = selected as unknown as Node<CanvasNodeData>;

    if (node.data.nodeKind === "workflow") {
      const d = node.data;
      return (
        <Card withBorder w={280}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Title order={6}>{t("Workflow")}</Title>
              <Group gap={4}>
                <ActionIcon
                  color="blue"
                  variant="subtle"
                  size="sm"
                  onClick={() => onEditWorkflow(node.id)}
                >
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  size="sm"
                  onClick={() => onDeleteNode(node.id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
            <Divider />
            <Text size="sm" fw={500}>
              {d.name}
            </Text>
            <Text size="xs" c="dimmed">
              {d.workflowId}
            </Text>
            <Text size="xs">
              {t("Trigger:")} {d.triggerEventType}
            </Text>
            <Text size="xs">
              {t("Steps:")} {d.stepCount}
            </Text>
            <Badge
              size="xs"
              color={d.enabled ? "green" : "gray"}
              variant="light"
              w="fit-content"
            >
              {d.enabled ? t("Enabled") : t("Disabled")}
            </Badge>
          </Stack>
        </Card>
      );
    }

    const d = node.data;
    const def = getStepActionDef(d.actionType);
    const entityType = def.entityType;
    const entityOptions =
      entityType === "template"
        ? templates.map((item) => ({
            value: item.templateKey,
            label: item.name || item.templateKey,
          }))
        : webhooks.map((item) => ({
            value: item.webhookKey,
            label: item.name || item.webhookKey,
          }));

    return (
      <Card withBorder w={280}>
        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={6}>{t("Step")}</Title>
            <Group gap={4}>
              <ActionIcon
                color="blue"
                variant="subtle"
                size="sm"
                onClick={() => onOpenStepDetails(node.id)}
              >
                <IconEdit size={14} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="subtle"
                size="sm"
                onClick={() => onDeleteNode(node.id)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>
          <Divider />
          <Select
            label={t("Action type")}
            data={STEP_ACTIONS.map((item) => ({
              value: item.value,
              label: t(item.label),
            }))}
            value={d.actionType}
            onChange={(value) => {
              const next =
                (value as ProcessDraftStepActionType | null) ?? d.actionType;
              const nextEntityType = getStepActionDef(next).entityType;
              const nextLinkedEntity = nextEntityType
                ? d.linkedEntity?.entityType === nextEntityType
                  ? d.linkedEntity
                  : undefined
                : undefined;
              onUpdateStep(node.id, {
                actionType: next,
                name: getStepActionLabel(next),
                config: getDefaultStepConfig(next),
                linkedEntity: nextLinkedEntity,
              });
            }}
            comboboxProps={comboboxProps}
          />
          <TextInput
            label={t("Name")}
            value={d.name}
            onChange={(e) =>
              onUpdateStep(node.id, { name: e.currentTarget.value })
            }
          />
          <Text size="xs" c="dimmed">
            {t("Parent workflow")}: {d.parentWorkflowId}
          </Text>
          {entityType ? (
            <>
              <Select
                label={entityType === "template" ? t("Template") : t("Webhook")}
                data={entityOptions}
                value={
                  d.linkedEntity?.mode === "existing"
                    ? d.linkedEntity.key ?? ""
                    : ""
                }
                searchable
                clearable
                comboboxProps={comboboxProps}
                onChange={(value) =>
                  onUpdateStep(node.id, {
                    linkedEntity: value
                      ? {
                          entityType,
                          mode: "existing",
                          key: value,
                        }
                      : undefined,
                    config: {
                      ...d.config,
                      ...(entityType === "template"
                        ? { templateKey: value ?? "" }
                        : { webhookKey: value ?? "" }),
                    },
                  })
                }
              />
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => onCreateLinkedEntityForStep(node.id)}
                >
                  {entityType === "template"
                    ? t("Create new template")
                    : t("Create new webhook")}
                </Button>
                {d.linkedEntity ? (
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => onEditLinkedEntity(node.id)}
                  >
                    {t("Edit")}
                  </Button>
                ) : null}
              </Group>
              {d.linkedEntity?.mode === "draft" ? (
                <Text size="xs" c="dimmed">
                  {t(
                    "This step references a not-yet-saved linked entity. It will only be created when you save the template or webhook editor.",
                  )}
                </Text>
              ) : null}
            </>
          ) : null}
          <Text size="xs" c="dimmed">
            {t(
              "This step belongs to the current process map. It is persisted inside the process map metadata and projected into workflow actions when the map is saved.",
            )}
          </Text>
        </Stack>
      </Card>
    );
  }

  const edge = selected as unknown as Edge<CanvasEdgeData>;
  const data = (edge.data ?? {}) as CanvasEdgeData;
  const sourceNode = nodes.find((node) => node.id === edge.source) ?? null;
  const stepTriggerSuggestions =
    data.edgeKind === "step-trigger" && isStepNode(sourceNode)
      ? getStepTriggerSuggestions(
          sourceNode.data.actionType,
          sourceNode.data.config,
        )
      : null;
  const resolvedTriggerEvent =
    data.edgeKind === "step-trigger"
      ? normalizeStepTriggerEvent(
          data.sourceActionType,
          data.branchKey,
          data.triggerEvent,
        )
      : undefined;
  const allowedTriggerEvents =
    data.edgeKind === "step-trigger"
      ? getAllowedStepTriggerEvents(data.sourceActionType, data.branchKey)
      : [];

  const handleApplyEventFilter = () => {
    if (
      data.edgeKind !== "workflow-connection" ||
      data.connectionType !== "event"
    ) {
      return;
    }

    try {
      const nextFilter = eventFilterText.trim()
        ? JSON.parse(eventFilterText)
        : undefined;
      if (
        nextFilter !== undefined &&
        (!nextFilter ||
          typeof nextFilter !== "object" ||
          Array.isArray(nextFilter))
      ) {
        throw new Error("Filter must be a JSON object.");
      }
      onUpdateEdge(edge.id, {
        filter: nextFilter as Record<string, unknown> | undefined,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message:
          error instanceof Error
            ? error.message
            : t("Filter must be valid JSON object."),
      });
    }
  };

  return (
    <Card withBorder w={280}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={6}>{t("Connection")}</Title>
          <ActionIcon
            color="red"
            variant="subtle"
            size="sm"
            onClick={() => onDeleteEdge(edge.id)}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
        <Divider />
        <Badge
          size="xs"
          color={
            data.edgeKind === "workflow-connection"
              ? data.connectionType === "event"
                ? "blue"
                : "gray"
              : data.edgeKind === "step-trigger"
              ? "orange"
              : "indigo"
          }
          variant="light"
          w="fit-content"
        >
          {data.edgeKind === "workflow-connection"
            ? data.connectionType === "event"
              ? t("Workflow event")
              : t("Workflow logical")
            : data.edgeKind === "step-trigger"
            ? t("Step trigger")
            : t("Workflow step")}
        </Badge>
        {data.edgeKind === "workflow-connection" &&
        data.connectionType === "event" ? (
          <>
            <TextInput
              label={t("Event name")}
              size="xs"
              value={data.eventName ?? ""}
              onChange={(e) =>
                onUpdateEdge(edge.id, { eventName: e.currentTarget.value })
              }
            />
            <Textarea
              label={t("Event filter JSON")}
              size="xs"
              minRows={5}
              value={eventFilterText}
              onChange={(e) => setEventFilterText(e.currentTarget.value)}
              placeholder='{"status":"approved"}'
            />
            <Group justify="space-between" gap="xs">
              <Button
                size="xs"
                variant="default"
                onClick={() =>
                  setEventFilterText(stringifyConnectionFilter(data.filter))
                }
              >
                {t("Reset")}
              </Button>
              <Button size="xs" onClick={handleApplyEventFilter}>
                {t("Apply filter")}
              </Button>
            </Group>
          </>
        ) : null}
        {data.edgeKind === "workflow-connection" &&
        data.connectionType === "logical" ? (
          <TextInput
            label={t("Label")}
            size="xs"
            value={data.label ?? ""}
            onChange={(e) =>
              onUpdateEdge(edge.id, { label: e.currentTarget.value })
            }
          />
        ) : null}
        {data.edgeKind === "step-trigger" ? (
          <>
            <Autocomplete
              label={t("Branch key")}
              size="xs"
              data={stepTriggerSuggestions?.options ?? []}
              value={data.branchKey}
              onChange={(value) =>
                onUpdateEdge(edge.id, {
                  branchKey:
                    value ??
                    stepTriggerSuggestions?.defaultBranchKey ??
                    "completed",
                })
              }
              comboboxProps={comboboxProps}
            />
            <Select
              label={t("Trigger event")}
              size="xs"
              data={allowedTriggerEvents.map((value) => ({
                value,
                label: value,
              }))}
              value={resolvedTriggerEvent}
              onChange={(value) =>
                onUpdateEdge(edge.id, {
                  triggerEvent: normalizeStepTriggerEvent(
                    data.sourceActionType,
                    data.branchKey,
                    value ?? resolvedTriggerEvent,
                  ),
                })
              }
              comboboxProps={comboboxProps}
              disabled={allowedTriggerEvents.length <= 1}
            />
            <TextInput
              label={t("Label")}
              size="xs"
              value={data.label ?? ""}
              onChange={(e) =>
                onUpdateEdge(edge.id, { label: e.currentTarget.value })
              }
            />
            <Text size="xs" c="dimmed">
              {t(
                "The target workflow will be scoped to the originating step behind this connection when the process map is saved.",
              )}
            </Text>
            {stepTriggerSuggestions?.hint ? (
              <Text size="xs" c="dimmed">
                {stepTriggerSuggestions.hint}
              </Text>
            ) : null}
          </>
        ) : null}
        {data.edgeKind === "workflow-step" ? (
          <Text size="xs" c="dimmed">
            {t("This edge attaches the step skeleton to its parent workflow.")}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

interface WorkflowPaletteProps {
  workflows: Workflow[];
  presentIds: Set<string>;
  onAdd: (workflow: Workflow) => void;
  onNew: () => void;
}

function WorkflowPalette({
  workflows,
  presentIds,
  onAdd,
  onNew,
}: WorkflowPaletteProps) {
  const available = workflows.filter(
    (workflow) => !presentIds.has(workflow.workflowId),
  );

  return (
    <Card withBorder w={220} style={{ maxHeight: 400, overflowY: "auto" }}>
      <Group justify="space-between" mb="xs">
        <Title order={6}>{t("Workflows")}</Title>
        <Tooltip label={t("Create new workflow")}>
          <ActionIcon size="xs" variant="filled" onClick={onNew}>
            <IconPlus size={12} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {available.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t("All workflows are already on the canvas.")}
        </Text>
      ) : (
        <Stack gap="xs">
          {available.map((workflow) => (
            <Group
              key={workflow.workflowId}
              justify="space-between"
              wrap="nowrap"
            >
              <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" fw={500} truncate>
                  {workflow.name}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {workflow.trigger?.eventType ?? "—"}
                </Text>
              </Stack>
              <Tooltip label={t("Add to canvas")}>
                <ActionIcon
                  size="xs"
                  variant="light"
                  onClick={() => onAdd(workflow)}
                >
                  <IconPlus size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}

interface ProcessMapHeaderProps {
  name: string;
  description: string;
  isDirty: boolean;
  onChange: (name: string, description: string) => void;
}

function ProcessMapHeader({
  name,
  description,
  isDirty,
  onChange,
}: ProcessMapHeaderProps) {
  return (
    <Group wrap="nowrap" gap="sm">
      <TextInput
        placeholder={t("Process map name")}
        value={name}
        onChange={(e) => onChange(e.currentTarget.value, description)}
        size="sm"
        style={{ flex: 1 }}
      />
      <TextInput
        placeholder={t("Description (optional)")}
        value={description}
        onChange={(e) => onChange(name, e.currentTarget.value)}
        size="sm"
        style={{ flex: 2 }}
      />
      <Badge color={isDirty ? "orange" : "gray"} variant="light">
        {isDirty ? t("Unsaved changes") : t("All changes saved")}
      </Badge>
    </Group>
  );
}

export interface ProcessMapCanvasProps {
  processMap: ProcessMap | null;
  workflows: Workflow[];
  onSave: (map: ProcessMap) => Promise<ProcessMap>;
  onCancel: () => void;
  boot: BootConfig;
  client: FlowBackendClient;
  isSaving?: boolean;
  onWorkflowSaved?: (workflow: Workflow, isNew: boolean) => void;
}

function ProcessMapCanvasInner({
  processMap,
  workflows,
  onSave,
  onCancel,
  boot,
  client,
  isSaving,
  onWorkflowSaved,
}: ProcessMapCanvasProps) {
  const PROCESS_MAP_FULLSCREEN_Z_INDEX = 100000;
  const PROCESS_MAP_SNAP_GRID: [number, number] = [20, 20];
  const { getNodes, getEdges, fitView } = useReactFlow();
  const queryClient = useQueryClient();
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const hasHandledInitialFullscreenFitRef = useRef(false);
  const sessionKey = processMap?.processMapId || "__new__";

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => client.listTemplates(),
  });
  const webhookQuery = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => client.listWebhookEndpoints(),
  });

  const templates = useMemo(
    () => templatesQuery.data?.items ?? [],
    [templatesQuery.data?.items],
  );
  const webhooks = useMemo(
    () => webhookQuery.data?.items ?? [],
    [webhookQuery.data?.items],
  );

  const [mapName, setMapName] = useState(processMap?.name ?? "");
  const [mapDescription, setMapDescription] = useState(
    processMap?.description ?? "",
  );
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<CanvasEdgeData>>(
    [],
  );
  const [pendingConnection, setPendingConnection] =
    useState<PendingConnection | null>(null);
  const [pendingAiBranch, setPendingAiBranch] =
    useState<PendingAiBranch | null>(null);

  const [wfModalOpened, setWfModalOpened] = useState(false);
  const [wfModalInitial, setWfModalInitial] = useState<Workflow | null>(null);
  const [stepModalOpened, setStepModalOpened] = useState(false);
  const [stepParentWorkflowId, setStepParentWorkflowId] = useState<
    string | null
  >(null);
  const [detailedStepEditorNodeId, setDetailedStepEditorNodeId] = useState<
    string | null
  >(null);
  const [detailedStepDraft, setDetailedStepDraft] =
    useState<ProcessDraftStepNode | null>(null);
  const [wfModalAllowedTriggers, setWfModalAllowedTriggers] = useState<
    string[] | undefined
  >(undefined);
  const [wfModalDefaultTrigger, setWfModalDefaultTrigger] = useState<
    string | undefined
  >(undefined);
  const [editingTemplate, setEditingTemplate] = useState<{
    stepNodeId: string;
    value: EmailTemplate;
    mode: "draft" | "existing";
  } | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<{
    stepNodeId: string;
    value: WebhookEndpoint;
    mode: "draft" | "existing";
  } | null>(null);
  const [wfModalManagedByProcessMap, setWfModalManagedByProcessMap] =
    useState(false);

  const pendingAiBranchSourceIdRef = useRef<string | null>(null);
  const sessionKeyRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSnapToGrid, setIsSnapToGrid] = useState(false);
  const [workflowOverrides, setWorkflowOverrides] = useState<
    Record<string, Workflow>
  >({});
  const [baselineSnapshot, setBaselineSnapshot] = useState("");

  const effectiveWorkflows = useMemo(() => {
    const merged = new Map<string, Workflow>();

    for (const workflow of workflows) {
      merged.set(workflow.workflowId, workflow);
    }

    for (const workflow of Object.values(workflowOverrides)) {
      merged.set(workflow.workflowId, workflow);
    }

    return Array.from(merged.values());
  }, [workflows, workflowOverrides]);

  const selectedNodes = useMemo(
    () => nodes.filter((node) => node.selected),
    [nodes],
  );
  const selectedEdges = useMemo(
    () => edges.filter((edge) => edge.selected),
    [edges],
  );
  const selectedNode =
    selectedNodes.length === 1 && selectedEdges.length === 0
      ? selectedNodes[0]
      : null;
  const selectedEdge =
    selectedEdges.length === 1 && selectedNodes.length === 0
      ? selectedEdges[0]
      : null;

  const syncWorkflowOverrideFromNodes = useCallback(
    (workflowId: string, sourceNodes: Node[]) => {
      const workflow = effectiveWorkflows.find(
        (item) => item.workflowId === workflowId,
      );
      if (!workflow) {
        return;
      }

      const draftSteps = sourceNodes
        .filter(isStepNode)
        .map((node) => nodeToDraftStep(node));

      setWorkflowOverrides((current) => ({
        ...current,
        [workflowId]: materializeWorkflowFromDraftSteps(workflow, draftSteps),
      }));
    },
    [effectiveWorkflows],
  );

  const getManagedTriggerConfigForWorkflow = useCallback(
    (workflowId: string) => {
      const incomingStepTriggerEdges = edges
        .map((edge) => ({
          edge,
          data: (edge.data ?? {}) as CanvasEdgeData,
        }))
        .filter(
          (
            item,
          ): item is {
            edge: Edge<CanvasEdgeData>;
            data: AiBranchEdgeData;
          } =>
            item.edge.target === workflowId &&
            item.data.edgeKind === "step-trigger",
        );

      if (incomingStepTriggerEdges.length === 0) {
        return null;
      }

      const hasStatusUpdateSource = incomingStepTriggerEdges.some(
        ({ data }) => data.sourceActionType === "status.update",
      );
      const derivedTriggerEvents = Array.from(
        new Set(
          incomingStepTriggerEdges
            .map(({ data }) =>
              normalizeStepTriggerEvent(
                data.sourceActionType,
                data.branchKey,
                data.triggerEvent,
              ),
            )
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const allowedTriggerEvents = hasStatusUpdateSource
        ? STATUS_TRIGGER_OPTIONS
        : AI_TRIGGER_OPTIONS;

      return {
        allowedTriggerEvents,
        defaultTriggerEvent: derivedTriggerEvents[0] ?? allowedTriggerEvents[0],
      };
    },
    [edges],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((existing) =>
        syncLinkedEntityNodes(applyNodeChanges(changes, existing)),
      );
    },
    [setNodes],
  );

  const updateStepLinkedEntity = useCallback(
    (
      stepNodeId: string,
      linkedEntity: ProcessDraftLinkedEntity | undefined,
      configPatch?: Record<string, unknown>,
    ) => {
      if (!stepNodeId) {
        return;
      }

      setNodes((existing) =>
        syncLinkedEntityNodes(
          existing.map((node) => {
            if (node.id !== stepNodeId || !isStepNode(node)) {
              return node;
            }

            return {
              ...node,
              data: {
                ...node.data,
                linkedEntity,
                config: configPatch
                  ? { ...node.data.config, ...configPatch }
                  : node.data.config,
              },
            };
          }),
        ),
      );
    },
    [setNodes],
  );

  const buildLinkedEntityDraftForStep = useCallback(
    (
      stepNodeOrStepId: string,
      preferredName?: string,
      providedStep?: ProcessDraftStepNode,
    ) => {
      const resolvedStepNodeId = stepNodeOrStepId.startsWith("step:")
        ? stepNodeOrStepId
        : getStepNodeId(stepNodeOrStepId);
      const stepNode =
        getNodes().find((node) => node.id === resolvedStepNodeId) ?? null;
      const stepSource = isStepNode(stepNode)
        ? stepNode.data
        : providedStep
        ? {
            stepId: providedStep.stepId,
            parentWorkflowId: providedStep.parentWorkflowId,
            actionType: providedStep.actionType,
            name: providedStep.name,
            config: providedStep.config ?? {},
            linkedEntity: providedStep.linkedEntity,
            order: providedStep.order,
          }
        : null;
      if (!stepSource) {
        return null;
      }

      const entityType = getStepActionDef(stepSource.actionType).entityType;
      if (!entityType) {
        return null;
      }

      const baseName =
        preferredName?.trim() ||
        stepSource.linkedEntity?.name?.trim() ||
        getDefaultLinkedEntityName(
          stepSource.actionType,
          stepSource.name,
          entityType,
        );

      if (entityType === "template") {
        const templateKey = ensureUniqueKey(
          baseName,
          templates.map((item) => item.templateKey),
        );
        return {
          entityType,
          entity: buildEmptyTemplate(boot, baseName, templateKey),
        } as const;
      }

      const webhookKey = ensureUniqueKey(
        baseName,
        webhooks.map((item) => item.webhookKey),
      );
      return {
        entityType,
        entity: buildEmptyWebhook(boot, baseName, webhookKey),
      } as const;
    },
    [getNodes, templates, webhooks, boot],
  );

  const openLinkedEntityEditor = useCallback(
    async (stepNodeOrStepId: string) => {
      const stepNodeId = stepNodeOrStepId.startsWith("step:")
        ? stepNodeOrStepId
        : getStepNodeId(stepNodeOrStepId);
      const stepNode =
        getNodes().find((node) => node.id === stepNodeId) ?? null;
      if (!isStepNode(stepNode)) {
        return;
      }

      const linkedEntity = stepNode.data.linkedEntity;
      const entityType = getStepActionDef(stepNode.data.actionType).entityType;
      if (!entityType) {
        return;
      }

      try {
        if (
          !linkedEntity ||
          linkedEntity.mode === "draft" ||
          !linkedEntity.key
        ) {
          const draft = buildLinkedEntityDraftForStep(
            stepNodeId,
            linkedEntity?.name,
          );
          if (!draft) {
            return;
          }
          if (draft.entityType === "template") {
            setEditingTemplate({
              stepNodeId,
              value: draft.entity,
              mode: "draft",
            });
          } else {
            setEditingWebhook({
              stepNodeId,
              value: draft.entity,
              mode: "draft",
            });
          }
          return;
        }

        if (entityType === "template") {
          const template = await client.getTemplate(linkedEntity.key);
          setEditingTemplate({
            stepNodeId,
            value: template,
            mode: "existing",
          });
          return;
        }

        const webhook = await client.getWebhookEndpoint(linkedEntity.key);
        setEditingWebhook({
          stepNodeId,
          value: webhook,
          mode: "existing",
        });
      } catch (error) {
        notifications.show({
          message:
            error instanceof Error
              ? error.message
              : t("Failed to load linked entity"),
          color: "red",
        });
      }
    },
    [getNodes, buildLinkedEntityDraftForStep, client],
  );

  const handleCreateLinkedEntityForStep = useCallback(
    (stepNodeId: string) => {
      try {
        const draft = buildLinkedEntityDraftForStep(stepNodeId);
        if (!draft) {
          notifications.show({
            message: t("This step type does not support linked entities."),
            color: "yellow",
          });
          return;
        }

        if (draft.entityType === "template") {
          setEditingTemplate({
            stepNodeId,
            value: draft.entity,
            mode: "draft",
          });
          return;
        }

        setEditingWebhook({
          stepNodeId,
          value: draft.entity,
          mode: "draft",
        });
      } catch (error) {
        notifications.show({
          message:
            error instanceof Error
              ? error.message
              : t("Failed to create linked entity"),
          color: "red",
        });
      }
    },
    [buildLinkedEntityDraftForStep],
  );

  const buildMapFromState = useCallback(
    (
      sourceNodes: Node[] = nodes,
      sourceEdges: Edge<CanvasEdgeData>[] = edges,
      name: string = mapName,
      description: string = mapDescription,
    ): ProcessMap => {
      const layoutNodes: ProcessMap["layout"]["nodes"] = {};

      sourceNodes
        .filter((node) => isWorkflowNode(node) || isStepNode(node))
        .forEach((node) => {
          layoutNodes[node.id] = {
            x: node.position.x,
            y: node.position.y,
          };
        });

      const workflowNodes = sourceNodes.filter(isWorkflowNode);
      const stepNodes = sourceNodes.filter(isStepNode);
      const localDraftWorkflowIds = new Set(Object.keys(workflowOverrides));
      const persistedWorkflows = workflowNodes
        .map(
          (node) =>
            effectiveWorkflows.find(
              (workflow) => workflow.workflowId === node.id,
            ) ?? null,
        )
        .filter((workflow): workflow is Workflow => Boolean(workflow));
      const persistedDraftSteps = mergeDraftStepNodes(
        persistedWorkflows,
        (processMap?.metadata?.draftGraph?.stepNodes ?? []).filter((step) =>
          localDraftWorkflowIds.has(step.parentWorkflowId),
        ),
        stepNodes
          .map((node) => nodeToDraftStep(node))
          .filter((step) => localDraftWorkflowIds.has(step.parentWorkflowId)),
      );
      const connections = sourceEdges
        .filter(
          (edge) =>
            ((edge.data ?? {}) as CanvasEdgeData).edgeKind ===
            "workflow-connection",
        )
        .map((edge) => edgeToConnection(edge, edge.id));
      const draftEdges = sourceEdges
        .map((edge) => edgeToDraftEdge(edge))
        .filter((edge): edge is ProcessDraftEdge => Boolean(edge));

      return {
        processMapId: processMap?.processMapId ?? "",
        accountId: boot.accountId ?? "",
        siteId: boot.siteId ?? "",
        name: name.trim() || t("Untitled map"),
        description: description.trim(),
        workflowIds: workflowNodes.map((node) => node.id),
        connections,
        layout: { nodes: layoutNodes },
        metadata: {
          ...processMap?.metadata,
          draftGraph: {
            stepNodes: persistedDraftSteps,
            edges: draftEdges,
          },
        },
      };
    },
    [
      nodes,
      edges,
      processMap,
      boot,
      mapName,
      mapDescription,
      workflowOverrides,
      effectiveWorkflows,
    ],
  );

  const currentSnapshot = useMemo(
    () => serializeProcessMap(buildMapFromState()),
    [buildMapFromState],
  );

  const isDirty =
    Boolean(baselineSnapshot) && currentSnapshot !== baselineSnapshot;

  useEffect(() => {
    const isSessionChanged = sessionKeyRef.current !== sessionKey;
    sessionKeyRef.current = sessionKey;
    const sessionWorkflowOverrides = isSessionChanged ? {} : workflowOverrides;
    const visibleWorkflowSource = isSessionChanged
      ? workflows
      : effectiveWorkflows;

    const existingLayoutNodes = processMap?.layout?.nodes ?? {};
    const visibleWorkflows = processMap
      ? visibleWorkflowSource.filter((workflow) =>
          processMap.workflowIds.includes(workflow.workflowId),
        )
      : [];

    const currentNodes = isSessionChanged ? [] : getNodes();
    const currentEdges = isSessionChanged
      ? ([] as Edge<CanvasEdgeData>[])
      : (getEdges() as Edge<CanvasEdgeData>[]);
    const currentLayoutNodes = Object.fromEntries(
      currentNodes.map((node) => [node.id, node.position]),
    );

    const initialWorkflowNodes: Node[] = visibleWorkflows.map(
      (workflow, index) =>
        workflowToNode(
          workflow,
          0,
          0,
          currentLayoutNodes[workflow.workflowId] ??
            existingLayoutNodes[workflow.workflowId] ??
            gridPosition(index, visibleWorkflows.length || 1),
        ),
    );

    const localDraftWorkflowIds = new Set(
      Object.keys(sessionWorkflowOverrides),
    );
    const storedDraftSteps = (
      processMap?.metadata?.draftGraph?.stepNodes ?? []
    ).filter((step) => localDraftWorkflowIds.has(step.parentWorkflowId));
    const currentDraftSteps = currentNodes
      .filter(isStepNode)
      .map((node) => nodeToDraftStep(node))
      .filter((step) => localDraftWorkflowIds.has(step.parentWorkflowId));
    const draftStepNodes = mergeDraftStepNodes(
      visibleWorkflows,
      storedDraftSteps,
      currentDraftSteps,
    );

    const initialStepNodes: Node[] = draftStepNodes.map((step, index) =>
      draftStepToNode(
        step,
        0,
        0,
        currentLayoutNodes[getStepNodeId(step.stepId)] ??
          existingLayoutNodes[getStepNodeId(step.stepId)] ?? {
            x: 340 + (index % 2) * 260,
            y: 80 + index * 110,
          },
      ),
    );

    const workflowConnections = isSessionChanged
      ? processMap?.connections ?? []
      : currentEdges
          .filter(
            (edge) =>
              ((edge.data ?? {}) as CanvasEdgeData).edgeKind ===
              "workflow-connection",
          )
          .map((edge) => edgeToConnection(edge, edge.id));
    const workflowEdges = workflowConnections.map(connectionToEdge);
    const preferredDraftEdges = isSessionChanged
      ? processMap?.metadata?.draftGraph?.edges
      : currentEdges
          .map((edge) => edgeToDraftEdge(edge))
          .filter((edge): edge is ProcessDraftEdge => Boolean(edge));
    const draftEdgesSource = mergeDraftEdges(
      draftStepNodes,
      preferredDraftEdges,
    );
    const draftEdges = draftEdgesSource.map(draftEdgeToEdge);
    const nextMap: ProcessMap = {
      processMapId: processMap?.processMapId ?? "",
      accountId: boot.accountId ?? "",
      siteId: boot.siteId ?? "",
      name: (processMap?.name ?? "").trim() || t("Untitled map"),
      description: (processMap?.description ?? "").trim(),
      workflowIds: initialWorkflowNodes.map((node) => node.id),
      connections: workflowConnections,
      layout: {
        nodes: Object.fromEntries(
          [...initialWorkflowNodes, ...initialStepNodes].map((node) => [
            node.id,
            {
              x: node.position.x,
              y: node.position.y,
            },
          ]),
        ),
      },
      metadata: {
        ...processMap?.metadata,
        draftGraph: {
          stepNodes: initialStepNodes
            .filter(isStepNode)
            .map((node) => nodeToDraftStep(node)),
          edges: draftEdgesSource,
        },
      },
    };

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (isSessionChanged) {
        setWorkflowOverrides({});
        setDetailedStepEditorNodeId(null);
        setDetailedStepDraft(null);
      }
      setMapName(processMap?.name ?? "");
      setMapDescription(processMap?.description ?? "");
      setNodes(
        syncLinkedEntityNodes([...initialWorkflowNodes, ...initialStepNodes]),
      );
      setEdges([...workflowEdges, ...draftEdges]);
      if (isSessionChanged) {
        setBaselineSnapshot(serializeProcessMap(nextMap));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    processMap,
    workflows,
    effectiveWorkflows,
    sessionKey,
    getNodes,
    getEdges,
    setNodes,
    setEdges,
    boot.accountId,
    boot.siteId,
    workflowOverrides,
  ]);

  const handleWorkflowConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    setPendingConnection({
      source: connection.source,
      target: connection.target,
    });
  }, []);

  const buildDetailedStepDraftForNodeId = useCallback(
    (nodeId: string): ProcessDraftStepNode | null => {
      const detailedStepNode = nodes.find((node) => node.id === nodeId) ?? null;
      if (!isStepNode(detailedStepNode)) {
        return null;
      }

      const detailedWorkflow =
        effectiveWorkflows.find(
          (workflow) =>
            workflow.workflowId === detailedStepNode.data.parentWorkflowId,
        ) ?? null;
      const workflowStepIndex = detailedWorkflow?.steps?.findIndex(
        (step) => step.stepId === detailedStepNode.data.stepId,
      );

      if (
        detailedWorkflow &&
        workflowStepIndex !== undefined &&
        workflowStepIndex >= 0
      ) {
        const workflowStep = detailedWorkflow.steps?.[workflowStepIndex];
        if (workflowStep) {
          const draftStep = workflowStepToDraftStep(
            detailedWorkflow,
            workflowStep,
            workflowStepIndex,
          );

          return {
            ...draftStep,
            name: detailedStepNode.data.name,
            linkedEntity:
              draftStep.linkedEntity ?? detailedStepNode.data.linkedEntity,
            order: detailedStepNode.data.order,
          };
        }
      }

      return nodeToDraftStep(detailedStepNode);
    },
    [nodes, effectiveWorkflows],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const currentNodes = getNodes();
      const sourceNode =
        currentNodes.find((node) => node.id === connection.source) ?? null;
      const targetNode =
        currentNodes.find((node) => node.id === connection.target) ?? null;

      if (isWorkflowNode(sourceNode) && isWorkflowNode(targetNode)) {
        handleWorkflowConnect(connection);
        return;
      }

      if (
        isStepNode(sourceNode) &&
        getStepActionDef(sourceNode.data.actionType).canTriggerWorkflow &&
        isWorkflowNode(targetNode)
      ) {
        setPendingAiBranch({
          source: sourceNode.id,
          target: targetNode.id,
          sourceActionType: sourceNode.data.actionType,
          sourceConfig: sourceNode.data.config,
        });
      }
    },
    [getNodes, handleWorkflowConnect],
  );

  const handleConnectEnd = useCallback(
    (_event: unknown, connectionState: unknown) => {
      const state = connectionState as {
        fromNode?: Node | null;
        toNode?: Node | null;
      };
      if (state?.toNode || !state?.fromNode) return;
      if (
        !isStepNode(state.fromNode) ||
        !getStepActionDef(state.fromNode.data.actionType).canTriggerWorkflow
      ) {
        return;
      }
      pendingAiBranchSourceIdRef.current = state.fromNode.id;
      setWfModalInitial(null);
      setWfModalManagedByProcessMap(true);
      setWfModalAllowedTriggers(
        state.fromNode.data.actionType === "status.update"
          ? STATUS_TRIGGER_OPTIONS
          : AI_TRIGGER_OPTIONS,
      );
      setWfModalDefaultTrigger(
        state.fromNode.data.actionType === "status.update"
          ? "submission.updated"
          : "ai.agent.completed",
      );
      setWfModalOpened(true);
    },
    [],
  );

  const handleConnectionConfirm = useCallback(
    (conn: Omit<ProcessConnection, "id">) => {
      const id = `conn-${Date.now()}`;
      const edge = connectionToEdge({ ...conn, id } as ProcessConnection);
      setEdges((current) => [...current, edge]);
      setPendingConnection(null);
    },
    [setEdges],
  );

  const handleAiBranchConfirm = useCallback(
    (branchKey: string, label: string, triggerEvent: string) => {
      if (!pendingAiBranch) return;
      const resolvedLabel =
        label.trim() || getDefaultStepTriggerLabel(branchKey);
      const edge = draftEdgeToEdge({
        id: makeId("step-trigger"),
        source: pendingAiBranch.source,
        target: pendingAiBranch.target,
        kind: "step-trigger",
        branchKey,
        label: resolvedLabel,
        triggerEvent,
        sourceActionType: pendingAiBranch.sourceActionType,
      });
      setEdges((current) => [...current, edge]);
      setPendingAiBranch(null);
    },
    [pendingAiBranch, setEdges],
  );

  const handleAddWorkflow = useCallback(
    (workflow: Workflow) => {
      const current = getNodes();
      const baseNodeCount = current.length;
      const pos = gridPosition(baseNodeCount, baseNodeCount + 1);
      const existingStepIds = new Set(
        current.filter(isStepNode).map((node) => node.data.stepId),
      );
      const workflowNode = workflowToNode(workflow, pos.x, pos.y);
      const missingStepDrafts = (workflow.steps ?? [])
        .map((step, index) => workflowStepToDraftStep(workflow, step, index))
        .filter((step) => !existingStepIds.has(step.stepId));

      setNodes((existing) =>
        syncLinkedEntityNodes([
          ...existing,
          workflowNode,
          ...missingStepDrafts.map((step, index) =>
            draftStepToNode(
              step,
              workflowNode.position.x + 320,
              workflowNode.position.y + index * 110,
            ),
          ),
        ]),
      );
      setEdges((existing) => [
        ...existing,
        ...missingStepDrafts.map((step) =>
          draftEdgeToEdge({
            id: `edge:${workflow.workflowId}:${step.stepId}`,
            source: workflow.workflowId,
            target: getStepNodeId(step.stepId),
            kind: "workflow-step",
          }),
        ),
      ]);
    },
    [getNodes, setNodes, setEdges],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const current = getNodes();
      const node = current.find((item) => item.id === nodeId) ?? null;

      const childStepIds = isWorkflowNode(node)
        ? current
            .filter(
              (item) =>
                isStepNode(item) && item.data.parentWorkflowId === node.id,
            )
            .map((item) => item.id)
        : [];
      const shouldCloseDetailedStepEditor =
        detailedStepEditorNodeId === nodeId ||
        childStepIds.includes(detailedStepEditorNodeId ?? "");

      setNodes((existing) =>
        syncLinkedEntityNodes(
          existing.filter(
            (item) => item.id !== nodeId && !childStepIds.includes(item.id),
          ),
        ),
      );
      setEdges((existing) =>
        existing.filter(
          (edge) =>
            edge.source !== nodeId &&
            edge.target !== nodeId &&
            !childStepIds.includes(edge.source) &&
            !childStepIds.includes(edge.target),
        ),
      );
      if (shouldCloseDetailedStepEditor) {
        setDetailedStepEditorNodeId(null);
        setDetailedStepDraft(null);
      }
    },
    [detailedStepEditorNodeId, getNodes, setNodes, setEdges],
  );

  const confirmDeleteNode = useCallback(
    (nodeId: string) => {
      const node = getNodes().find((item) => item.id === nodeId) ?? null;
      modals.openConfirmModal({
        title: isWorkflowNode(node)
          ? t("Delete workflow node")
          : t("Delete step"),
        children: (
          <Text size="sm">
            {isWorkflowNode(node)
              ? t(
                  "This will remove the workflow node and its attached steps from the current process map canvas.",
                )
              : t(
                  "This will remove the selected step from the current process map canvas.",
                )}
          </Text>
        ),
        labels: {
          confirm: t("Delete"),
          cancel: t("Cancel"),
        },
        confirmProps: { color: "red" },
        onConfirm: () => handleDeleteNode(nodeId),
      });
    },
    [getNodes, handleDeleteNode],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((existing) => existing.filter((edge) => edge.id !== edgeId));
    },
    [setEdges],
  );

  const confirmDeleteEdge = useCallback(
    (edgeId: string) => {
      modals.openConfirmModal({
        title: t("Delete connection"),
        children: (
          <Text size="sm">
            {t(
              "This will remove the selected connection from the current process map canvas.",
            )}
          </Text>
        ),
        labels: {
          confirm: t("Delete"),
          cancel: t("Cancel"),
        },
        confirmProps: { color: "red" },
        onConfirm: () => handleDeleteEdge(edgeId),
      });
    },
    [handleDeleteEdge],
  );

  const handleUpdateEdge = useCallback(
    (edgeId: string, update: EdgeFieldUpdate) => {
      setEdges((existing) =>
        existing.map((edge) => {
          if (edge.id !== edgeId) return edge;
          const data = (edge.data ?? {
            edgeKind: "workflow-step",
          }) as CanvasEdgeData;

          if (
            "eventName" in update &&
            data.edgeKind === "workflow-connection"
          ) {
            return {
              ...edge,
              label: update.eventName,
              data: { ...data, eventName: update.eventName },
            };
          }
          if ("filter" in update && data.edgeKind === "workflow-connection") {
            return {
              ...edge,
              data: { ...data, filter: update.filter },
            };
          }
          if ("branchKey" in update && data.edgeKind === "step-trigger") {
            const shouldSyncLabel =
              !data.label || data.label === data.branchKey;
            const nextTriggerEvent = normalizeStepTriggerEvent(
              data.sourceActionType,
              update.branchKey,
              data.triggerEvent,
            );
            return {
              ...edge,
              label: shouldSyncLabel
                ? getDefaultStepTriggerLabel(update.branchKey)
                : data.label,
              data: {
                ...data,
                branchKey: update.branchKey,
                triggerEvent: nextTriggerEvent,
              },
            };
          }
          if ("triggerEvent" in update && data.edgeKind === "step-trigger") {
            return {
              ...edge,
              data: {
                ...data,
                triggerEvent: normalizeStepTriggerEvent(
                  data.sourceActionType,
                  data.branchKey,
                  update.triggerEvent,
                ),
              },
            };
          }
          if ("label" in update) {
            return {
              ...edge,
              label: update.label,
              data: { ...data, label: update.label },
            };
          }
          return edge;
        }),
      );
    },
    [setEdges],
  );

  const handleUpdateStep = useCallback(
    (nodeId: string, update: Partial<ProcessDraftStepNode>) => {
      setNodes((existing) => {
        const nextNodes = syncLinkedEntityNodes(
          existing.map((node) => {
            if (node.id !== nodeId || !isStepNode(node)) return node;

            const nextActionType = update.actionType ?? node.data.actionType;
            const nextConfig = update.config ?? node.data.config;
            return {
              ...node,
              data: {
                ...node.data,
                ...update,
                actionType: nextActionType,
                config: nextConfig,
                linkedEntity:
                  update.linkedEntity !== undefined
                    ? update.linkedEntity
                    : deriveLinkedEntityFromConfig(
                        nextActionType,
                        nextConfig,
                        node.data.linkedEntity,
                      ),
              },
            };
          }),
        );

        const updatedStepNode = nextNodes.find(
          (node) => node.id === nodeId && isStepNode(node),
        );
        if (updatedStepNode && isStepNode(updatedStepNode)) {
          syncWorkflowOverrideFromNodes(
            updatedStepNode.data.parentWorkflowId,
            nextNodes,
          );
        }

        return nextNodes;
      });
    },
    [setNodes, syncWorkflowOverrideFromNodes],
  );

  const handleEditWorkflow = useCallback(
    (workflowId: string) => {
      const workflow =
        effectiveWorkflows.find((item) => item.workflowId === workflowId) ??
        null;
      const managedTriggerConfig =
        getManagedTriggerConfigForWorkflow(workflowId);
      pendingAiBranchSourceIdRef.current = null;
      setWfModalManagedByProcessMap(Boolean(managedTriggerConfig));
      setWfModalAllowedTriggers(managedTriggerConfig?.allowedTriggerEvents);
      setWfModalDefaultTrigger(managedTriggerConfig?.defaultTriggerEvent);
      setWfModalInitial(workflow);
      setWfModalOpened(true);
    },
    [effectiveWorkflows, getManagedTriggerConfigForWorkflow],
  );

  const handleOpenStepModal = useCallback((workflowId: string) => {
    setStepParentWorkflowId(workflowId);
    setStepModalOpened(true);
  }, []);

  const handleOpenDetailedStepEditor = useCallback(
    (nodeId: string) => {
      const nextDraft = buildDetailedStepDraftForNodeId(nodeId);
      if (!nextDraft) {
        return;
      }

      setDetailedStepEditorNodeId(nodeId);
      setDetailedStepDraft(cloneDetailedStepDraft(nextDraft));
    },
    [buildDetailedStepDraftForNodeId],
  );

  const handleCreateAiBranchWorkflow = useCallback(
    (stepNodeId: string) => {
      pendingAiBranchSourceIdRef.current = stepNodeId;
      const stepNode =
        getNodes().find((node) => node.id === stepNodeId) ?? null;
      const actionType = isStepNode(stepNode)
        ? stepNode.data.actionType
        : "ai.agent";
      setWfModalInitial(null);
      setWfModalManagedByProcessMap(true);
      setWfModalAllowedTriggers(
        actionType === "status.update"
          ? STATUS_TRIGGER_OPTIONS
          : AI_TRIGGER_OPTIONS,
      );
      setWfModalDefaultTrigger(
        actionType === "status.update"
          ? "submission.updated"
          : "ai.agent.completed",
      );
      setWfModalOpened(true);
    },
    [getNodes],
  );

  const handleNewWorkflow = useCallback(() => {
    pendingAiBranchSourceIdRef.current = null;
    setWfModalInitial(null);
    setWfModalManagedByProcessMap(false);
    setWfModalAllowedTriggers(GENERIC_NEW_WORKFLOW_TRIGGERS);
    setWfModalDefaultTrigger("submission.created");
    setWfModalOpened(true);
  }, []);

  const handleStepCreated = useCallback(
    async (step: ProcessDraftStepNode) => {
      const currentNodes = getNodes();
      const parentNode =
        currentNodes.find((node) => node.id === step.parentWorkflowId) ?? null;
      const siblings = currentNodes.filter(
        (node) =>
          isStepNode(node) &&
          node.data.parentWorkflowId === step.parentWorkflowId,
      );
      const baseNodeCount = currentNodes.length;
      const layout = parentNode
        ? {
            x: parentNode.position.x + 320,
            y: parentNode.position.y + siblings.length * 110,
          }
        : gridPosition(baseNodeCount, baseNodeCount + 1);

      const nextStep = { ...step, order: siblings.length };

      const stepNode = draftStepToNode(nextStep, layout.x, layout.y);
      const stepEdge = draftEdgeToEdge({
        id: makeId("workflow-step"),
        source: step.parentWorkflowId,
        target: stepNode.id,
        kind: "workflow-step",
      });

      setNodes((existing) => {
        const nextNodes = syncLinkedEntityNodes([...existing, stepNode]);
        syncWorkflowOverrideFromNodes(step.parentWorkflowId, nextNodes);
        return nextNodes;
      });
      setEdges((existing) => [...existing, stepEdge]);
      setStepModalOpened(false);
      setStepParentWorkflowId(null);
    },
    [getNodes, setNodes, setEdges, syncWorkflowOverrideFromNodes],
  );

  const handleWorkflowSaved = useCallback(
    (workflow: Workflow, isNew: boolean) => {
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setWorkflowOverrides((current) => ({
        ...current,
        [workflow.workflowId]: workflow,
      }));
      if (wfModalManagedByProcessMap) {
        const desiredTriggerEvent = String(workflow.trigger?.eventType ?? "");
        setEdges((existing) =>
          existing.map((edge) => {
            if (edge.target !== workflow.workflowId) {
              return edge;
            }

            const data = (edge.data ?? {}) as CanvasEdgeData;
            if (data.edgeKind !== "step-trigger") {
              return edge;
            }

            const nextBranchKey =
              data.sourceActionType === "status.update"
                ? "submission.updated"
                : desiredTriggerEvent === "ai.agent.failed"
                ? "failed"
                : data.branchKey === "failed"
                ? "completed"
                : data.branchKey;
            const nextTriggerEvent = normalizeStepTriggerEvent(
              data.sourceActionType,
              nextBranchKey,
              desiredTriggerEvent,
            );
            const shouldSyncLabel =
              !data.label ||
              data.label === data.branchKey ||
              data.label === getDefaultStepTriggerLabel(data.branchKey);
            const nextLabel = shouldSyncLabel
              ? getDefaultStepTriggerLabel(nextBranchKey)
              : data.label;

            return {
              ...edge,
              label: nextLabel,
              data: {
                ...data,
                branchKey: nextBranchKey,
                triggerEvent: nextTriggerEvent,
                label: nextLabel,
              },
            };
          }),
        );
      }
      const currentNodes = getNodes();
      const workflowStepDrafts = (workflow.steps ?? []).map((step, index) =>
        workflowStepToDraftStep(workflow, step, index),
      );
      const workflowStepDraftMap = new Map(
        workflowStepDrafts.map((step) => [step.stepId, step]),
      );
      const existingStepIds = new Set(
        currentNodes.filter(isStepNode).map((node) => node.data.stepId),
      );
      const missingStepDrafts = workflowStepDrafts.filter(
        (step) => !existingStepIds.has(step.stepId),
      );

      if (isNew) {
        const baseNodeCount = currentNodes.length;
        const pos = gridPosition(baseNodeCount, baseNodeCount + 1);
        const workflowNode = workflowToNode(workflow, pos.x, pos.y);
        setNodes((existing) =>
          syncLinkedEntityNodes([
            ...existing,
            workflowNode,
            ...missingStepDrafts.map((step, index) =>
              draftStepToNode(
                step,
                workflowNode.position.x + 320,
                workflowNode.position.y + index * 110,
              ),
            ),
          ]),
        );
        setEdges((existing) => [
          ...existing,
          ...missingStepDrafts.map((step) =>
            draftEdgeToEdge({
              id: `edge:${workflow.workflowId}:${step.stepId}`,
              source: workflow.workflowId,
              target: getStepNodeId(step.stepId),
              kind: "workflow-step",
            }),
          ),
        ]);

        const pendingSourceId = pendingAiBranchSourceIdRef.current;
        pendingAiBranchSourceIdRef.current = null;
        if (pendingSourceId) {
          const sourceNode =
            getNodes().find((node) => node.id === pendingSourceId) ?? null;
          setPendingAiBranch({
            source: pendingSourceId,
            target: workflow.workflowId,
            sourceActionType: isStepNode(sourceNode)
              ? sourceNode.data.actionType
              : "ai.agent",
            sourceConfig: isStepNode(sourceNode) ? sourceNode.data.config : {},
          });
        }
      } else {
        setNodes((existing) =>
          syncLinkedEntityNodes([
            ...existing.map((node) =>
              node.id === workflow.workflowId
                ? workflowToNode(workflow, node.position.x, node.position.y)
                : isStepNode(node) &&
                  node.data.parentWorkflowId === workflow.workflowId &&
                  workflowStepDraftMap.has(node.data.stepId)
                ? draftStepToNode(
                    {
                      ...workflowStepDraftMap.get(node.data.stepId)!,
                      name: node.data.name,
                      linkedEntity:
                        workflowStepDraftMap.get(node.data.stepId)
                          ?.linkedEntity ?? node.data.linkedEntity,
                      order:
                        workflowStepDraftMap.get(node.data.stepId)?.order ??
                        node.data.order,
                    },
                    node.position.x,
                    node.position.y,
                  )
                : node,
            ),
            ...missingStepDrafts.map((step, index) => {
              const workflowNode = existing.find(
                (node) => node.id === workflow.workflowId,
              );
              return draftStepToNode(
                step,
                (workflowNode?.position.x ?? 0) + 320,
                (workflowNode?.position.y ?? 0) + index * 110,
              );
            }),
          ]),
        );
        setEdges((existing) => [
          ...existing,
          ...missingStepDrafts.map((step) =>
            draftEdgeToEdge({
              id: `edge:${workflow.workflowId}:${step.stepId}`,
              source: workflow.workflowId,
              target: getStepNodeId(step.stepId),
              kind: "workflow-step",
            }),
          ),
        ]);
      }
      onWorkflowSaved?.(workflow, isNew);
    },
    [
      queryClient,
      getNodes,
      setNodes,
      setEdges,
      onWorkflowSaved,
      wfModalManagedByProcessMap,
    ],
  );

  const handleAutoLayout = useCallback(() => {
    setNodes((existingNodes) => computeGraphLayout(existingNodes, getEdges()));
  }, [setNodes, getEdges]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((current) => !current);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialogOpen = Boolean(
        document.querySelector(
          '[role="dialog"], [data-modal], .mantine-Modal-root',
        ),
      );
      const overlayOpen =
        Boolean(pendingConnection) ||
        Boolean(pendingAiBranch) ||
        stepModalOpened ||
        wfModalOpened ||
        Boolean(detailedStepEditorNodeId) ||
        Boolean(editingTemplate) ||
        Boolean(editingWebhook);

      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        overlayOpen ||
        dialogOpen
      ) {
        return;
      }

      setIsFullscreen(false);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    detailedStepEditorNodeId,
    editingTemplate,
    editingWebhook,
    isFullscreen,
    pendingAiBranch,
    pendingConnection,
    stepModalOpened,
    wfModalOpened,
  ]);

  useEffect(() => {
    if (!hasHandledInitialFullscreenFitRef.current) {
      hasHandledInitialFullscreenFitRef.current = true;
      return;
    }

    let frameA = 0;
    let frameB = 0;

    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        void fitView({ padding: 0.2, duration: 250 });
      });
    });

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
    };
  }, [fitView, isFullscreen]);

  const presentIds = new Set(
    nodes.filter(isWorkflowNode).map((node) => node.id),
  );

  const actionsCtxValue = useMemo(
    () => ({
      onEditWorkflow: handleEditWorkflow,
      onAddStep: handleOpenStepModal,
      onAddTriggeredWorkflow: handleCreateAiBranchWorkflow,
      onEditLinkedEntity: (stepNodeId: string) => {
        void openLinkedEntityEditor(stepNodeId);
      },
    }),
    [
      handleEditWorkflow,
      handleOpenStepModal,
      handleCreateAiBranchWorkflow,
      openLinkedEntityEditor,
    ],
  );

  const handleClose = useCallback(() => {
    if (!isDirty) {
      onCancel();
      return;
    }

    modals.openConfirmModal({
      title: t("Discard unsaved changes?"),
      children: (
        <Text size="sm">
          {t(
            "You have unsaved Process Map changes. Closing now will discard them.",
          )}
        </Text>
      ),
      labels: {
        confirm: t("Close without saving"),
        cancel: t("Keep editing"),
      },
      confirmProps: { color: "red" },
      onConfirm: onCancel,
    });
  }, [isDirty, onCancel]);

  const handleSave = useCallback(async () => {
    const nextMap = buildMapFromState();
    await onSave(nextMap);
    setBaselineSnapshot(serializeProcessMap(nextMap));
  }, [buildMapFromState, onSave]);

  const selected: Node | Edge | null = selectedNode ?? selectedEdge ?? null;
  const detailedStepNode = nodes.find(
    (node) => node.id === detailedStepEditorNodeId,
  );
  const activeDetailedStep = isStepNode(detailedStepNode)
    ? detailedStepNode
    : null;
  const activeDetailedStepDraft = useMemo(() => {
    if (!detailedStepEditorNodeId) {
      return null;
    }

    return buildDetailedStepDraftForNodeId(detailedStepEditorNodeId);
  }, [buildDetailedStepDraftForNodeId, detailedStepEditorNodeId]);
  const wfModalDefaultConditions = useMemo(
    () => (wfModalManagedByProcessMap ? [] : undefined),
    [wfModalManagedByProcessMap],
  );
  const activeDetailedStepDraftSignature = useMemo(
    () => serializeDetailedStepDraft(activeDetailedStepDraft),
    [activeDetailedStepDraft],
  );
  const detailedStepDraftSignature = useMemo(
    () => serializeDetailedStepDraft(detailedStepDraft),
    [detailedStepDraft],
  );
  const isDetailedStepDirty =
    Boolean(detailedStepDraft) &&
    detailedStepDraftSignature !== activeDetailedStepDraftSignature;

  const applyDetailedStepDraft = useCallback(() => {
    if (!activeDetailedStep || !detailedStepDraft) {
      return;
    }

    handleUpdateStep(activeDetailedStep.id, {
      name: detailedStepDraft.name,
      actionType: detailedStepDraft.actionType,
      config: detailedStepDraft.config ?? {},
      linkedEntity: deriveLinkedEntityFromConfig(
        detailedStepDraft.actionType,
        detailedStepDraft.config ?? {},
        detailedStepDraft.linkedEntity,
      ),
    });
  }, [activeDetailedStep, detailedStepDraft, handleUpdateStep]);

  const handleCloseDetailedStepEditor = useCallback(() => {
    setDetailedStepEditorNodeId(null);
    setDetailedStepDraft(null);
  }, []);

  return (
    <ProcessMapActionsCtx.Provider value={actionsCtxValue}>
      <Box
        ref={fullscreenContainerRef}
        style={{
          height: isFullscreen ? "100vh" : "100%",
          width: "100%",
          position: isFullscreen ? "fixed" : "relative",
          inset: isFullscreen ? 0 : undefined,
          zIndex: isFullscreen ? PROCESS_MAP_FULLSCREEN_Z_INDEX : undefined,
          background: "var(--mantine-color-body)",
          boxShadow: isFullscreen
            ? "0 30px 80px rgba(15, 23, 42, 0.24)"
            : undefined,
        }}
      >
        <Stack h="100%" gap="xs">
          <Group justify="space-between" wrap="nowrap" px="xs" pt="xs">
            <ProcessMapHeader
              name={mapName}
              description={mapDescription}
              isDirty={isDirty}
              onChange={(name, description) => {
                setMapName(name);
                setMapDescription(description);
              }}
            />
            <Group gap="xs" wrap="nowrap">
              <Button
                size="sm"
                variant="subtle"
                onClick={handleAutoLayout}
                leftSection={<IconLayoutGrid size={14} />}
              >
                {t("Auto-layout")}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleClose}
                leftSection={<IconX size={14} />}
              >
                {t("Close")}
              </Button>
              <Button
                size="sm"
                loading={isSaving}
                onClick={() => void handleSave()}
                disabled={!isDirty}
                leftSection={<IconDeviceFloppy size={14} />}
              >
                {t("Save")}
              </Button>
            </Group>
          </Group>

          <Box style={{ flex: 1, position: "relative", minHeight: 0 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onConnectEnd={handleConnectEnd}
              nodeTypes={nodeTypes}
              onNodeDoubleClick={(_evt, node) => {
                if (isWorkflowNode(node)) {
                  handleEditWorkflow(node.id);
                }
                if (isStepNode(node)) {
                  handleOpenDetailedStepEditor(node.id);
                }
              }}
              fitView
              snapToGrid={isSnapToGrid}
              snapGrid={PROCESS_MAP_SNAP_GRID}
              selectionMode={SelectionMode.Partial}
              selectionKeyCode="Shift"
              style={{ background: "var(--mantine-color-gray-0)" }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls showInteractive={false} showFitView={false}>
                <ControlButton
                  onClick={() => setIsSnapToGrid((current) => !current)}
                  title={
                    isSnapToGrid
                      ? t("Disable snap to grid")
                      : t("Enable snap to grid")
                  }
                  aria-label={
                    isSnapToGrid
                      ? t("Disable snap to grid")
                      : t("Enable snap to grid")
                  }
                  style={{
                    background: isSnapToGrid
                      ? "var(--mantine-color-blue-0)"
                      : undefined,
                    color: isSnapToGrid
                      ? "var(--mantine-color-blue-8)"
                      : undefined,
                  }}
                >
                  <IconLayoutGrid size={16} />
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    void fitView({ padding: 0.2, duration: 250 });
                  }}
                  title={t("Fit view")}
                  aria-label={t("Fit view")}
                >
                  <IconFocusCentered size={16} />
                </ControlButton>
                <ControlButton
                  onClick={() => void handleToggleFullscreen()}
                  title={
                    isFullscreen ? t("Exit full screen") : t("Full screen")
                  }
                  aria-label={
                    isFullscreen ? t("Exit full screen") : t("Full screen")
                  }
                >
                  {isFullscreen ? (
                    <IconMinimize size={16} />
                  ) : (
                    <IconArrowsMaximize size={16} />
                  )}
                </ControlButton>
              </Controls>
              <MiniMap />

              <Panel position="top-left">
                <WorkflowPalette
                  workflows={workflows}
                  presentIds={presentIds}
                  onAdd={handleAddWorkflow}
                  onNew={handleNewWorkflow}
                />
              </Panel>

              <Panel position="top-right">
                <DetailPanel
                  selected={selected}
                  nodes={nodes}
                  templates={templates}
                  webhooks={webhooks}
                  onDeleteNode={confirmDeleteNode}
                  onDeleteEdge={confirmDeleteEdge}
                  onUpdateEdge={handleUpdateEdge}
                  onEditWorkflow={handleEditWorkflow}
                  onUpdateStep={handleUpdateStep}
                  onOpenStepDetails={handleOpenDetailedStepEditor}
                  onEditLinkedEntity={(stepNodeId) => {
                    void openLinkedEntityEditor(stepNodeId);
                  }}
                  onCreateLinkedEntityForStep={(stepNodeId) => {
                    void handleCreateLinkedEntityForStep(stepNodeId);
                  }}
                />
              </Panel>

              <Panel position="bottom-center">
                <Box
                  px="sm"
                  py={6}
                  style={{
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.92)",
                    border: "1px dashed var(--mantine-color-gray-4)",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    maxWidth: 360,
                  }}
                >
                  <Text size="xs" c="dimmed">
                    {t(
                      "Multi-select: Ctrl/Cmd + click adds or removes nodes. Hold Shift and drag on empty canvas to box-select multiple nodes.",
                    )}
                  </Text>
                </Box>
              </Panel>

              <EdgeLabelRenderer>{null}</EdgeLabelRenderer>
            </ReactFlow>
          </Box>

          <ConnectionModal
            pending={pendingConnection}
            onConfirm={handleConnectionConfirm}
            onClose={() => setPendingConnection(null)}
          />

          <AiBranchModal
            pending={pendingAiBranch}
            onClose={() => setPendingAiBranch(null)}
            onConfirm={handleAiBranchConfirm}
          />

          <StepSkeletonModal
            opened={stepModalOpened}
            parentWorkflowId={stepParentWorkflowId}
            templates={templates}
            webhooks={webhooks}
            onClose={() => {
              setStepModalOpened(false);
              setStepParentWorkflowId(null);
            }}
            onCreate={handleStepCreated}
          />

          <WorkflowEditorModal
            opened={wfModalOpened}
            onClose={() => setWfModalOpened(false)}
            initialWorkflow={wfModalInitial}
            client={client}
            boot={boot}
            onSaved={handleWorkflowSaved}
            allowedTriggerEvents={wfModalAllowedTriggers}
            defaultTriggerEvent={wfModalDefaultTrigger}
            defaultConditions={wfModalDefaultConditions}
            persistTriggerEvent={!wfModalManagedByProcessMap}
            zIndex={200001}
          />

          <Modal
            opened={Boolean(detailedStepEditorNodeId && detailedStepDraft)}
            onClose={handleCloseDetailedStepEditor}
            title={t("Detailed step editor")}
            size="xl"
            zIndex={200001}
            styles={{
              body: {
                maxHeight: "calc(100vh - 140px)",
                overflowY: "auto",
              },
            }}
          >
            {activeDetailedStep && detailedStepDraft ? (
              <Stack>
                <TextInput
                  label={t("Step name")}
                  value={detailedStepDraft.name}
                  onChange={(event) =>
                    setDetailedStepDraft((current) =>
                      current
                        ? {
                            ...current,
                            name: event.currentTarget.value,
                          }
                        : current,
                    )
                  }
                />
                <StepBuilder
                  steps={[
                    {
                      actionType: detailedStepDraft.actionType,
                      config: detailedStepDraft.config ?? {},
                    },
                  ]}
                  onChange={(nextSteps) => {
                    const nextStep = nextSteps[0];
                    if (!nextStep) {
                      return;
                    }

                    setDetailedStepDraft((current) =>
                      current
                        ? {
                            ...current,
                            actionType:
                              nextStep.actionType as ProcessDraftStepActionType,
                            config: nextStep.config ?? {},
                            linkedEntity: deriveLinkedEntityFromConfig(
                              nextStep.actionType as ProcessDraftStepActionType,
                              nextStep.config ?? {},
                              current.linkedEntity,
                            ),
                          }
                        : current,
                    );
                  }}
                  templates={templates}
                  webhooks={webhooks}
                />
                <Group justify="flex-end">
                  <Button
                    variant="default"
                    onClick={handleCloseDetailedStepEditor}
                  >
                    {t("Close")}
                  </Button>
                  <Button
                    loading={isSaving}
                    onClick={() => {
                      if (isDetailedStepDirty) {
                        flushSync(() => {
                          applyDetailedStepDraft();
                        });
                      }
                      void handleSave();
                    }}
                    disabled={!isDirty && !isDetailedStepDirty}
                    leftSection={<IconDeviceFloppy size={14} />}
                  >
                    {t("Save")}
                  </Button>
                </Group>
              </Stack>
            ) : null}
          </Modal>

          <TemplateEditorModal
            opened={Boolean(editingTemplate)}
            onClose={() => setEditingTemplate(null)}
            initialTemplate={editingTemplate?.value ?? null}
            mode={editingTemplate?.mode ?? "existing"}
            client={client}
            boot={boot}
            zIndex={200001}
            onSaved={(saved) => {
              updateStepLinkedEntity(
                editingTemplate?.stepNodeId ?? "",
                {
                  entityType: "template",
                  mode: "existing",
                  key: saved.templateKey,
                  name: saved.name,
                },
                { templateKey: saved.templateKey },
              );
              setEditingTemplate(null);
            }}
          />

          <WebhookEditorModal
            opened={Boolean(editingWebhook)}
            onClose={() => setEditingWebhook(null)}
            initialWebhook={editingWebhook?.value ?? null}
            mode={editingWebhook?.mode ?? "existing"}
            client={client}
            boot={boot}
            zIndex={200001}
            onSaved={(saved) => {
              updateStepLinkedEntity(
                editingWebhook?.stepNodeId ?? "",
                {
                  entityType: "webhook",
                  mode: "existing",
                  key: saved.webhookKey,
                  name: saved.name,
                },
                { webhookKey: saved.webhookKey },
              );
              setEditingWebhook(null);
            }}
          />
        </Stack>
      </Box>
    </ProcessMapActionsCtx.Provider>
  );
}

export default function ProcessMapCanvas(props: ProcessMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <ProcessMapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
