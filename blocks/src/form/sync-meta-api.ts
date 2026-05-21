/**
 * API client for managing form sync metadata stored in WordPress post meta.
 */

import { getFlowPlugin } from "@smart-cloud/flow-core";

export interface FormSyncMetadata {
  formId: string | null;
  syncHash: string | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  lastSynced: string | null;
  lastError: string | null;
  sourceKind: "post" | "pattern" | "reusable_block";
}

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
