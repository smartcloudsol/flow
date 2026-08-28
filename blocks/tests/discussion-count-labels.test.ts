import assert from "node:assert/strict";
import test from "node:test";
import {
  discussionItemCount,
  formatDiscussionCount,
} from "../src/discussion/count-labels.ts";
import type { PublicDiscussionItem } from "../src/discussion/types.ts";

function item(overrides: Partial<PublicDiscussionItem>): PublicDiscussionItem {
  return {
    submissionId: "root",
    parentSubmissionId: null,
    threadRootSubmissionId: "root",
    replyDepth: 0,
    createdAt: "2026-08-27T08:21:00.000Z",
    renderState: "visible",
    directReplyCount: 0,
    totalReplyCount: 0,
    ...overrides,
  };
}

test("discussion count includes every loaded root and its complete reply tree", () => {
  assert.equal(
    discussionItemCount([
      item({ submissionId: "one", totalReplyCount: 3 }),
      item({ submissionId: "two", totalReplyCount: 1 }),
    ]),
    6,
  );
});

test("count labels support authored singular, plural, legacy, and paginated copy", () => {
  assert.equal(
    formatDiscussionCount({
      count: 1,
      singular: "{count} reply",
      plural: "{count} replies",
    }),
    "1 reply",
  );
  assert.equal(
    formatDiscussionCount({
      count: 4,
      singular: "{count} reply",
      plural: "{count} replies",
      hasMore: true,
    }),
    "4+ replies",
  );
  assert.equal(
    formatDiscussionCount({
      count: 3,
      singular: "Load reply",
      plural: "Load replies",
    }),
    "Load replies (3)",
  );
});
