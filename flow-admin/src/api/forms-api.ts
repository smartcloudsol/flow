// Backend Forms API Client
// Direct browser-side AWS API calls for form definition management

import { adminRequest, buildQuery } from "./backend-utils";
import type { FormDefinition, ListResponse } from "./types";

export interface CreateFormPayload {
  formId?: string;
  accountId: string;
  siteId: string;
  name: string;
  enabled?: boolean;
  sourceType?: string;
  sourceId?: number;
  sourceStatus?: string;
  renderMode?: string;
  schemaVersion?: number;
  fields?: unknown[];
  settings?: Record<string, unknown>;
  autoReplyTemplateKey?: string;
  actions?: unknown[];
}

export type UpdateFormPayload = Partial<CreateFormPayload>;

/**
 * Forms Backend API Client
 */
export class FormsApi {
  /**
   * List all forms for a site
   */
  static async listForms(params: {
    accountId: string;
    siteId: string;
    limit?: number;
    cursor?: string;
  }): Promise<ListResponse<FormDefinition>> {
    const query = buildQuery(params);
    return adminRequest<ListResponse<FormDefinition>>(`/forms?${query}`, "GET");
  }

  /**
   * Get a single form definition
   */
  static async getForm(formId: string): Promise<FormDefinition> {
    return adminRequest<FormDefinition>(`/forms/${formId}`, "GET");
  }

  /**
   * Create a new form definition
   * Backend generates and returns formId
   */
  static async createForm(payload: CreateFormPayload): Promise<FormDefinition> {
    return adminRequest<FormDefinition>("/forms", "POST", payload);
  }

  /**
   * Update an existing form definition
   */
  static async updateForm(
    formId: string,
    payload: UpdateFormPayload,
  ): Promise<FormDefinition> {
    return adminRequest<FormDefinition>(`/forms/${formId}`, "PUT", payload);
  }

  /**
   * Delete a form definition
   * Only call this if permanent delete is enabled in settings
   */
  static async deleteForm(formId: string): Promise<void> {
    await adminRequest<void>(`/forms/${formId}`, "DELETE");
  }

  /**
   * Archive/disable a form definition
   * Preferred over permanent delete
   */
  static async archiveForm(formId: string): Promise<FormDefinition> {
    return adminRequest<FormDefinition>(`/forms/${formId}`, "PUT", {
      enabled: false,
    });
  }

  /**
   * Restore/enable a form definition
   */
  static async restoreForm(formId: string): Promise<FormDefinition> {
    return adminRequest<FormDefinition>(`/forms/${formId}`, "PUT", {
      enabled: true,
    });
  }
}
