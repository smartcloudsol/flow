import assert from "node:assert/strict";
import test from "node:test";
import { createBackendCheck, type BackendCheckDependencies } from "../src/backend-readiness.ts";

const valid = { items: [] };
function fixture(overrides: Partial<BackendCheckDependencies> = {}) {
  const requests: unknown[] = [];
  const dependencies: BackendCheckDependencies = {
    config: async () => ({ backendApiName: "customer-api" }),
    gatey: () => ({ get: (request) => {
      requests.push(request);
      return { cancel() {}, response: Promise.resolve({ body: { json: async () => valid } }) };
    } }),
    gateyApiConfigured: async () => true,
    sessionAvailable: async () => true,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify(valid), { headers: { "content-type": "application/json" } });
    },
    site: () => ({ accountId: "account one", siteId: "site/one" }),
    ...overrides,
  };
  return { requests, check: createBackendCheck(dependencies) };
}
const signal = () => new AbortController().signal;

test("checks configuration and session before issuing a protected GET", async () => {
  for (const [overrides, expected] of [
    [{ config: async () => ({}) }, "configure_backend"],
    [{ config: async () => ({ backendTransport: "fetch", backendBaseUrl: " " }) }, "configure_backend"],
    [{ gatey: () => undefined }, "gatey_missing"],
    [{ gateyApiConfigured: async () => false }, "configure_backend"],
    [{ sessionAvailable: async () => false }, "sign_in"],
    [{ sessionAvailable: async () => { throw new Error("private detail"); } }, "sign_in"],
  ] as const) {
    const { requests, check } = fixture(overrides);
    assert.equal(await check(signal()), expected);
    assert.equal(requests.length, 0);
  }
  const { requests, check } = fixture();
  assert.equal(await check(signal()), "ready");
  assert.equal(requests.length, 1);
  const request = requests[0] as { path: string; options: Record<string, unknown> };
  assert.match(request.path, /^\/admin\/forms\?accountId=account\+one&siteId=site%2Fone&limit=1$/);
  assert.equal("body" in request.options, false);
  assert.deepEqual(request.options.headers, {});
});

test("fetch sends a bodyless GET without imposing Gatey or leaking browser cookies", async () => {
  const { requests, check } = fixture({
    config: async () => ({ backendBaseUrl: "https://backend.test/" }),
    gatey: () => { throw new Error("must not use Gatey"); },
    sessionAvailable: async () => { throw new Error("must not use Cognito"); },
  });
  assert.equal(await check(signal()), "ready");
  const request = requests[0] as { url: string; options: RequestInit };
  assert.match(request.url, /^https:\/\/backend.test\/admin\//);
  assert.equal(request.options.method, "GET");
  assert.equal("body" in request.options, false);
  assert.equal(request.options.credentials, "omit");
});

test("API errors become safe actionable states without returning backend messages", async () => {
  for (const [status, expected] of [[401, "sign_in"], [403, "forbidden"], [404, "unsupported"], [500, "unreachable"]] as const) {
    const { check } = fixture({ gatey: () => ({ get: () => ({
      cancel() {}, response: Promise.reject({ response: { statusCode: status }, message: "private detail" }),
    }) }) });
    assert.equal(await check(signal()), expected);
    const fetched = fixture({ config: async () => ({ backendBaseUrl: "https://backend.test" }),
      fetch: async () => new Response("private detail", { status }) });
    assert.equal(await fetched.check(signal()), expected);
  }
});

test("HTTP 200 HTML or wrong JSON never verifies backend administration access", async () => {
  for (const response of ["<html>login</html>", "{}", "null", "[]"]) {
    const { check } = fixture({
      config: async () => ({ backendBaseUrl: "https://backend.test" }),
      fetch: async () => new Response(response),
    });
    assert.equal(await check(signal()), "unreachable");
  }
  const { check } = fixture({ config: async () => ({ backendBaseUrl: "https://backend.test" }),
    fetch: async () => { throw new TypeError("network private detail"); } });
  assert.equal(await check(signal()), "unreachable");
});

test("abort cancels the Gatey operation and never yields a stale success", async () => {
  const controller = new AbortController();
  let cancelled = 0;
  let resolve!: (value: { body: { json: () => Promise<unknown> } }) => void;
  let started!: () => void;
  const start = new Promise<void>((done) => { started = done; });
  const { check } = fixture({ gatey: () => ({ get: () => {
    started();
    return { cancel: () => { cancelled++; }, response: new Promise((done) => { resolve = done; }) };
  } }) });
  const pending = check(controller.signal);
  await start;
  controller.abort();
  resolve({ body: { json: async () => valid } });
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(cancelled, 1);
  const untouched = fixture();
  await assert.rejects(untouched.check(controller.signal), { name: "AbortError" });
  assert.equal(untouched.requests.length, 0);
});


test("a missing Gatey API registration is configuration guidance, not a sign-in failure", async () => {
  const { check } = fixture({ gatey: () => ({ get: () => {
    throw { name: "ApiNameNotFoundException", message: "private endpoint detail" };
  } }) });
  assert.equal(await check(signal()), "configure_backend");
});
