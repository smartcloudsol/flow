import assert from "node:assert/strict";
import test from "node:test";

import {
  canViewerReply,
  hasReachedMaxReplyDepth,
} from "../src/discussion/reply-policy.ts";
import {
  buildDiscussionRatingValues,
  normalizeDiscussionRatingValue,
} from "../src/discussion/rating-values.ts";
import type {
  DiscussionPolicy,
  PublicDiscussionItem,
} from "../src/discussion/types.ts";
import { extractCanonicalFormConfig } from "../src/form/form-extractor.ts";
import {
  applyHiddenFormField,
  omitReplyRatingValue,
} from "../src/runtime/discussion-fields.ts";
import type { FieldConfig } from "../src/shared/types.ts";

function item(
  overrides: Partial<PublicDiscussionItem> = {},
): PublicDiscussionItem {
  return {
    submissionId: "root",
    parentSubmissionId: null,
    threadRootSubmissionId: "root",
    replyDepth: 0,
    createdAt: "2026-08-28T08:00:00.000Z",
    renderState: "visible",
    directReplyCount: 0,
    totalReplyCount: 0,
    ...overrides,
  };
}

test("reply fallback follows the backend policy instead of a client hard limit", () => {
  const enabled: DiscussionPolicy = {
    allowReplies: true,
    maxReplyDepth: 1,
  };
  assert.equal(
    canViewerReply({ item: item(), policy: enabled, viewerCanComment: true }),
    true,
  );
  assert.equal(
    canViewerReply({
      item: item({ replyDepth: 1 }),
      policy: enabled,
      viewerCanComment: true,
    }),
    false,
  );
  assert.equal(hasReachedMaxReplyDepth(item({ replyDepth: 1 }), enabled), true);
  assert.equal(
    canViewerReply({
      item: item(),
      policy: { allowReplies: false, maxReplyDepth: 5 },
      viewerCanComment: true,
    }),
    false,
  );
});

test("viewer-specific capabilities override the anonymous reply fallback", () => {
  assert.equal(
    canViewerReply({
      item: item({
        capabilities: { canReply: false, canEdit: true, canDelete: true },
      }),
      policy: { allowReplies: true, maxReplyDepth: 5 },
      viewerCanComment: true,
    }),
    false,
  );
});

test("fractional ratings are represented as exact configured steps", () => {
  assert.deepEqual(buildDiscussionRatingValues(5, 2), [
    0.5,
    1,
    1.5,
    2,
    2.5,
    3,
    3.5,
    4,
    4.5,
    5,
  ]);
  assert.deepEqual(buildDiscussionRatingValues(5, 0), []);
  assert.equal(normalizeDiscussionRatingValue(5, 3, 1), 3);
  assert.equal(normalizeDiscussionRatingValue(4.4, 5, 2), 4.5);
});

test("reply mode recursively hides and removes the discussion rating field", () => {
  const fields = [
    {
      type: "group",
      children: [
        {
          type: "rating",
          name: "score",
          label: "Score",
          required: true,
          count: 5,
          fractions: 1,
        },
      ],
    },
  ] as unknown as FieldConfig[];
  const hidden = applyHiddenFormField(fields, "score", true) as unknown as Array<{
    children: Array<{ hidden?: boolean; required?: boolean }>;
  }>;
  assert.equal(hidden[0]?.children[0]?.hidden, true);
  assert.equal(hidden[0]?.children[0]?.required, false);
  assert.deepEqual(
    omitReplyRatingValue({ score: 5, comment: "Reply" }, "score", true),
    { comment: "Reply" },
  );
});

test("form extraction snapshots the recursively selected rating field", () => {
  const payload = extractCanonicalFormConfig(
    {
      postId: 10,
      postStatus: "publish",
      sourceKind: "post",
      attributes: {
        discussionEnabled: true,
        discussionRatingField: "score",
      },
      fields: [
        {
          type: "group",
          children: [
            {
              type: "rating",
              name: "score",
              count: 5,
              fractions: 2,
              required: true,
            },
          ],
        },
      ],
    },
    { accountId: "account", siteId: "site", settings: {} },
  );
  const discussion = payload.settings?.discussion as Record<string, unknown>;
  assert.deepEqual(discussion.rating, {
    field: "score",
    maximum: 5,
    fractions: 2,
    required: true,
  });
});
