import { FlowSettings } from "@smart-cloud/flow-core";
export type AdminView = "submissions" | "templates" | "workflows" | "general" | "api-settings";
export type AwsAuthMode = "COGNITO" | "IAM" | "NONE";
export type BackendTransport = "gatey" | "fetch";
/**
 * BootConfig - runtime configuration passed from PHP to React
 */
export interface BootConfig {
    restUrl?: string;
    nonce?: string;
    accountId?: string;
    siteId?: string;
    settings: FlowSettings;
}
export interface ListResponse<T> {
    items: T[];
    cursor?: string | null;
}
export interface FormActionDefinition {
    actionKey?: string;
    label?: string;
    allowedFromStatuses?: string[];
    targetStatus?: string;
    templateKey?: string;
    eventName?: string;
    wpHookName?: string;
    enabled?: boolean;
}
export interface FormDefinition {
    formId: string;
    accountId: string;
    siteId: string;
    name: string;
    description?: string;
    enabled?: boolean;
    locale?: string;
    siteName?: string;
    autoReplyTemplateKey?: string;
    actions?: FormActionDefinition[];
    fields?: Array<Record<string, unknown>>;
    fieldSchema?: Record<string, unknown>;
    settings?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}
export interface Submission {
    submissionId: string;
    accountId?: string;
    siteId?: string;
    formId?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    fields?: Record<string, unknown>;
    email?: string;
    emailSource?: "field" | "manual" | "none";
    tags?: string[];
    primaryLabel?: string;
    summary?: string;
    source?: Record<string, unknown>;
    actor?: Record<string, unknown>;
    payloadRef?: {
        uri?: string;
        bucket?: string;
        key?: string;
        rootPrefix?: string;
        fileName?: string;
        contentType?: string;
        size?: number;
        downloadUrl?: string;
    };
    metadata?: Record<string, unknown>;
    internalNotes?: string;
}
export interface SubmissionEvent {
    eventId?: string;
    submissionId?: string;
    eventType?: string;
    occurredAt?: string;
    actor?: Record<string, unknown>;
    detail?: Record<string, unknown>;
}
export interface SubmissionDetail extends Submission {
    timeline?: SubmissionEvent[];
}
export interface SubmissionActionResponse {
    success: boolean;
    message?: string;
    submission?: Submission;
}
export interface TemplateAttachment {
    attachmentId?: string;
    key?: string;
    draftKey?: string;
    fileName: string;
    contentType?: string;
    size?: number;
    disposition?: "attachment" | "inline";
    contentId?: string;
    uploadStatus?: "uploading" | "uploaded" | "error";
    errorMessage?: string;
}
export interface TemplateAttachmentUploadTarget {
    attachmentId: string;
    bucket: string;
    draftKey: string;
    uploadUrl: string;
    headers: Record<string, string>;
    expiresIn: number;
}
export interface EmailTemplate {
    templateKey: string;
    accountId: string;
    siteId: string;
    name: string;
    description?: string;
    locale?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    fromEmail?: string;
    fromName?: string;
    replyToEmail?: string;
    templateEngine?: "handlebars" | "mustache" | "liquid";
    attachments?: TemplateAttachment[];
    enabled?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
export interface TemplatePreviewResponse {
    subject?: string;
    htmlBody?: string;
    textBody?: string;
}
export interface WorkflowStep {
    stepId?: string;
    actionType?: string;
    config?: Record<string, unknown>;
}
export interface WorkflowTriggerCondition {
    field?: string;
    operator?: string;
    value?: unknown;
}
export interface WorkflowTrigger {
    eventType?: string;
    sourceStepIds?: string[];
    conditions?: WorkflowTriggerCondition[];
    repeatPolicy?: "always" | "first-match-only";
}
export interface Workflow {
    workflowId: string;
    accountId: string;
    siteId: string;
    name: string;
    description?: string;
    enabled?: boolean;
    trigger?: WorkflowTrigger;
    steps?: WorkflowStep[];
    createdAt?: string;
    updatedAt?: string;
}
export interface WebhookEndpoint {
    webhookKey: string;
    accountId: string;
    siteId: string;
    url: string;
    provider?: "generic" | "zapier";
    name?: string;
    description?: string;
    enabled?: boolean;
    method?: "POST" | "PUT";
    signingMode?: "none" | "hmac";
    signingSecretParameterName?: string;
    headers?: Record<string, string>;
    createdAt?: string;
    updatedAt?: string;
}
export interface SubmissionListQuery {
    cursor?: string;
    pageSize: number;
    search?: string;
    formId?: string;
    status?: string;
    from?: string;
    to?: string;
    email?: string;
    sortBy?: "createdAt" | "updatedAt" | "status";
    sortDir?: "asc" | "desc";
}
export interface ProcessNodeLayout {
    x: number;
    y: number;
    width?: number;
    height?: number;
    collapsed?: boolean;
}
export interface ProcessLayout {
    nodes: Record<string, ProcessNodeLayout>;
    viewport?: {
        x: number;
        y: number;
        zoom: number;
    };
}
export type ProcessConnectionType = "event" | "logical";
export interface ProcessEventConnection {
    id: string;
    type: "event";
    sourceWorkflowId: string;
    targetWorkflowId: string;
    eventName: string;
    filter?: Record<string, unknown>;
}
export interface ProcessLogicalConnection {
    id: string;
    type: "logical";
    sourceWorkflowId: string;
    targetWorkflowId: string;
    label?: string;
}
export type ProcessConnection = ProcessEventConnection | ProcessLogicalConnection;
export type ProcessDraftStepActionType = "email.send" | "webhook.call" | "ai.agent" | "eventbridge.event" | "status.update" | "delay";
export interface ProcessDraftLinkedEntity {
    entityType: "template" | "webhook";
    mode: "existing" | "draft";
    key?: string;
    draftId?: string;
    name?: string;
}
export interface ExternalProcessorNode {
    processorId: string;
    name: string;
    description?: string;
    inputEventType: string;
    outputEventType: string;
    outputSchema?: string;
}
export interface ProcessDraftStepNode {
    stepId: string;
    parentWorkflowId: string;
    actionType: ProcessDraftStepActionType;
    name: string;
    config?: Record<string, unknown>;
    linkedEntity?: ProcessDraftLinkedEntity;
    order?: number;
}
export interface ProcessDraftEdge {
    id: string;
    source: string;
    target: string;
    kind: "workflow-step" | "step-trigger" | "step-processor" | "processor-trigger";
    label?: string;
    branchKey?: string;
    triggerEvent?: string;
    sourceActionType?: ProcessDraftStepActionType;
    processorOutputEventType?: string;
}
export interface ProcessDraftGraph {
    stepNodes: ProcessDraftStepNode[];
    externalProcessors?: ExternalProcessorNode[];
    edges: ProcessDraftEdge[];
}
export interface ProcessMap {
    processMapId: string;
    accountId: string;
    siteId: string;
    name: string;
    description?: string;
    workflowIds: string[];
    connections: ProcessConnection[];
    layout: ProcessLayout;
    metadata?: {
        version?: number;
        updatedAt?: string;
        updatedBy?: string;
        draftGraph?: ProcessDraftGraph;
        workflowTriggerBaselines?: Record<string, WorkflowTrigger | undefined>;
    };
    createdAt?: string;
    updatedAt?: string;
}
//# sourceMappingURL=types.d.ts.map