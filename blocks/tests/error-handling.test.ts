import assert from "node:assert/strict";
import test from "node:test";
import {
  clearFlowRequestErrorFeedback,
  createFlowRequestErrorFeedback,
  createFlowResponseError,
  normalizeFlowRequestError,
  shouldScrollFlowRequestFailureIntoView,
} from "../src/runtime/errorHandling.ts";

test("normalizes reCAPTCHA 403 envelopes without exposing token data", async () => {
  const response = new Response(
    JSON.stringify({
      error: {
        code: "HUMAN_VERIFICATION_FAILED",
        classification: "RISK_REJECTED",
        message: "reCAPTCHA verification failed",
        retryable: true,
        requestId: "req-flow-403",
        token: "sensitive-token",
      },
    }),
    { status: 403 },
  );
  const error = await createFlowResponseError(response);
  const feedback = createFlowRequestErrorFeedback(error);

  assert.deepEqual(feedback.details, {
    kind: "human-verification",
    status: 403,
    code: "HUMAN_VERIFICATION_FAILED",
    safeMessage: "reCAPTCHA verification failed",
    requestId: "req-flow-403",
    classification: "RISK_REJECTED",
    retryable: true,
  });
  assert.equal(
    feedback.message,
    "We couldn't verify that you're human. Please try again.",
  );
  assert.doesNotMatch(JSON.stringify(feedback), /sensitive-token/);
});

test("keeps provider outages distinct from ordinary backend failures", async () => {
  const response = new Response(
    JSON.stringify({
      error: {
        code: "HUMAN_VERIFICATION_UNAVAILABLE",
        classification: "PROVIDER_UNAVAILABLE",
        message: "reCAPTCHA verification is temporarily unavailable",
        retryable: true,
        requestId: "req-flow-503",
      },
    }),
    { status: 503 },
  );
  const feedback = createFlowRequestErrorFeedback(
    await createFlowResponseError(response),
  );

  assert.equal(feedback.details?.kind, "human-verification");
  assert.equal(
    feedback.details?.classification,
    "PROVIDER_UNAVAILABLE",
  );
  assert.equal(feedback.details?.retryable, true);
  assert.equal(
    feedback.message,
    "Human verification is temporarily unavailable. Please try again.",
  );
});

test("continues to recognize the legacy Flow reCAPTCHA response during rollout", async () => {
  const response = new Response(
    JSON.stringify({
      message: "reCAPTCHA verification failed",
      details: { success: false, score: 0.1, reasons: [] },
    }),
    { status: 403 },
  );
  const details = normalizeFlowRequestError(
    await createFlowResponseError(response),
  );

  assert.equal(details.kind, "human-verification");
  assert.equal(details.classification, undefined);
});

test("categorizes validation, throttling, network, and backend failures", () => {
  assert.equal(
    normalizeFlowRequestError({ status: 422, code: "VALIDATION_ERROR" }).kind,
    "validation",
  );
  assert.equal(
    normalizeFlowRequestError({ status: 429, code: "RATE_LIMITED" }).kind,
    "throttled",
  );
  assert.equal(
    normalizeFlowRequestError(new TypeError("Failed to fetch")).kind,
    "network",
  );
  assert.equal(normalizeFlowRequestError({ status: 503 }).kind, "server");
});

test("treats cancellation separately and clears stale retry feedback", () => {
  assert.deepEqual(
    createFlowRequestErrorFeedback(
      Object.assign(new Error("The operation was aborted"), {
        name: "AbortError",
      }),
    ),
    { message: null, details: { kind: "cancelled" } },
  );

  const failed = createFlowRequestErrorFeedback({ status: 503 });
  assert.ok(failed.message);
  assert.deepEqual(clearFlowRequestErrorFeedback(), {
    message: null,
    details: null,
  });
});

test("scrolls handled final-submit failures into view", () => {
  const failed = createFlowRequestErrorFeedback({ status: 503 });
  const cancelled = createFlowRequestErrorFeedback(
    Object.assign(new Error("The operation was aborted"), {
      name: "AbortError",
    }),
  );

  assert.equal(
    shouldScrollFlowRequestFailureIntoView("submit", failed),
    true,
  );
  assert.equal(
    shouldScrollFlowRequestFailureIntoView("save-draft", failed),
    false,
  );
  assert.equal(
    shouldScrollFlowRequestFailureIntoView("submit", cancelled),
    false,
  );
});

test("uses custom form copy only for uncategorized errors", () => {
  assert.equal(
    createFlowRequestErrorFeedback(
      new Error("Unknown failure"),
      undefined,
      "Custom form error",
    ).message,
    "Custom form error",
  );
  assert.equal(
    createFlowRequestErrorFeedback(
      { status: 429 },
      undefined,
      "Custom form error",
    ).message,
    "Too many requests. Please wait a moment and try again.",
  );
});
