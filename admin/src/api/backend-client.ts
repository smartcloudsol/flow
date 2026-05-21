import type {
  BootConfig,
  EmailTemplate,
  FormDefinition,
  ListResponse,
  ProcessMap,
  Submission,
  SubmissionActionResponse,
  SubmissionDetail,
  SubmissionEvent,
  SubmissionListQuery,
  TemplateAttachmentUploadTarget,
  TemplatePreviewResponse,
  WebhookEndpoint,
  Workflow,
} from "./types";
import { adminRequest, buildQuery } from "./backend-utils";

export class FlowBackendClient {
  constructor(private readonly boot: BootConfig) {}

  private async request<T>(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: unknown,
  ): Promise<T> {
    return adminRequest<T>(path, method, body);
  }

  listForms(limit = 100): Promise<ListResponse<FormDefinition>> {
    const query = buildQuery({
      accountId: this.boot.accountId,
      siteId: this.boot.siteId,
      limit,
    });
    return this.request(`/forms?${query}`);
  }

  getForm(formId: string): Promise<FormDefinition> {
    return this.request(`/forms/${formId}`);
  }

  listSiteSubmissions(
    query: SubmissionListQuery,
  ): Promise<ListResponse<Submission>> {
    const qs = buildQuery({
      accountId: this.boot.accountId,
      siteId: this.boot.siteId,
      formId: query.formId,
      status: query.status,
      email: query.email,
      search: query.search,
      from: query.from,
      to: query.to,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      limit: query.pageSize,
      cursor: query.cursor,
    });
    return this.request(`/submissions?${qs}`);
  }

  getSubmission(
    formId: string,
    submissionId: string,
  ): Promise<SubmissionDetail> {
    return this.request(
      `/forms/${formId}/submissions/${submissionId}?includeTimeline=true`,
    );
  }

  listSubmissionEvents(
    formId: string,
    submissionId: string,
  ): Promise<{ items: SubmissionEvent[] }> {
    return this.request(`/forms/${formId}/submissions/${submissionId}/events`);
  }

  patchSubmission(
    formId: string,
    submissionId: string,
    body: Partial<Submission>,
  ): Promise<Submission> {
    return this.request(
      `/forms/${formId}/submissions/${submissionId}`,
      "PATCH",
      body,
    );
  }

  deleteSubmission(formId: string, submissionId: string): Promise<void> {
    return this.request(
      `/forms/${formId}/submissions/${submissionId}`,
      "DELETE",
    );
  }

  invokeSubmissionAction(
    formId: string,
    submissionId: string,
    actionKey: string,
    variables?: Record<string, unknown>,
  ): Promise<SubmissionActionResponse> {
    return this.request(
      `/forms/${formId}/submissions/${submissionId}/actions/${actionKey}`,
      "POST",
      { variables: variables ?? {} },
    );
  }

  listTemplates(
    limit = 100,
    cursor?: string,
  ): Promise<ListResponse<EmailTemplate>> {
    const qs = buildQuery({
      accountId: this.boot.accountId,
      siteId: this.boot.siteId,
      limit,
      cursor,
    });
    return this.request(`/templates?${qs}`);
  }

  getTemplate(templateKey: string): Promise<EmailTemplate> {
    return this.request(`/templates/${templateKey}`);
  }

  createTemplate(body: EmailTemplate): Promise<EmailTemplate> {
    return this.request(`/templates`, "POST", body);
  }

  updateTemplate(
    templateKey: string,
    body: EmailTemplate,
  ): Promise<EmailTemplate> {
    return this.request(`/templates/${templateKey}`, "PUT", body);
  }

  deleteTemplate(templateKey: string): Promise<void> {
    return this.request(`/templates/${templateKey}`, "DELETE");
  }

  previewTemplate(
    templateKey: string,
    variables: Record<string, unknown>,
  ): Promise<TemplatePreviewResponse> {
    return this.request(`/templates/${templateKey}/preview`, "POST", {
      variables,
    });
  }

  createTemplateAttachmentUploadTarget(input: {
    draftId: string;
    fileName: string;
    contentType?: string;
  }): Promise<TemplateAttachmentUploadTarget> {
    return this.request(`/template-attachments/upload-url`, "POST", {
      accountId: this.boot.accountId,
      siteId: this.boot.siteId,
      draftId: input.draftId,
      fileName: input.fileName,
      contentType: input.contentType,
    });
  }

  deleteTemplateAttachmentDraft(draftKey: string): Promise<void> {
    return this.request(`/template-attachments/drafts/delete`, "POST", {
      draftKey,
    });
  }

  listWorkflows(limit = 100, cursor?: string): Promise<ListResponse<Workflow>> {
    const qs = buildQuery({
      accountId: this.boot.accountId,
      siteId: this.boot.siteId,
      limit,
      cursor,
    });
    return this.request(`/workflows?${qs}`);
  }

  getWorkflow(workflowId: string): Promise<Workflow> {
    return this.request(`/workflows/${workflowId}`);
  }

  createWorkflow(body: Workflow): Promise<Workflow> {
    return this.request(`/workflows`, "POST", body);
  }

  updateWorkflow(workflowId: string, body: Workflow): Promise<Workflow> {
    return this.request(`/workflows/${workflowId}`, "PUT", body);
  }

  deleteWorkflow(workflowId: string): Promise<void> {
    return this.request(`/workflows/${workflowId}`, "DELETE");
  }

  listWebhookEndpoints(
    limit = 100,
    cursor?: string,
  ): Promise<ListResponse<WebhookEndpoint>> {
    const qs = buildQuery({
      accountId: this.boot.accountId,
      siteId: this.boot.siteId,
      limit,
      cursor,
    });
    return this.request(`/webhook-endpoints?${qs}`);
  }

  getWebhookEndpoint(webhookKey: string): Promise<WebhookEndpoint> {
    return this.request(`/webhook-endpoints/${webhookKey}`);
  }

  createWebhookEndpoint(body: WebhookEndpoint): Promise<WebhookEndpoint> {
    return this.request(`/webhook-endpoints`, "POST", body);
  }

  updateWebhookEndpoint(
    webhookKey: string,
    body: WebhookEndpoint,
  ): Promise<WebhookEndpoint> {
    return this.request(`/webhook-endpoints/${webhookKey}`, "PUT", body);
  }

  deleteWebhookEndpoint(webhookKey: string): Promise<void> {
    return this.request(`/webhook-endpoints/${webhookKey}`, "DELETE");
  }

  listProcessMaps(
    limit = 100,
    cursor?: string,
  ): Promise<ListResponse<ProcessMap>> {
    const qs = buildQuery({
      accountId: this.boot.accountId,
      siteId: this.boot.siteId,
      limit,
      cursor,
    });
    return this.request(`/process-maps?${qs}`);
  }

  getProcessMap(processMapId: string): Promise<ProcessMap> {
    return this.request(`/process-maps/${processMapId}`);
  }

  createProcessMap(body: ProcessMap): Promise<ProcessMap> {
    return this.request(`/process-maps`, "POST", body);
  }

  updateProcessMap(
    processMapId: string,
    body: ProcessMap,
  ): Promise<ProcessMap> {
    return this.request(`/process-maps/${processMapId}`, "PUT", body);
  }

  deleteProcessMap(processMapId: string): Promise<void> {
    return this.request(`/process-maps/${processMapId}`, "DELETE");
  }
}
