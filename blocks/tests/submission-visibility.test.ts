import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldRenderFormFields,
  shouldShowFormAgainButton,
} from "../src/runtime/submission-visibility.ts";

test("hideFormOnSuccess controls whether fields remain visible", () => {
  assert.equal(shouldRenderFormFields("success", true), false);
  assert.equal(shouldRenderFormFields("success", false), true);
  assert.equal(shouldRenderFormFields("idle", true), true);
});

test("a configured restart label exposes the reset button after success", () => {
  assert.equal(
    shouldShowFormAgainButton({
      status: "success",
      hideFormOnSuccess: true,
      label: "Add another comment",
    }),
    true,
  );
  assert.equal(
    shouldShowFormAgainButton({
      status: "success",
      hideFormOnSuccess: true,
      label: " ",
    }),
    false,
  );
});
