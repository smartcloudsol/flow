import type {
  ContentReference,
  ContentTargetSource,
  PublicDiscussionItem as CorePublicDiscussionItem,
} from "@smart-cloud/flow-core";

export type { ContentReference };

export interface DiscussionCapabilities {
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface PublicDiscussionItem
  extends Omit<CorePublicDiscussionItem, "replyPreview"> {
  editedAt?: string;
  rating?: number;
  capabilities?: DiscussionCapabilities;
  replyPreview?: PublicDiscussionItem[];
}

export interface DiscussionRatingPolicy {
  field: string;
  maximum: number;
  fractions: number;
  required: boolean;
}

export interface DiscussionPolicy {
  allowReplies: boolean;
  maxReplyDepth: number;
  rating?: DiscussionRatingPolicy;
}

export interface DiscussionRatingBucket {
  value: number;
  count: number;
  percentage: number;
}

export interface DiscussionRatingSummary {
  maximum: number;
  fractions: number;
  count: number;
  average: number | null;
  buckets: DiscussionRatingBucket[];
}

export type DiscussionRatingOperator = "all" | "eq" | "gte" | "lte";

export interface PublicDiscussionPage {
  items: PublicDiscussionItem[];
  cursor?: string;
  viewer?: { authenticated: boolean; canComment: boolean };
  policy: DiscussionPolicy;
  ratingSummary?: DiscussionRatingSummary;
}

export type DiscussionDateStyle = "full" | "long" | "medium" | "short";
export type DiscussionTimeStyle = DiscussionDateStyle | "none";

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
  showRatingSummary?: boolean;
  showRatingFilter?: boolean;
  ratingFilterOperator?: DiscussionRatingOperator;
  ratingFilterValue?: number;
  allRatingsLabel?: string;
  atLeastLabel?: string;
  atMostLabel?: string;
  averageRatingLabel?: string;
  exactlyLabel?: string;
  filterRatingsLabel?: string;
  ratingCountLabel?: string;
  ratingCountPluralLabel?: string;
  ratingDistributionLabel?: string;
  ratingValueLabel?: string;
  ratingValueTemplate?: string;
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
  loadReplyLabel?: string;
  loadRepliesLabel?: string;
  replyCountLabel?: string;
  replyCountPluralLabel?: string;
  showCommentCount?: boolean;
  commentCountLabel?: string;
  commentCountPluralLabel?: string;
  depthLimitLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  saveEditLabel?: string;
  cancelEditLabel?: string;
  editedLabel?: string;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
  deleteConfirmLabel?: string;
  cancelDeleteLabel?: string;
  actionErrorMessage?: string;
  discussionAuthMode?: "anonymous" | "optional" | "required";
  discussionAllowedGroups?: string[];
  showDate?: boolean;
  dateStyle?: DiscussionDateStyle;
  timeStyle?: DiscussionTimeStyle;
  language?: string;
  direction?: string;
  colorMode?: "light" | "dark" | "auto";
  primaryColor?: string;
  themeOverrides?: string;
}
