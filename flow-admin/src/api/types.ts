import { FlowSettings } from "@smart-cloud/flow-core";

export type AdminView =
  | "submissions"
  | "templates"
  | "workflows"
  | "general"
  | "api-settings";

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
    bucket?: string;
    key?: string;
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
  type?: "email" | "webhook" | "status-change" | "delay" | "condition";
  config?: Record<string, unknown>;
  retryPolicy?: {
    maxAttempts?: number;
    backoffMultiplier?: number;
  };
}

export interface Workflow {
  workflowId: string;
  accountId: string;
  siteId: string;
  name: string;
  description?: string;
  enabled?: boolean;
  trigger?: {
    eventType?: string;
    conditions?: Record<string, unknown>[];
    repeatPolicy?: "always" | "first-match-only";
  };
  steps?: WorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookEndpoint {
  webhookKey: string;
  accountId: string;
  siteId: string;
  url: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  events?: string[];
  signingSecret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxAttempts?: number;
    backoffMultiplier?: number;
  };
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
