export type FlowRequestErrorKind =
  | "cancelled"
  | "human-verification"
  | "authorization"
  | "throttled"
  | "validation"
  | "network"
  | "server"
  | "general";

export type FlowRequestErrorDetails = {
  kind: FlowRequestErrorKind;
  status?: number;
  code?: string;
  safeMessage?: string;
  requestId?: string;
};

export type FlowRequestErrorFeedback = {
  message: string | null;
  details: FlowRequestErrorDetails | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  })
    .join("")
    .trim();
  return normalized ? normalized.slice(0, 400) : undefined;
}

function asStatus(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 599
    ? parsed
    : undefined;
}

function parsePayload(value: unknown): UnknownRecord | null {
  const record = asRecord(value);
  if (record) return record;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const candidates = [trimmed];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return asRecord(JSON.parse(candidate));
    } catch {
      // Continue with the next safe JSON candidate.
    }
  }
  return null;
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (headers && typeof (headers as Headers).get === "function") {
    return asNonEmptyString((headers as Headers).get(name));
  }
  const record = asRecord(headers);
  if (!record) return undefined;
  const entry = Object.entries(record).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return asNonEmptyString(entry?.[1]);
}

function collectErrorRecords(error: unknown): UnknownRecord[] {
  const records: UnknownRecord[] = [];
  const visited = new Set<unknown>();
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current && !visited.has(current); depth++) {
    visited.add(current);
    const record = asRecord(current);
    if (!record) break;
    records.push(record);

    const response = asRecord(record.response);
    if (response) records.push(response);
    const body = parsePayload(response?.body ?? record.body ?? response?.data);
    if (body) {
      records.push(body);
      const nestedError = asRecord(body.error);
      if (nestedError) records.push(nestedError);
    }

    const embedded = parsePayload(record.message);
    if (embedded) {
      records.push(embedded);
      const nestedError = asRecord(embedded.error);
      if (nestedError) records.push(nestedError);
    }

    current = record.cause;
  }
  return records;
}

export function isFlowRequestAbort(error: unknown): boolean {
  return collectErrorRecords(error).some((record) => {
    const name = asNonEmptyString(record.name) ?? "";
    const code = asNonEmptyString(record.code) ?? "";
    const message = asNonEmptyString(record.message) ?? "";
    return (
      name === "AbortError" ||
      code === "ABORT_ERR" ||
      /\b(?:abort(?:ed)?|cancel(?:led|ed)?)\b/i.test(message)
    );
  });
}

export function normalizeFlowRequestError(
  error: unknown,
): FlowRequestErrorDetails {
  if (isFlowRequestAbort(error)) return { kind: "cancelled" };

  const records = collectErrorRecords(error);
  const status = records
    .map((record) =>
      asStatus(
        record.status ??
          record.statusCode ??
          asRecord(record.$metadata)?.httpStatusCode,
      ),
    )
    .find((value) => value !== undefined);
  const code = records
    .map((record) => asNonEmptyString(record.code ?? record.errorCode))
    .find(Boolean);
  const safeMessage = records
    .map((record) =>
      parsePayload(record.message)
        ? undefined
        : asNonEmptyString(record.message),
    )
    .find(Boolean);
  const requestId =
    records
      .map((record) =>
        asNonEmptyString(
          record.requestId ??
            record.requestID ??
            record.request_id ??
            asRecord(record.$metadata)?.requestId,
        ),
      )
      .find(Boolean) ??
    records
      .map((record) =>
        headerValue(
          record.headers ?? asRecord(record.response)?.headers,
          "x-request-id",
        ),
      )
      .find(Boolean);

  const combined = `${(code ?? "").toUpperCase()} ${safeMessage ?? ""}`;
  let kind: FlowRequestErrorKind = "general";
  if (/HUMAN_VERIFICATION|RECAPTCHA|CAPTCHA/.test(combined)) {
    kind = "human-verification";
  } else if (
    status === 401 ||
    status === 403 ||
    /UNAUTH|FORBIDDEN|ACCESS_DENIED|PERMISSION/.test(combined)
  ) {
    kind = "authorization";
  } else if (status === 429 || /THROTTL|RATE_LIMIT|TOO_MANY/.test(combined)) {
    kind = "throttled";
  } else if (
    status === 400 ||
    status === 409 ||
    status === 422 ||
    /VALIDATION|INVALID_REQUEST/.test(combined)
  ) {
    kind = "validation";
  } else if (
    status === undefined &&
    (error instanceof TypeError ||
      /NETWORK|FAILED TO FETCH|LOAD FAILED|CONNECTION/.test(combined))
  ) {
    kind = "network";
  } else if (status !== undefined && status >= 500) {
    kind = "server";
  }

  return { kind, status, code, safeMessage, requestId };
}

export function getFlowRequestErrorMessage(
  details: FlowRequestErrorDetails,
  translate: (message: string) => string = (message) => message,
  generalFallback?: string,
): string {
  const messages: Record<FlowRequestErrorKind, string> = {
    cancelled: "",
    "human-verification":
      "We couldn't verify that you're human. Please try again.",
    authorization:
      "You are not authorized to submit this form. Please sign in or contact the site owner.",
    throttled: "Too many requests. Please wait a moment and try again.",
    validation:
      "The form could not be submitted. Review the highlighted fields and try again.",
    network:
      "We couldn't reach the form service. Check your connection and try again.",
    server: "The form service is temporarily unavailable. Please try again.",
    general: generalFallback || "Something went wrong. Please try again.",
  };
  return details.kind === "general" && generalFallback
    ? generalFallback
    : translate(messages[details.kind]);
}

export function clearFlowRequestErrorFeedback(): FlowRequestErrorFeedback {
  return { message: null, details: null };
}

export function createFlowRequestErrorFeedback(
  error: unknown,
  translate?: (message: string) => string,
  generalFallback?: string,
): FlowRequestErrorFeedback {
  const details = normalizeFlowRequestError(error);
  return {
    message:
      details.kind === "cancelled"
        ? null
        : getFlowRequestErrorMessage(details, translate, generalFallback),
    details,
  };
}

export class FlowRequestError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly response?: { body?: unknown; headers?: Headers };

  constructor(
    message: string,
    details: {
      status?: number;
      code?: string;
      requestId?: string;
      body?: unknown;
      headers?: Headers;
    } = {},
  ) {
    super(message);
    this.name = "FlowRequestError";
    this.status = details.status;
    this.code = details.code;
    this.requestId = details.requestId;
    this.response = { body: details.body, headers: details.headers };
  }
}

export async function createFlowResponseError(
  response: Response,
): Promise<FlowRequestError> {
  let body: unknown;
  try {
    const text = await response.text();
    body = parsePayload(text) ?? text;
  } catch {
    body = undefined;
  }
  const bodyRecord = asRecord(body);
  const nestedError = asRecord(bodyRecord?.error);
  const code = asNonEmptyString(
    nestedError?.code ?? bodyRecord?.code ?? bodyRecord?.errorCode,
  );
  const safeMessage = asNonEmptyString(
    nestedError?.message ?? bodyRecord?.message,
  );
  const requestId =
    asNonEmptyString(
      nestedError?.requestId ??
        bodyRecord?.requestId ??
        bodyRecord?.request_id,
    ) ?? headerValue(response.headers, "x-request-id");
  return new FlowRequestError(
    safeMessage || `Request failed (${response.status})`,
    {
      status: response.status,
      code,
      requestId,
      body,
      headers: response.headers,
    },
  );
}
