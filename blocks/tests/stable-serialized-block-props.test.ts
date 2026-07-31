import assert from "node:assert/strict";
import test from "node:test";

import {
  getStableFlowSerializedClassName,
  stabilizeFlowSerializedBlockProps,
} from "../src/shared/stable-serialized-block-props.ts";

test("serialized Flow field wrappers discard transient generated classes", () => {
  const props = stabilizeFlowSerializedBlockProps(
    {
      className: "wp-block-smartcloud-flow-text-field ep-random-123",
      "data-smartcloud-flow-form-field": "payload",
    },
    { name: "smartcloud-flow/text-field" },
    {
      className: "customer-class",
      classNames: ["flow-wide", "customer-class"],
      epGeneratedClass: "ep-random-123",
    },
  );

  assert.equal(
    props.className,
    "wp-block-smartcloud-flow-text-field flow-wide customer-class",
  );
});

test("unrelated save output remains untouched", () => {
  const props = { className: "third-party" };
  assert.equal(
    stabilizeFlowSerializedBlockProps(
      props,
      { name: "core/group" },
      {},
    ),
    props,
  );
});

test("stable class generation is deterministic", () => {
  assert.equal(
    getStableFlowSerializedClassName("smartcloud-flow/textarea-field", {
      classNames: ["a", "b", "a"],
    }),
    "wp-block-smartcloud-flow-textarea-field a b",
  );
});

