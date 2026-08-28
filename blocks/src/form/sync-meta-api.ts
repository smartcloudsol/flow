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

function assertValidPostId(postId: number): number {
  if (!Number.isFinite(postId)) {
    throw new Error(
      "Cannot manage form sync metadata without a numeric post ID.",
    );
  }

  return postId;
}

export function buildSyncMetaUrl(restUrl: string, postId: number): string {
  const resolvedPostId = assertValidPostId(postId);
  const normalizedRestUrl = restUrl.trim().replace(/\/+$/, "");

  if (!normalizedRestUrl) {
    throw new Error("Cannot manage form sync metadata without a Flow REST URL.");
  }

  return `${normalizedRestUrl}/forms/${resolvedPostId}/sync-meta`;
}

function getSyncRequestContext(postId: number): {
  url: string;
  nonce: string;
} {
  const plugin = getFlowPlugin();

  if (!plugin) {
    throw new Error("Cannot manage form sync metadata before Flow is ready.");
  }

  return {
    url: buildSyncMetaUrl(plugin.restUrl, postId),
    nonce: plugin.nonce || "",
  };
}

export async function getFormSyncMeta(
  postId: number,
): Promise<FormSyncMetadata> {
  const request = getSyncRequestContext(postId);
  const response = await fetch(request.url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": request.nonce,
    },
    credentials: "same-origin",
  });

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
  const request = getSyncRequestContext(postId);
  const response = await fetch(request.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": request.nonce,
    },
    credentials: "same-origin",
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update sync metadata: ${error}`);
  }

  return response.json();
}
