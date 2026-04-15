import type { BootConfig, EmailTemplate, FormDefinition, ListResponse, ProcessMap, Submission, SubmissionActionResponse, SubmissionDetail, SubmissionEvent, SubmissionListQuery, TemplatePreviewResponse, WebhookEndpoint, Workflow } from "./types";
export declare class FlowBackendClient {
    private readonly boot;
    constructor(boot: BootConfig);
    private request;
    listForms(limit?: number): Promise<ListResponse<FormDefinition>>;
    getForm(formId: string): Promise<FormDefinition>;
    listSiteSubmissions(query: SubmissionListQuery): Promise<ListResponse<Submission>>;
    getSubmission(formId: string, submissionId: string): Promise<SubmissionDetail>;
    listSubmissionEvents(formId: string, submissionId: string): Promise<{
        items: SubmissionEvent[];
    }>;
    patchSubmission(formId: string, submissionId: string, body: Partial<Submission>): Promise<Submission>;
    deleteSubmission(formId: string, submissionId: string): Promise<void>;
    invokeSubmissionAction(formId: string, submissionId: string, actionKey: string, variables?: Record<string, unknown>): Promise<SubmissionActionResponse>;
    listTemplates(limit?: number, cursor?: string): Promise<ListResponse<EmailTemplate>>;
    getTemplate(templateKey: string): Promise<EmailTemplate>;
    createTemplate(body: EmailTemplate): Promise<EmailTemplate>;
    updateTemplate(templateKey: string, body: EmailTemplate): Promise<EmailTemplate>;
    deleteTemplate(templateKey: string): Promise<void>;
    previewTemplate(templateKey: string, variables: Record<string, unknown>): Promise<TemplatePreviewResponse>;
    listWorkflows(limit?: number, cursor?: string): Promise<ListResponse<Workflow>>;
    getWorkflow(workflowId: string): Promise<Workflow>;
    createWorkflow(body: Workflow): Promise<Workflow>;
    updateWorkflow(workflowId: string, body: Workflow): Promise<Workflow>;
    deleteWorkflow(workflowId: string): Promise<void>;
    listWebhookEndpoints(limit?: number, cursor?: string): Promise<ListResponse<WebhookEndpoint>>;
    getWebhookEndpoint(webhookKey: string): Promise<WebhookEndpoint>;
    createWebhookEndpoint(body: WebhookEndpoint): Promise<WebhookEndpoint>;
    updateWebhookEndpoint(webhookKey: string, body: WebhookEndpoint): Promise<WebhookEndpoint>;
    deleteWebhookEndpoint(webhookKey: string): Promise<void>;
    listProcessMaps(limit?: number, cursor?: string): Promise<ListResponse<ProcessMap>>;
    getProcessMap(processMapId: string): Promise<ProcessMap>;
    createProcessMap(body: ProcessMap): Promise<ProcessMap>;
    updateProcessMap(processMapId: string, body: ProcessMap): Promise<ProcessMap>;
    deleteProcessMap(processMapId: string): Promise<void>;
}
//# sourceMappingURL=backend-client.d.ts.map