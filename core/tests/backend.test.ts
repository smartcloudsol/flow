import assert from "node:assert/strict";
import test from "node:test";
import { dispatchBackend } from "../src/protected/backend";

test("fetch GET sends query parameters without a body", async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), ...(init ? { init } : {}) };
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await dispatchBackend(
      {
        backendAvailable: true,
        backendTransport: "fetch",
        backendBaseUrl: "https://api.example.test",
        reason: "test",
      },
      "frontend",
      "/forms/form-1/discussion",
      "GET",
      { ignored: true },
      { query: { targetNamespace: "docs", targetType: "page", targetId: "1" } },
    );
    assert.equal(request?.init?.body, undefined);
    assert.match(request?.url ?? "", /targetNamespace=docs/);
    assert.equal(
      new Headers(request?.init?.headers).has("X-Recaptcha-Token"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("structured backend errors preserve code, request id, and retryability", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          code: "INVALID_CURSOR",
          message: "Cursor mismatch",
          requestId: "req-1",
          retryable: false,
        },
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    )) as typeof fetch;
  try {
    await assert.rejects(
      dispatchBackend(
        {
          backendAvailable: true,
          backendTransport: "fetch",
          backendBaseUrl: "https://api.example.test",
          reason: "test",
        },
        "frontend",
        "/forms/form-1/discussion",
        "GET",
        undefined,
      ),
      (error: unknown) => {
        const backendError = error as {
          code?: string;
          requestId?: string;
          retryable?: boolean;
        };
        return (
          backendError.code === "INVALID_CURSOR" &&
          backendError.requestId === "req-1" &&
          backendError.retryable === false
        );
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
