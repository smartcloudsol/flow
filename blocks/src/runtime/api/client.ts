import type {
  FormDraftDeleteResponse,
  FormDraftLoadRequest,
  FormDraftLoadResponse,
  FormDraftRequest,
  FormDraftResponse,
  FormSubmitRequest,
  FormSubmitResponse,
  SubmissionDetail,
  SubmissionListItem,
} from "../../shared/types";

export interface FormsApiClientConfig {
  baseUrl: string;
}

export class FormsApiClient {
  constructor(private readonly config: FormsApiClientConfig) {}

  async saveDraft(
    formId: string,
    request: FormDraftRequest,
    endpointPath?: string,
  ): Promise<FormDraftResponse> {
    const path = endpointPath || `/frontend/forms/${encodeURIComponent(formId)}/drafts`;
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Draft save failed");
    }
    return (await response.json()) as FormDraftResponse;
  }

  async loadDraft(
    formId: string,
    request: FormDraftLoadRequest,
  ): Promise<FormDraftLoadResponse> {
    const response = await fetch(`${this.config.baseUrl}/frontend/forms/${encodeURIComponent(formId)}/drafts/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Draft load failed");
    }
    return (await response.json()) as FormDraftLoadResponse;
  }

  async deleteDraft(
    formId: string,
    request: FormDraftLoadRequest,
  ): Promise<FormDraftDeleteResponse> {
    const response = await fetch(`${this.config.baseUrl}/frontend/forms/${encodeURIComponent(formId)}/drafts/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Draft delete failed");
    }
    return (await response.json()) as FormDraftDeleteResponse;
  }

  async submitDraft(
    formId: string,
    submissionId: string,
    request: FormSubmitRequest & { password: string },
  ): Promise<FormSubmitResponse> {
    const response = await fetch(`${this.config.baseUrl}/frontend/forms/${encodeURIComponent(formId)}/drafts/${encodeURIComponent(submissionId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Draft submit failed");
    }
    return (await response.json()) as FormSubmitResponse;
  }

  async submit(
    request: FormSubmitRequest,
    endpointPath: string,
  ): Promise<FormSubmitResponse> {
    const response = await fetch(`${this.config.baseUrl}${endpointPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Form submission failed");
    }

    return (await response.json()) as FormSubmitResponse;
  }

  async listSubmissions(formId?: string): Promise<SubmissionListItem[]> {
    const suffix = formId ? `?formId=${encodeURIComponent(formId)}` : "";
    const response = await fetch(
      `${this.config.baseUrl}/admin/forms/submissions${suffix}`,
    );
    if (!response.ok) {
      throw new Error("Failed to load submissions");
    }
    const payload = (await response.json()) as
      | SubmissionListItem[]
      | { items: SubmissionListItem[] };
    return Array.isArray(payload) ? payload : payload.items;
  }

  async getSubmission(submissionId: string): Promise<SubmissionDetail> {
    const response = await fetch(
      `${this.config.baseUrl}/admin/forms/submissions/${encodeURIComponent(
        submissionId,
      )}`,
    );
    if (!response.ok) {
      throw new Error("Failed to load submission");
    }
    return (await response.json()) as SubmissionDetail;
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    const response = await fetch(
      `${this.config.baseUrl}/admin/forms/submissions/${encodeURIComponent(
        submissionId,
      )}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      throw new Error("Failed to delete submission");
    }
  }
}
