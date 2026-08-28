import {
  BackendError,
  dispatchBackend,
  resolveBackend,
  type ContentReference,
} from "@smart-cloud/flow-core";
import type {
  DiscussionRatingOperator,
  PublicDiscussionItem,
  PublicDiscussionPage,
} from "./types";

const MAX_READ_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 200;

function getStatusCode(error: unknown): number | undefined {
  if (error instanceof BackendError) {
    return error.statusCode;
  }
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const record = error as Record<string, unknown>;
  const response =
    record.response && typeof record.response === "object"
      ? (record.response as Record<string, unknown>)
      : undefined;
  const status = record.statusCode ?? record.status ?? response?.statusCode;
  return typeof status === "number" ? status : undefined;
}

function isRetryableReadError(error: unknown): boolean {
  if (error instanceof BackendError && error.retryable) {
    return true;
  }
  const status = getStatusCode(error);
  return status === 429 || (status !== undefined && status >= 500);
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("The operation was aborted", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new DOMException("The operation was aborted", "AbortError"));
    };
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function fetchDiscussionPage(input: {
  formId: string;
  contentRef: ContentReference;
  parentSubmissionId?: string;
  limit: number;
  cursor?: string;
  sortDir: "asc" | "desc";
  replyPreviewLimit?: number;
  includeCapabilities?: boolean;
  ratingOperator?: Exclude<DiscussionRatingOperator, "all">;
  rating?: number;
  signal?: AbortSignal;
}): Promise<PublicDiscussionPage> {
  const backend = await resolveBackend();
  if (!backend.available) {
    throw new Error(backend.reason || "Flow backend is unavailable");
  }
  const parentPath = input.parentSubmissionId
    ? `/${encodeURIComponent(input.parentSubmissionId)}/replies`
    : "";
  for (let attempt = 0; attempt < MAX_READ_ATTEMPTS; attempt += 1) {
    try {
      return (await dispatchBackend(
        {
          backendAvailable: true,
          backendTransport: backend.transport,
          backendApiName: backend.apiName,
          backendBaseUrl: backend.baseUrl,
          reason: "Public discussion read",
        },
        "frontend",
        `/forms/${encodeURIComponent(input.formId)}/discussion${parentPath}`,
        "GET",
        undefined,
        {
          signal: input.signal,
          humanVerification: false,
          query: {
            targetNamespace: input.contentRef.namespace,
            targetType: input.contentRef.type,
            targetId: input.contentRef.id,
            limit: input.limit,
            sortDir: input.sortDir,
            ...(input.cursor ? { cursor: input.cursor } : {}),
            ...(!input.parentSubmissionId &&
            input.replyPreviewLimit !== undefined
              ? { replyPreviewLimit: input.replyPreviewLimit }
              : {}),
            ...(input.includeCapabilities
              ? { includeCapabilities: true }
              : {}),
            ...(input.ratingOperator && input.rating !== undefined
              ? {
                  ratingOperator: input.ratingOperator,
                  rating: input.rating,
                }
              : {}),
          },
        },
      )) as PublicDiscussionPage;
    } catch (error) {
      if (
        attempt === MAX_READ_ATTEMPTS - 1 ||
        !isRetryableReadError(error)
      ) {
        throw error;
      }
      const exponentialDelay = INITIAL_RETRY_DELAY_MS * 2 ** attempt;
      const jitter = Math.floor(Math.random() * INITIAL_RETRY_DELAY_MS);
      await waitForRetry(exponentialDelay + jitter, input.signal);
    }
  }

  throw new Error("Discussion read retry loop completed unexpectedly");
}

export async function mutateDiscussionItem(input: {
  method: "PATCH" | "DELETE";
  formId: string;
  submissionId: string;
  contentRef: ContentReference;
  expectedUpdatedAt: string;
  body?: string;
  rating?: number | null;
}): Promise<{ item: PublicDiscussionItem }> {
  const backend = await resolveBackend();
  if (!backend.available) {
    throw new Error(backend.reason || "Flow backend is unavailable");
  }
  return (await dispatchBackend(
    {
      backendAvailable: true,
      backendTransport: backend.transport,
      backendApiName: backend.apiName,
      backendBaseUrl: backend.baseUrl,
      reason: "Discussion item mutation",
    },
    "frontend",
    `/forms/${encodeURIComponent(input.formId)}/discussion/${encodeURIComponent(input.submissionId)}`,
    input.method,
    {
      contentRef: input.contentRef,
      expectedUpdatedAt: input.expectedUpdatedAt,
      ...(input.method === "PATCH"
        ? {
            body: input.body ?? "",
            ...(input.rating !== undefined ? { rating: input.rating } : {}),
          }
        : {}),
    },
    {
      humanVerification: false,
    },
  )) as { item: PublicDiscussionItem };
}
