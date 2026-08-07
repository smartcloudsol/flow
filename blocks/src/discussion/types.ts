import type {
  ContentReference,
  ContentTargetSource,
  PublicDiscussionItem,
  PublicDiscussionPage,
} from "@smart-cloud/flow-core";

export type { ContentReference, PublicDiscussionItem, PublicDiscussionPage };

export interface DiscussionAttributes {
  formId?: string;
  contentTargetSource?: ContentTargetSource;
  targetNamespace?: string;
  targetType?: string;
  targetId?: string;
  contentRef?: ContentReference;
  discussionChannel?: string;
  pageSize?: number;
  replyPageSize?: number;
  replyPreviewLimit?: number;
  initialReplyDepth?: 0 | 1;
  rootSortDirection?: "asc" | "desc";
  replySortDirection?: "asc" | "desc";
  title?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  retryLabel?: string;
  anonymousAuthorLabel?: string;
  tombstoneLabel?: string;
  replyLabel?: string;
  cancelReplyLabel?: string;
  loadMoreLabel?: string;
  loadRepliesLabel?: string;
  depthLimitLabel?: string;
  language?: string;
  direction?: string;
  colorMode?: "light" | "dark" | "auto";
  primaryColor?: string;
  themeOverrides?: string;
}
