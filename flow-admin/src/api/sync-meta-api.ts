/**
 * API client for managing form sync metadata stored in WordPress post meta.
 *
 * These endpoints provide access to metadata used for tracking backend synchronization
 * state for individual form posts.
 */

import { getFlowPlugin } from "@smart-cloud/flow-core";

export interface FormSyncMetadata {
  formId: string | null;
  syncHash: string | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  lastSynced: string | null; // ISO 8601 timestamp
  lastError: string | null;
  sourceKind: "post" | "pattern" | "reusable_block";
}

/**
 * Fetch sync metadata for a specific form post.
 *
 * @param postId WordPress post ID
 * @returns Current sync metadata
 */
export async function getFormSyncMeta(
  postId: number,
): Promise<FormSyncMetadata> {
  const response = await fetch(
    `/wp-json/smartcloud-flow/v1/forms/${postId}/sync-meta`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": getFlowPlugin()!.nonce || "",
      },
      credentials: "same-origin",
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch sync metadata: ${error}`);
  }

  return response.json();
}

/**
 * Update sync metadata for a specific form post.
 *
 * Only provided fields will be updated. Omitted fields remain unchanged.
 *
 * @param postId WordPress post ID
 * @param updates Partial metadata to update
 * @returns Updated sync metadata
 */
export async function updateFormSyncMeta(
  postId: number,
  updates: Partial<FormSyncMetadata>,
): Promise<FormSyncMetadata> {
  const response = await fetch(
    `/wp-json/smartcloud-flow/v1/forms/${postId}/sync-meta`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": getFlowPlugin()!.nonce || "",
      },
      credentials: "same-origin",
      body: JSON.stringify(updates),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update sync metadata: ${error}`);
  }

  return response.json();
}
