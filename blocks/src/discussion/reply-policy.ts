import type { DiscussionPolicy, PublicDiscussionItem } from "./types";

export function hasReachedMaxReplyDepth(
  item: PublicDiscussionItem,
  policy: DiscussionPolicy,
): boolean {
  return policy.allowReplies && item.replyDepth >= policy.maxReplyDepth;
}

export function canViewerReply(input: {
  item: PublicDiscussionItem;
  policy: DiscussionPolicy;
  viewerCanComment: boolean;
}): boolean {
  if (input.item.capabilities) return input.item.capabilities.canReply;
  return (
    input.viewerCanComment &&
    input.policy.allowReplies &&
    input.item.renderState === "visible" &&
    input.item.replyDepth < input.policy.maxReplyDepth
  );
}
