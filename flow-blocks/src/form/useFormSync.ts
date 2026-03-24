/**
 * Form Backend Sync Hook
 *
 * Handles automatic synchronization of form blocks with backend form definitions.
 * Triggers sync on block save and provides sync status to the editor UI.
 */

import { getWpSuite, type SiteSettings } from "@smart-cloud/wpsuite-core";
import { useSelect } from "@wordpress/data";
import { store as editorStore } from "@wordpress/editor";
import { useCallback, useEffect, useRef, useState } from "@wordpress/element";
import type { FieldConfig, FormAttributes } from "../shared/types";

interface SyncStatus {
  status: "idle" | "syncing" | "synced" | "error";
  formId: string | null;
  lastError: string | null;
  lastSynced: string | null;
}

interface FormSyncOptions {
  postId: number;
  enabled?: boolean;
  formAttributes: FormAttributes; // Form block attributes
  fields: FieldConfig[]; // Extracted from innerBlocks
  setAttributes?: (attrs: { formId: string }) => void; // Callback to update block attributes
}

/**
 * Hook to manage backend sync for a form block.
 *
 * @param options Sync configuration
 * @returns Current sync status and manual sync trigger
 */
export function useFormSync(options: FormSyncOptions) {
  const {
    postId,
    enabled = true,
    formAttributes,
    fields,
    setAttributes,
  } = options;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: "idle",
    formId: null,
    lastError: null,
    lastSynced: null,
  });

  const lastSyncHashRef = useRef<string | null>(null);
  const syncInProgressRef = useRef(false);

  // Get current post save status
  const { isSavingPost, isAutosavingPost } = useSelect((select) => {
    const editorSelect = select(editorStore) as unknown as {
      isSavingPost: () => boolean;
      isAutosavingPost: () => boolean;
    };
    return {
      isSavingPost: editorSelect.isSavingPost(),
      isAutosavingPost: editorSelect.isAutosavingPost(),
    };
  }, []);

  /**
   * Perform backend sync
   */
  const performSync = useCallback(async () => {
    if (!enabled || syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;
    setSyncStatus((prev) => ({ ...prev, status: "syncing", lastError: null }));

    try {
      // Dynamically import sync manager to avoid circular dependencies
      const { FormSyncManager } = await import(
        "../../../admin/src/api/form-sync-manager"
      );
      const { getFormSyncMeta, updateFormSyncMeta } = await import(
        "../../../admin/src/api/sync-meta-api"
      );

      // Get current sync metadata from post meta
      const currentMeta = await getFormSyncMeta(postId);

      // Extract form configuration from block attributes and fields
      const formSource = {
        postId,
        postType: "smartcloud_flow_form", // or get from WP
        postStatus: "publish", // or get from WP
        attributes: formAttributes as Record<string, unknown>,
        fields: fields.map((field) => {
          // Add properties that exist on non-container fields
          if (
            field.type !== "submit" &&
            field.type !== "save-draft" &&
            field.type !== "stack" &&
            field.type !== "group" &&
            field.type !== "grid" &&
            field.type !== "fieldset" &&
            field.type !== "collapse" &&
            field.type !== "visuallyhidden" &&
            field.type !== "divider" &&
            "name" in field
          ) {
            const validField = field;
            const fieldData: Record<string, unknown> = {
              type: validField.type,
              name: validField.name,
              label: validField.label,
              description: validField.description,
              required: validField.required,
            };

            // Add optional properties if they exist
            if ("placeholder" in field && field.placeholder) {
              fieldData.placeholder = field.placeholder;
            }
            if (
              field.type === "select" &&
              "options" in field &&
              field.options
            ) {
              fieldData.options = field.options;
            }

            return fieldData;
          }
          return {
            type: field.type,
          };
        }) as unknown as Parameters<
          typeof FormSyncManager.prototype.syncForm
        >[0]["fields"],
        sourceKind: "post" as const,
      };

      // Get plugin config from WpSuite global
      const { getFlowPlugin } = await import("@smart-cloud/flow-core");
      const plugin = getFlowPlugin();
      if (!plugin) {
        throw new Error("Flow plugin not available");
      }

      // Build boot config for sync manager
      const siteSettings = getWpSuite()?.siteSettings as
        | SiteSettings
        | undefined;
      const boot = {
        settings: plugin.settings,
        accountId: siteSettings?.accountId,
        siteId: siteSettings?.siteId,
        siteKey: siteSettings?.siteKey,
      };

      // Create sync manager
      const syncManager = new FormSyncManager(boot);

      // Perform sync
      const result = await syncManager.syncForm(formSource, {
        formId: currentMeta.formId || undefined,
        syncHash: currentMeta.syncHash || undefined,
        syncStatus: currentMeta.syncStatus,
        lastSynced: currentMeta.lastSynced || undefined,
        lastError: currentMeta.lastError || undefined,
        sourceKind: currentMeta.sourceKind,
      });

      if (result.success) {
        const syncedFormId = result.formId || currentMeta.formId || null;

        // Update sync metadata (non-critical, so we catch errors)
        try {
          await updateFormSyncMeta(postId, {
            formId: result.formId || currentMeta.formId || null,
            syncHash: result.syncHash || null,
            syncStatus: "synced",
            lastSynced: new Date().toISOString(),
            lastError: null,
          });
        } catch (metaError) {
          console.warn(
            "Failed to persist sync metadata, but sync was successful:",
            metaError,
          );
        }

        setSyncStatus({
          status: "synced",
          formId: syncedFormId,
          lastError: null,
          lastSynced: new Date().toISOString(),
        });

        // Update block attributes with formId
        if (syncedFormId && setAttributes) {
          setAttributes({ formId: syncedFormId });
        }

        lastSyncHashRef.current = result.syncHash || null;
      } else {
        // Update error metadata (non-critical)
        try {
          await updateFormSyncMeta(postId, {
            syncStatus: "error",
            lastError: result.error || "Unknown sync error",
          });
        } catch (metaError) {
          console.warn("Failed to persist error metadata:", metaError);
        }

        setSyncStatus({
          status: "error",
          formId: currentMeta.formId || null,
          lastError: result.error || "Unknown sync error",
          lastSynced: currentMeta.lastSynced || null,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed";

      try {
        const { updateFormSyncMeta } = await import(
          "../../../admin/src/api/sync-meta-api"
        );
        await updateFormSyncMeta(postId, {
          syncStatus: "error",
          lastError: errorMessage,
        });
      } catch (metaError) {
        console.error("Failed to update error metadata:", metaError);
      }

      setSyncStatus((prev) => ({
        ...prev,
        status: "error",
        lastError: errorMessage,
      }));
    } finally {
      syncInProgressRef.current = false;
    }
  }, [enabled, postId, formAttributes, fields, setAttributes]);

  /**
   * Trigger sync when post is saved (but not autosaved)
   */
  useEffect(() => {
    if (isSavingPost && !isAutosavingPost && enabled) {
      performSync();
    }
  }, [isSavingPost, isAutosavingPost, enabled, performSync]);

  /**
   * Load initial sync status from post meta
   */
  useEffect(() => {
    // Only load metadata if sync is enabled
    if (!enabled) {
      setSyncStatus({
        status: "idle",
        formId: null,
        lastError: null,
        lastSynced: null,
      });
      return;
    }

    const loadSyncStatus = async () => {
      try {
        const { getFormSyncMeta } = await import(
          "../../../admin/src/api/sync-meta-api"
        );
        const meta = await getFormSyncMeta(postId);

        // Clear error status on editor load - errors are only relevant during active sync
        // When opening the editor, we start fresh with idle status
        setSyncStatus({
          status: meta.syncStatus === "syncing" ? "syncing" : "idle",
          formId: meta.formId || null,
          lastError: null, // Clear previous errors
          lastSynced: meta.lastSynced || null,
        });

        // Update block attributes with formId from metadata
        if (meta.formId && setAttributes && !formAttributes.formId) {
          setAttributes({ formId: meta.formId });
        }
      } catch (error) {
        console.error("Failed to load sync status:", error);
        // Set default idle status if metadata fetch fails
        setSyncStatus({
          status: "idle",
          formId: null,
          lastError: null,
          lastSynced: null,
        });
      }
    };

    loadSyncStatus();
  }, [postId, enabled, setAttributes, formAttributes.formId]);

  return {
    syncStatus,
    performSync,
  };
}
