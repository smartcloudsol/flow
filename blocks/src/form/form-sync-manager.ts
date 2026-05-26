// Form Sync Manager
// Manages create/update/archive/delete lifecycle for form definitions

import { dispatchBackend, resolveBackend } from "@smart-cloud/flow-core";
import {
  extractCanonicalFormConfig,
  generateSyncHash,
  validateCanonicalConfig,
  type CreateFormPayload,
  type FormSourceData,
  type FormSyncBootConfig,
  type UpdateFormPayload,
} from "./form-extractor";

export interface SyncMetadata {
  formId?: string;
  syncHash?: string;
  syncStatus?: "idle" | "syncing" | "synced" | "error";
  lastSynced?: string;
  lastError?: string;
  sourceKind?: string;
}

export interface SyncResult {
  success: boolean;
  formId?: string;
  action?: "created" | "updated" | "archived" | "deleted" | "no-change";
  error?: string;
  syncHash?: string;
}

interface FormDefinition {
  formId: string;
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

async function getBackendDecision() {
  const backend = await resolveBackend();

  return {
    backendAvailable: backend.available,
    backendTransport: backend.transport,
    backendApiName: backend.apiName,
    backendBaseUrl: backend.baseUrl,
    backendReason: backend.reason,
    reason: backend.reason ?? "",
  };
}

async function adminRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  const decision = await getBackendDecision();

  if (!decision.backendAvailable) {
    throw new Error("Backend not available");
  }

  return (await dispatchBackend(
    decision,
    "admin",
    path,
    method,
    body ?? null,
    {},
  )) as T;
}

export class FormSyncManager {
  private boot: FormSyncBootConfig;

  constructor(boot: FormSyncBootConfig) {
    this.boot = boot;
  }

  private async createForm(
    payload: CreateFormPayload,
  ): Promise<FormDefinition> {
    return adminRequest<FormDefinition>("/forms", "POST", payload);
  }

  private async updateForm(
    formId: string,
    payload: UpdateFormPayload,
  ): Promise<FormDefinition> {
    return adminRequest<FormDefinition>(`/forms/${formId}`, "PUT", payload);
  }

  private async archiveBackendForm(formId: string): Promise<FormDefinition> {
    return adminRequest<FormDefinition>(`/forms/${formId}`, "PUT", {
      enabled: false,
    });
  }

  private async restoreBackendForm(formId: string): Promise<FormDefinition> {
    return adminRequest<FormDefinition>(`/forms/${formId}`, "PUT", {
      enabled: true,
    });
  }

  private async deleteBackendForm(formId: string): Promise<void> {
    await adminRequest<void>(`/forms/${formId}`, "DELETE");
  }

  private isMissingBackendFormError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
      message.includes("404") ||
      message.includes("form not found") ||
      message.includes("not found")
    );
  }

  async canSync(): Promise<{ can: boolean; reason?: string }> {
    if (!this.boot.settings.formsBackendSyncEnabled) {
      return { can: false, reason: "Backend sync disabled in settings" };
    }

    const decision = await getBackendDecision();
    if (!decision.backendAvailable) {
      return {
        can: false,
        reason: decision.backendReason || "Backend not available",
      };
    }

    if (!this.boot.accountId) {
      return { can: false, reason: "Missing accountId" };
    }
    if (!this.boot.siteId) {
      return { can: false, reason: "Missing siteId" };
    }

    return { can: true };
  }

  async syncForm(
    source: FormSourceData,
    currentMeta: SyncMetadata,
  ): Promise<SyncResult> {
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    try {
      const canonical = extractCanonicalFormConfig(source, this.boot);
      const validationError = validateCanonicalConfig(canonical);
      if (validationError) {
        return {
          success: false,
          error: `Validation failed: ${validationError}`,
        };
      }

      const newHash = generateSyncHash(canonical);

      if (
        currentMeta.formId &&
        currentMeta.syncHash === newHash &&
        currentMeta.syncStatus === "synced"
      ) {
        return {
          success: true,
          formId: currentMeta.formId,
          action: "no-change",
          syncHash: newHash,
        };
      }

      let formDefinition;
      let action: "created" | "updated" = "created";

      if (currentMeta.formId) {
        try {
          formDefinition = await this.updateForm(currentMeta.formId, canonical);
          action = "updated";
        } catch (error: unknown) {
          if (this.isMissingBackendFormError(error)) {
            formDefinition = await this.createForm(
              canonical as CreateFormPayload,
            );
            action = "created";
          } else {
            throw error;
          }
        }
      } else {
        formDefinition = await this.createForm(canonical as CreateFormPayload);
        action = "created";
      }

      return {
        success: true,
        formId: formDefinition.formId,
        action,
        syncHash: newHash,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }

  async archiveForm(formId: string): Promise<SyncResult> {
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    try {
      await this.archiveBackendForm(formId);
      return {
        success: true,
        formId,
        action: "archived",
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Archive failed",
      };
    }
  }

  async restoreForm(formId: string): Promise<SyncResult> {
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    try {
      await this.restoreBackendForm(formId);
      return {
        success: true,
        formId,
        action: "updated",
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Restore failed",
      };
    }
  }

  async deleteForm(formId: string): Promise<SyncResult> {
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    if (!this.boot.settings.formsAllowPermanentDelete) {
      return {
        success: false,
        error: "Permanent delete not enabled in settings",
      };
    }

    try {
      await this.deleteBackendForm(formId);
      return {
        success: true,
        formId,
        action: "deleted",
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }
}

export { buildQuery };
