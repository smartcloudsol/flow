import assert from "node:assert/strict";
import test from "node:test";

import { decodeAdjacentFormId } from "../src/discussion/runtime-config.ts";
import { resolveDiscussionAuthState } from "../src/runtime/discussion-auth.ts";

test("discussion can inherit the synchronized ID from an adjacent Flow form", () => {
  const encoded = btoa(JSON.stringify({ formId: " form-53-okkmfir " }));

  assert.equal(decodeAdjacentFormId(encoded), "form-53-okkmfir");
});

test("discussion ignores malformed or unsynchronized adjacent form configs", () => {
  assert.equal(decodeAdjacentFormId("not-base64"), undefined);
  assert.equal(decodeAdjacentFormId(btoa(JSON.stringify({ formId: null }))), undefined);
});

test("discussion auth follows the initialized Gatey runtime", async () => {
  const previous = globalThis.WpSuite;
  globalThis.WpSuite = {
    plugins: {
      gatey: {
        status: "available",
        cognito: {
          isAuthenticated: async () => true,
          getGroups: async () => ["members"],
        },
      },
    },
  } as typeof globalThis.WpSuite;

  try {
    assert.deepEqual(
      await resolveDiscussionAuthState({
        mode: "required",
        allowedGroups: ["members"],
      }),
      { loaded: true, authenticated: true, canComment: true },
    );
  } finally {
    globalThis.WpSuite = previous;
  }
});
