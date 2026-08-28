import assert from "node:assert/strict";
import test from "node:test";

import { buildSyncMetaUrl } from "../src/form/sync-meta-api.ts";

test("sync metadata uses the Flow REST URL for a multisite subsite", () => {
  assert.equal(
    buildSyncMetaUrl(
      "http://localhost:10017/editorial-journal/wp-json/smartcloud-flow/v1/",
      10,
    ),
    "http://localhost:10017/editorial-journal/wp-json/smartcloud-flow/v1/forms/10/sync-meta",
  );
});

test("sync metadata rejects a missing REST URL", () => {
  assert.throws(
    () => buildSyncMetaUrl("  ", 10),
    /without a Flow REST URL/,
  );
});
