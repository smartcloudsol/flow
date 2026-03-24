// Form Sync Manager
// Manages create/update/archive/delete lifecycle for form definitions

import { FormsApi, type CreateFormPayload } from "./forms-api";
import {
  extractCanonicalFormConfig,
  generateSyncHash,
  validateCanonicalConfig,
  type FormSourceData,
} from "./form-extractor";
import type { BootConfig } from "./types";
import { getDecisionForAdminBackend } from "./backend-utils";

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

/**
 * Form Sync Manager
 * Handles backend synchronization for form definitions
 */
export class FormSyncManager {
  private boot: BootConfig;

  constructor(boot: BootConfig) {
    this.boot = boot;
  }

  /**
   * Check if backend sync is available and enabled
   */
  async canSync(): Promise<{ can: boolean; reason?: string }> {
    // Check if sync is enabled in settings
    if (!this.boot.settings.formsBackendSyncEnabled) {
      return { can: false, reason: "Backend sync disabled in settings" };
    }

    // Check backend availability
    const decision = await getDecisionForAdminBackend();
    if (!decision.backendAvailable) {
      return {
        can: false,
        reason: decision.backendReason || "Backend not available",
      };
    }

    // Check required settings
    if (!this.boot.accountId) {
      return { can: false, reason: "Missing accountId" };
    }
    if (!this.boot.siteId) {
      return { can: false, reason: "Missing siteId" };
    }

    return { can: true };
  }

  /**
   * Create or update form definition in backend
   */
  async syncForm(
    source: FormSourceData,
    currentMeta: SyncMetadata,
  ): Promise<SyncResult> {
    // Check if sync is possible
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    try {
      // Extract canonical config
      const canonical = extractCanonicalFormConfig(source, this.boot);

      // Validate config
      const validationError = validateCanonicalConfig(canonical);
      if (validationError) {
        return {
          success: false,
          error: `Validation failed: ${validationError}`,
        };
      }

      // Generate sync hash
      const newHash = generateSyncHash(canonical);

      // Check if update needed
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
        // Update existing form
        try {
          formDefinition = await FormsApi.updateForm(
            currentMeta.formId,
            canonical,
          );
          action = "updated";
        } catch (error: unknown) {
          // If form not found in backend, recreate it
          if (error instanceof Error && error.message.includes("404")) {
            formDefinition = await FormsApi.createForm(
              canonical as CreateFormPayload,
            );
            action = "created";
          } else {
            throw error;
          }
        }
      } else {
        // Create new form
        formDefinition = await FormsApi.createForm(
          canonical as CreateFormPayload,
        );
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

  /**
   * Archive/disable form in backend
   */
  async archiveForm(formId: string): Promise<SyncResult> {
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    try {
      await FormsApi.archiveForm(formId);
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

  /**
   * Restore/enable form in backend
   */
  async restoreForm(formId: string): Promise<SyncResult> {
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    try {
      await FormsApi.restoreForm(formId);
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

  /**
   * Permanently delete form in backend
   * Only call if formsAllowPermanentDelete is enabled
   */
  async deleteForm(formId: string): Promise<SyncResult> {
    const canSync = await this.canSync();
    if (!canSync.can) {
      return {
        success: false,
        error: canSync.reason,
      };
    }

    // Check if permanent delete is allowed
    if (!this.boot.settings.formsAllowPermanentDelete) {
      return {
        success: false,
        error: "Permanent delete not enabled in settings",
      };
    }

    try {
      await FormsApi.deleteForm(formId);
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
