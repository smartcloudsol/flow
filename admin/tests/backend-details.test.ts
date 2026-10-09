import assert from "node:assert/strict";
import test from "node:test";
import { createBackendDetails, type BackendDetailsDependencies } from "../src/backend-details.ts";

const signal = () => new AbortController().signal;
function fixture(overrides: Partial<BackendDetailsDependencies> = {}) {
  const requests: Array<{ path: string; options: unknown }> = [];
  const dependencies: BackendDetailsDependencies = {
    config: async () => ({ backendApiName: "flow-api" }),
    gateyEndpoint: async () => "https://secondary.backend.test/stage",
    gatey: () => ({ get(request) {
      requests.push({ path: request.path, options: request.options });
      return { cancel() {}, response: Promise.resolve({ body: { json: async () => ({ items: [] }) } }) };
    } }),
    sessionAvailable: async () => true,
    fetch: async () => { throw new Error("Unexpected fetch transport"); },
    site: () => ({ accountId: "account one", siteId: "site/one" }),
    ...overrides,
  };
  return { requests, details: createBackendDetails(dependencies) };
}

test("collapsed metadata resolves the routed Gatey endpoint without inventory requests", async () => {
  const { requests, details } = fixture();
  assert.deepEqual(await details(signal(), false), {
    mode: "gatey", transport: "gatey", apiName: "flow-api", endpoint: "https://secondary.backend.test/stage",
  });
  assert.equal(requests.length, 0);
});

test("configuration display strips credentials and query fragments from custom endpoints", async () => {
  const { details } = fixture({
    config: async () => ({ backendTransport: "fetch", backendBaseUrl: "https://user:password@backend.test/stage/?key=secret#token" }),
    gateyEndpoint: async () => { throw new Error("Must not resolve Gatey"); },
  });
  assert.deepEqual(await details(signal()), {
    mode: "custom-url", transport: "fetch", apiName: undefined, endpoint: "https://backend.test/stage",
  });
});

test("valid empty inventory has three real zero counts and never calls the old process-maps route", async () => {
  const { requests, details } = fixture();
  const result = await details(signal(), true);
  assert.deepEqual(result.inventory, {
    workflows: { count: 0 }, templates: { count: 0 }, webhooks: { count: 0 },
  });
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.match(request.path, /\?accountId=account\+one&siteId=site%2Fone&limit=100$/);
    assert.doesNotMatch(request.path, /process-map/);
    assert.deepEqual(request.options, { headers: {}, retryStrategy: { strategy: "no-retry" } });
  }
});

test("pagination deduplicates identifiers, includes disabled saved items", async () => {
  const requests: string[] = [];
  const { details } = fixture({ gatey: () => ({ get(request) {
    requests.push(request.path);
    const url = new URL(request.path, "https://backend.test");
    const page = url.searchParams.has("cursor") ? 2 : 1;
    const result = url.pathname === "/admin/workflows"
        ? { items: [{ workflowId: "a", enabled: false }, ...(page === 2 ? [{ workflowId: "b", enabled: true }] : [])], cursor: page === 1 ? "next/+" : null }
        : url.pathname === "/admin/templates"
          ? { items: [{ templateKey: "a", enabled: false }] }
          : { items: [{ webhookKey: "a", enabled: false }] };
    return { cancel() {}, response: Promise.resolve({ body: { json: async () => result } }) };
  } }) });
  assert.deepEqual((await details(signal(), true)).inventory, {
    workflows: { count: 2 }, templates: { count: 1 }, webhooks: { count: 1 },
  });
  assert.equal(requests.length, 4);
  assert.equal(requests.filter((path) => path.endsWith("&cursor=next%2F%2B")).length, 1);
});

test("an unavailable read-only list is unsupported while other categories succeed", async () => {
  const { details } = fixture({ gatey: () => ({ get(request) {
    return { cancel() {}, response: request.path.startsWith("/admin/templates")
      ? Promise.reject({ response: { statusCode: 404 }, message: "Sensitive server error" })
      : Promise.resolve({ body: { json: async () => ({ items: [] }) } }) };
  } }) });
  assert.deepEqual((await details(signal(), true)).inventory, {
    workflows: { count: 0 }, templates: { unavailable: "unsupported" }, webhooks: { count: 0 },
  });
});

test("custom URL inventory uses bodyless cancellable GETs with omitted cookies", async () => {
  const requests: Array<{ url: string; options: RequestInit | undefined }> = [];
  const { details } = fixture({
    config: async () => ({ backendTransport: "fetch", backendBaseUrl: "https://backend.test/stage/" }),
    gatey: () => { throw new Error("Unexpected Gatey transport"); },
    sessionAvailable: async () => { throw new Error("Custom transport has its own authentication"); },
    fetch: async (url, options) => {
      requests.push({ url: String(url), options });
      return new Response(JSON.stringify({ items: [] }));
    },
  });
  const controller = new AbortController();
  assert.equal((await details(controller.signal, true)).inventory?.workflows?.count, 0);
  assert.equal(requests.length, 3);
  for (const { url, options } of requests) {
    assert.match(url, /^https:\/\/backend.test\/stage\/admin\//);
    assert.equal(options?.method, "GET");
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.signal, controller.signal);
    assert.equal("body" in options!, false);
  }
});

test("category errors expose safe unavailable states and preserve successful categories", async () => {
  const { details } = fixture({
    config: async () => ({ backendBaseUrl: "https://backend.test" }),
    fetch: async (url) => String(url).includes("/workflows?")
      ? new Response("Sensitive unauthorized response", { status: 403 })
      : new Response(JSON.stringify({ items: [] })),
  });
  const result = await details(signal(), true);
  assert.deepEqual(result.inventory?.workflows, { unavailable: "failed" });
  assert.deepEqual(result.inventory?.templates, { count: 0 });
  assert.doesNotMatch(JSON.stringify(result), /Sensitive|unauthorized/);
});

test("repeated pagination cursors stop at a partial lower-bound count", async () => {
  let calls = 0;
  const { details } = fixture({ gatey: () => ({ get(request) {
    calls++;
    const result = request.path.startsWith("/admin/workflows")
      ? { items: [{ workflowId: `page-${calls}` }], cursor: "repeated" }
      : { items: [] };
    return { cancel() {}, response: Promise.resolve({ body: { json: async () => result } }) };
  } }) });
  assert.deepEqual((await details(signal(), true)).inventory?.workflows, { count: 2, partial: true });
  assert.equal(calls, 4);
});

test("an absent Cognito session never starts protected inventory calls", async () => {
  const { requests, details } = fixture({ sessionAvailable: async () => false });
  assert.deepEqual((await details(signal(), true)).inventory?.workflows, { unavailable: "failed" });
  assert.equal(requests.length, 0);
});

test("abort cancels every in-flight inventory operation and rejects stale results", async () => {
  const controller = new AbortController();
  let cancelled = 0;
  const resolvers: Array<(value: { body: { json: () => Promise<unknown> } }) => void> = [];
  let started!: () => void;
  const allStarted = new Promise<void>((resolve) => { started = resolve; });
  const { details } = fixture({ gatey: () => ({ get() {
    const response = new Promise<{ body: { json: () => Promise<unknown> } }>((resolve) => { resolvers.push(resolve); });
    if (resolvers.length === 3) started();
    return { cancel: () => { cancelled++; }, response };
  } }) });
  const pending = details(controller.signal, true);
  await allStarted;
  controller.abort();
  for (const resolve of resolvers) resolve({ body: { json: async () => ({ items: [] }) } });
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(cancelled, 3);
  const untouched = fixture();
  await assert.rejects(untouched.details(controller.signal, true), { name: "AbortError" });
  assert.equal(untouched.requests.length, 0);
});
