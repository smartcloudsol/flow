import {
  Alert,
  Button,
  Group,
  Loader,
  Rating,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { getStoreSelect, type Store } from "@smart-cloud/flow-core";
import { useSelect } from "@wordpress/data";
import { I18n } from "aws-amplify/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDiscussionPage, mutateDiscussionItem } from "./api";
import { resolveDiscussionAuthState } from "../runtime/discussion-auth";
import { discussionItemCount, formatDiscussionCount } from "./count-labels";
import { formatDiscussionDate } from "./date-format";
import { RatingSummaryView } from "./RatingSummaryView";
import {
  buildDiscussionRatingValues,
  normalizeDiscussionRatingValue,
} from "./rating-values";
import {
  canViewerReply,
  hasReachedMaxReplyDepth,
} from "./reply-policy";
import type {
  ContentReference,
  DiscussionAttributes,
  DiscussionPolicy,
  DiscussionRatingOperator,
  DiscussionRatingSummary,
  PublicDiscussionItem,
} from "./types";

function resolveContentReference(
  attributes: DiscussionAttributes,
): ContentReference | undefined {
  if (attributes.contentRef) return attributes.contentRef;
  if (attributes.contentTargetSource === "canonical-url") {
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    if (canonical) {
      const url = new URL(canonical, window.location.href);
      return { namespace: "url", type: "page", id: `${url.origin}${url.pathname}` };
    }
    return { namespace: "url", type: "page", id: window.location.pathname };
  }
  const namespace = attributes.targetNamespace?.trim();
  const type = attributes.targetType?.trim();
  const id = attributes.targetId?.trim();
  return namespace && type && id ? { namespace, type, id } : undefined;
}

function deduplicate(items: PublicDiscussionItem[]): PublicDiscussionItem[] {
  return Array.from(new Map(items.map((item) => [item.submissionId, item])).values());
}

function authoredOrTranslated(
  authored: string | undefined,
  translated: string,
): string {
  return typeof authored === "string" ? authored : translated;
}

function replaceTokens(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function replaceDiscussionItem(
  items: PublicDiscussionItem[],
  replacement: PublicDiscussionItem,
): PublicDiscussionItem[] {
  return items.map((item) => ({
    ...(item.submissionId === replacement.submissionId ? replacement : item),
    ...(item.replyPreview
      ? {
          replyPreview: replaceDiscussionItem(
            item.replyPreview,
            replacement,
          ),
        }
      : {}),
  }));
}

export function DiscussionShell({
  attributes,
  hostElement,
  store,
}: {
  attributes: DiscussionAttributes;
  hostElement: HTMLElement;
  store: Store;
}) {
  const languageInStore = useSelect(
    () => getStoreSelect(store).getLanguage(),
    [store],
  );
  const directionInStore = useSelect(
    () => getStoreSelect(store).getDirection(),
    [store],
  );
  const customTranslations = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
    [store],
  );
  const currentLanguage = useMemo(() => {
    if (customTranslations) {
      I18n.putVocabularies(customTranslations);
    }
    const language = attributes.language || languageInStore;
    if (!language || language === "system") {
      I18n.setLanguage("");
      return undefined;
    }
    I18n.setLanguage(language);
    return language;
  }, [attributes.language, customTranslations, languageInStore]);
  const currentDirection = useMemo(() => {
    const direction = attributes.direction || directionInStore;
    if (!direction || direction === "auto") {
      return currentLanguage === "ar" || currentLanguage === "he"
        ? "rtl"
        : "ltr";
    }
    return direction as "ltr" | "rtl";
  }, [attributes.direction, currentLanguage, directionInStore]);
  const copy = useMemo(() => {
    // Amplify I18n stores the active locale globally; keep this memo tied to it.
    void currentLanguage;
    return {
      actionErrorMessage: authoredOrTranslated(
        attributes.actionErrorMessage,
        I18n.get("The discussion item could not be updated."),
      ),
      anonymousAuthorLabel: authoredOrTranslated(
        attributes.anonymousAuthorLabel,
        I18n.get("Anonymous"),
      ),
      cancelDeleteLabel: authoredOrTranslated(
        attributes.cancelDeleteLabel,
        I18n.get("Cancel"),
      ),
      cancelEditLabel: authoredOrTranslated(
        attributes.cancelEditLabel,
        I18n.get("Cancel"),
      ),
      commentCountLabel: authoredOrTranslated(
        attributes.commentCountLabel,
        I18n.get("{count} comment"),
      ),
      commentCountPluralLabel: authoredOrTranslated(
        attributes.commentCountPluralLabel,
        I18n.get("{count} comments"),
      ),
      deleteConfirmLabel: authoredOrTranslated(
        attributes.deleteConfirmLabel,
        I18n.get("Delete comment"),
      ),
      deleteConfirmMessage: authoredOrTranslated(
        attributes.deleteConfirmMessage,
        I18n.get(
          "This comment will be removed. Replies will remain visible.",
        ),
      ),
      deleteConfirmTitle: authoredOrTranslated(
        attributes.deleteConfirmTitle,
        I18n.get("Delete comment?"),
      ),
      deleteLabel: authoredOrTranslated(
        attributes.deleteLabel,
        I18n.get("Delete"),
      ),
      depthLimitLabel: authoredOrTranslated(
        attributes.depthLimitLabel,
        I18n.get("Maximum reply depth reached."),
      ),
      editedLabel: authoredOrTranslated(
        attributes.editedLabel,
        I18n.get("Edited"),
      ),
      editLabel: authoredOrTranslated(
        attributes.editLabel,
        I18n.get("Edit"),
      ),
      emptyMessage: authoredOrTranslated(
        attributes.emptyMessage,
        I18n.get("No discussion yet."),
      ),
      errorMessage: authoredOrTranslated(
        attributes.errorMessage,
        I18n.get("Unable to load the discussion."),
      ),
      loadingMessage: authoredOrTranslated(
        attributes.loadingMessage,
        I18n.get("Loading discussion..."),
      ),
      loadMoreLabel: authoredOrTranslated(
        attributes.loadMoreLabel,
        I18n.get("Load more"),
      ),
      loadRepliesLabel: authoredOrTranslated(
        attributes.loadRepliesLabel,
        I18n.get("View {count} more replies"),
      ),
      loadReplyLabel: authoredOrTranslated(
        attributes.loadReplyLabel,
        I18n.get("View {count} more reply"),
      ),
      allRatingsLabel: authoredOrTranslated(
        attributes.allRatingsLabel,
        I18n.get("All ratings"),
      ),
      atLeastLabel: authoredOrTranslated(
        attributes.atLeastLabel,
        I18n.get("At least"),
      ),
      atMostLabel: authoredOrTranslated(
        attributes.atMostLabel,
        I18n.get("At most"),
      ),
      averageRatingLabel: authoredOrTranslated(
        attributes.averageRatingLabel,
        I18n.get("Average rating"),
      ),
      exactlyLabel: authoredOrTranslated(
        attributes.exactlyLabel,
        I18n.get("Exactly"),
      ),
      filterRatingsLabel: authoredOrTranslated(
        attributes.filterRatingsLabel,
        I18n.get("Filter ratings"),
      ),
      ratingCountLabel: authoredOrTranslated(
        attributes.ratingCountLabel,
        I18n.get("{count} rating"),
      ),
      ratingCountPluralLabel: authoredOrTranslated(
        attributes.ratingCountPluralLabel,
        I18n.get("{count} ratings"),
      ),
      ratingDistributionLabel: authoredOrTranslated(
        attributes.ratingDistributionLabel,
        I18n.get("Rating distribution"),
      ),
      ratingValueLabel: authoredOrTranslated(
        attributes.ratingValueLabel,
        I18n.get("Rating value"),
      ),
      ratingValueTemplate: authoredOrTranslated(
        attributes.ratingValueTemplate,
        I18n.get("{value} out of {maximum}"),
      ),
      replyCountLabel: authoredOrTranslated(
        attributes.replyCountLabel,
        I18n.get("{count} reply"),
      ),
      replyCountPluralLabel: authoredOrTranslated(
        attributes.replyCountPluralLabel,
        I18n.get("{count} replies"),
      ),
      replyLabel: authoredOrTranslated(
        attributes.replyLabel,
        I18n.get("Reply"),
      ),
      retryLabel: authoredOrTranslated(
        attributes.retryLabel,
        I18n.get("Retry"),
      ),
      saveEditLabel: authoredOrTranslated(
        attributes.saveEditLabel,
        I18n.get("Save"),
      ),
      title: authoredOrTranslated(
        attributes.title,
        I18n.get("Discussion"),
      ),
      tombstoneLabel: authoredOrTranslated(
        attributes.tombstoneLabel,
        I18n.get("This item is no longer available."),
      ),
    };
  }, [attributes, currentLanguage]);
  const contentRef = useMemo(() => resolveContentReference(attributes), [attributes]);
  const channel =
    attributes.discussionChannel?.trim() ||
    `${attributes.formId || "form"}:${contentRef?.namespace || ""}:${contentRef?.type || ""}:${contentRef?.id || ""}`;
  const [items, setItems] = useState<PublicDiscussionItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const cursorRef = useRef<string | undefined>();
  const [children, setChildren] = useState<Record<string, PublicDiscussionItem[]>>({});
  const [childCursors, setChildCursors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editBody, setEditBody] = useState("");
  const [editRating, setEditRating] = useState<number | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | undefined>();
  const [mutatingId, setMutatingId] = useState<string | undefined>();
  const [viewerCanComment, setViewerCanComment] = useState(
    attributes.discussionAuthMode !== "required" &&
      (attributes.discussionAllowedGroups?.length ?? 0) === 0,
  );
  const [policy, setPolicy] = useState<DiscussionPolicy>({
    allowReplies: true,
    maxReplyDepth: 5,
  });
  const [ratingSummary, setRatingSummary] =
    useState<DiscussionRatingSummary>();
  const [ratingOperator, setRatingOperator] =
    useState<DiscussionRatingOperator>(attributes.ratingFilterOperator || "all");
  const [ratingValue, setRatingValue] = useState(
    attributes.ratingFilterValue ?? 5,
  );
  const effectiveRatingValue = policy.rating
    ? normalizeDiscussionRatingValue(
        ratingValue,
        policy.rating.maximum,
        policy.rating.fractions,
      )
    : undefined;
  const requestedRatingValue =
    ratingOperator === "all" ? undefined : effectiveRatingValue;
  const abortRef = useRef<AbortController | null>(null);
  const replyAbortRefs = useRef(new Map<string, AbortController>());

  const loadRoots = useCallback(
    async (append = false) => {
      if (!attributes.formId || !contentRef) {
        setError(copy.errorMessage);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!append) {
        setCursor(undefined);
        cursorRef.current = undefined;
      }
      setLoading(true);
      setError(undefined);
      try {
        const authState = await resolveDiscussionAuthState({
          mode: attributes.discussionAuthMode,
          allowedGroups: attributes.discussionAllowedGroups,
        });
        setViewerCanComment(authState.canComment);
        const page = await fetchDiscussionPage({
          formId: attributes.formId,
          contentRef,
          limit: Math.min(Math.max(attributes.pageSize ?? 20, 1), 50),
          ...(append && cursorRef.current ? { cursor: cursorRef.current } : {}),
          sortDir: attributes.rootSortDirection === "asc" ? "asc" : "desc",
          replyPreviewLimit:
            attributes.initialReplyDepth === 0
              ? 0
              : Math.min(Math.max(attributes.replyPreviewLimit ?? 2, 0), 5),
          includeCapabilities: authState.authenticated,
          ...(ratingOperator !== "all" && requestedRatingValue !== undefined
            ? { ratingOperator, rating: requestedRatingValue }
            : {}),
          signal: controller.signal,
        });
        setItems((current) => deduplicate(append ? [...current, ...page.items] : page.items));
        setCursor(page.cursor);
        cursorRef.current = page.cursor;
        if (page.policy) {
          setPolicy(page.policy);
          if (page.policy.rating) {
            setRatingValue((current) =>
              normalizeDiscussionRatingValue(
                current,
                page.policy.rating!.maximum,
                page.policy.rating!.fractions,
              ) ?? page.policy.rating!.maximum,
            );
          }
        }
        setRatingSummary(page.ratingSummary);
      } catch {
        if (!controller.signal.aborted) {
          setError(copy.errorMessage);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, [
      attributes,
      contentRef,
      copy.errorMessage,
      ratingOperator,
      requestedRatingValue,
    ]);

  const loadReplies = useCallback(
    async (parent: PublicDiscussionItem, append = false) => {
      if (!attributes.formId || !contentRef) return;
      replyAbortRefs.current.get(parent.submissionId)?.abort();
      const controller = new AbortController();
      replyAbortRefs.current.set(parent.submissionId, controller);
      try {
        const authState = await resolveDiscussionAuthState({
          mode: attributes.discussionAuthMode,
          allowedGroups: attributes.discussionAllowedGroups,
        });
        setViewerCanComment(authState.canComment);
        const page = await fetchDiscussionPage({
          formId: attributes.formId,
          contentRef,
          parentSubmissionId: parent.submissionId,
          limit: Math.min(Math.max(attributes.replyPageSize ?? 10, 1), 50),
          ...(append && childCursors[parent.submissionId]
            ? { cursor: childCursors[parent.submissionId] }
            : {}),
          sortDir: attributes.replySortDirection === "asc" ? "asc" : "desc",
          includeCapabilities: authState.authenticated,
          signal: controller.signal,
        });
        setChildren((current) => ({
          ...current,
          [parent.submissionId]: deduplicate(
            append
              ? [...(current[parent.submissionId] || []), ...page.items]
              : page.items,
          ),
        }));
        setChildCursors((current) => ({
          ...current,
          [parent.submissionId]: page.cursor,
        }));
        if (page.policy) {
          setPolicy(page.policy);
          if (page.policy.rating) {
            setRatingValue((current) =>
              normalizeDiscussionRatingValue(
                current,
                page.policy.rating!.maximum,
                page.policy.rating!.fractions,
              ) ?? page.policy.rating!.maximum,
            );
          }
        }
      } catch {
        if (!controller.signal.aborted) setError(copy.errorMessage);
      }
    }, [attributes, childCursors, contentRef, copy.errorMessage]);

  useEffect(() => {
    const replyControllers = replyAbortRefs.current;
    const timeout = window.setTimeout(() => void loadRoots(false), 0);
    return () => {
      window.clearTimeout(timeout);
      abortRef.current?.abort();
      replyControllers.forEach((controller) => controller.abort());
      replyControllers.clear();
    };
  }, [loadRoots]);

  useEffect(() => {
    const onSuccess = (rawEvent: Event) => {
      const detail = (rawEvent as CustomEvent<Record<string, unknown>>).detail;
      if (
        detail?.formId !== attributes.formId ||
        detail.discussionChannel !== channel
      ) return;
      const publicItem = detail.publicItem as PublicDiscussionItem | undefined;
      if (publicItem) {
        if (publicItem.parentSubmissionId) {
          setChildren((current) => ({
            ...current,
            [publicItem.parentSubmissionId as string]: deduplicate([
              publicItem,
              ...(current[publicItem.parentSubmissionId as string] || []),
            ]),
          }));
        } else {
          setItems((current) => deduplicate([publicItem, ...current]));
        }
      }
      window.setTimeout(() => void loadRoots(false), 750);
    };
    document.addEventListener("smartcloud-flow:submit-success", onSuccess);
    return () => document.removeEventListener("smartcloud-flow:submit-success", onSuccess);
  }, [attributes.formId, channel, loadRoots]);

  const requestReply = (item: PublicDiscussionItem) => {
    hostElement.dispatchEvent(
      new CustomEvent("smartcloud-flow:discussion-reply-requested", {
        bubbles: true,
        composed: true,
        detail: {
          formId: attributes.formId,
          discussionChannel: channel,
          contentRef,
          parentSubmissionId: item.submissionId,
          parentAuthorName: item.authorName,
          replyDepth: item.replyDepth,
        },
      }),
    );
  };

  const applyMutation = (item: PublicDiscussionItem) => {
    setItems((current) => replaceDiscussionItem(current, item));
    setChildren((current) =>
      Object.fromEntries(
        Object.entries(current).map(([parentId, entries]) => [
          parentId,
          replaceDiscussionItem(entries, item),
        ]),
      ),
    );
  };

  const saveEdit = async (item: PublicDiscussionItem) => {
    if (!attributes.formId || !contentRef) return;
    setMutatingId(item.submissionId);
    setActionError(undefined);
    try {
      const response = await mutateDiscussionItem({
        method: "PATCH",
        formId: attributes.formId,
        submissionId: item.submissionId,
        contentRef,
        expectedUpdatedAt: item.updatedAt || item.createdAt,
        body: editBody,
        ...(item.replyDepth === 0 && ratingPolicy
          ? { rating: editRating && editRating > 0 ? editRating : null }
          : {}),
      });
      applyMutation(response.item);
      setEditingId(undefined);
      setEditBody("");
      setEditRating(undefined);
      await loadRoots(false);
    } catch {
      setActionError(copy.actionErrorMessage);
    } finally {
      setMutatingId(undefined);
    }
  };

  const deleteItem = async (item: PublicDiscussionItem) => {
    if (!attributes.formId || !contentRef) return;
    setMutatingId(item.submissionId);
    setActionError(undefined);
    try {
      const response = await mutateDiscussionItem({
        method: "DELETE",
        formId: attributes.formId,
        submissionId: item.submissionId,
        contentRef,
        expectedUpdatedAt: item.updatedAt || item.createdAt,
      });
      applyMutation(response.item);
      setConfirmDeleteId(undefined);
      await loadRoots(false);
    } catch {
      setActionError(copy.actionErrorMessage);
    } finally {
      setMutatingId(undefined);
    }
  };

  const dateLocale =
    currentLanguage || document.documentElement.lang || navigator.language;
  const ratingPolicy = policy.rating;
  const ratingNumberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(dateLocale, {
        maximumFractionDigits: 2,
      }),
    [dateLocale],
  );
  const ratingOptions = useMemo(() => {
    if (!ratingPolicy) return [];
    return buildDiscussionRatingValues(
      ratingPolicy.maximum,
      ratingPolicy.fractions,
    )
      .map((value) => ({
        value: String(value),
        label: ratingNumberFormatter.format(value),
      }))
      .reverse();
  }, [ratingNumberFormatter, ratingPolicy]);
  const loadedCommentCount = discussionItemCount(items);
  const commentCountLabel = formatDiscussionCount({
    count: loadedCommentCount,
    singular: copy.commentCountLabel,
    plural: copy.commentCountPluralLabel,
    hasMore: Boolean(cursor),
  });

  const renderItems = (list: PublicDiscussionItem[], level = 0): React.ReactNode => (
    <ul className="smartcloud-flow-discussion__list" aria-label={copy.title}>
      {list.map((item) => {
        const directChildren = children[item.submissionId] ?? item.replyPreview ?? [];
        const remainingDirectReplies = Math.max(
          0,
          item.directReplyCount - directChildren.length,
        );
        const canReply = canViewerReply({ item, policy, viewerCanComment });
        const reachedReplyDepth = hasReachedMaxReplyDepth(item, policy);
        const hasCommentActions =
          canReply ||
          Boolean(item.capabilities?.canEdit) ||
          Boolean(item.capabilities?.canDelete);
        const formattedDate =
          attributes.showDate === false
            ? undefined
            : formatDiscussionDate({
                value: item.createdAt,
                locale: dateLocale,
                dateStyle: attributes.dateStyle,
                timeStyle: attributes.timeStyle,
              });
        return (
          <li key={item.submissionId} className="smartcloud-flow-discussion__item">
            <article
              className="smartcloud-flow-discussion__article"
              aria-label={`${copy.replyLabel} ${item.authorName || copy.anonymousAuthorLabel}`.trim()}
            >
              <Group gap="xs" align="baseline">
                <Text fw={600} size="sm">
                  {item.renderState === "tombstone"
                    ? copy.tombstoneLabel
                    : item.authorName || copy.anonymousAuthorLabel}
                </Text>
                {formattedDate ? (
                  <Text
                    component="time"
                    dateTime={item.createdAt}
                    c="dimmed"
                    size="xs"
                  >
                    {formattedDate}
                  </Text>
                ) : null}
                {item.editedAt ? (
                  <Text c="dimmed" size="xs">{copy.editedLabel}</Text>
                ) : null}
              </Group>
              {editingId === item.submissionId ? (
                <Stack gap="xs" mt="xs">
                  <Textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.currentTarget.value)}
                    autosize
                    minRows={3}
                  />
                  {item.replyDepth === 0 && ratingPolicy ? (
                    <Rating
                      aria-label={copy.ratingValueLabel}
                      count={ratingPolicy.maximum}
                      fractions={ratingPolicy.fractions}
                      value={editRating ?? 0}
                      onChange={setEditRating}
                    />
                  ) : null}
                  <Group gap="xs">
                    <Button
                      size="xs"
                      loading={mutatingId === item.submissionId}
                      disabled={Boolean(
                        item.replyDepth === 0 &&
                          ratingPolicy?.required &&
                          !(editRating && editRating > 0),
                      )}
                      onClick={() => void saveEdit(item)}
                    >
                      {copy.saveEditLabel}
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      onClick={() => {
                        setEditingId(undefined);
                        setEditRating(undefined);
                      }}
                    >
                      {copy.cancelEditLabel}
                    </Button>
                  </Group>
                </Stack>
              ) : item.renderState === "visible" && item.body ? (
                <Text className="smartcloud-flow-discussion__body">{item.body}</Text>
              ) : null}
              {item.renderState === "visible" &&
              item.replyDepth === 0 &&
              ratingPolicy &&
              typeof item.rating === "number" ? (
                <Group className="smartcloud-flow-discussion__rating" gap="xs" mt="xs">
                  <Rating
                    readOnly
                    count={ratingPolicy.maximum}
                    fractions={ratingPolicy.fractions}
                    value={item.rating}
                  />
                  <Text c="dimmed" size="xs">
                    {replaceTokens(copy.ratingValueTemplate, {
                      value: ratingNumberFormatter.format(item.rating),
                      maximum: ratingNumberFormatter.format(
                        ratingPolicy.maximum,
                      ),
                    })}
                  </Text>
                </Group>
              ) : null}
              {item.totalReplyCount > 0 || hasCommentActions || reachedReplyDepth ? (
                <Group
                  className="smartcloud-flow-discussion__meta"
                  gap="xs"
                  mt="xs"
                >
                  {item.totalReplyCount > 0 ? (
                    <Text
                      className="smartcloud-flow-discussion__reply-count"
                      c="dimmed"
                      size="xs"
                    >
                      {formatDiscussionCount({
                        count: item.totalReplyCount,
                        singular: copy.replyCountLabel,
                        plural: copy.replyCountPluralLabel,
                      })}
                    </Text>
                  ) : null}
                  {hasCommentActions ? (
                    <Group
                      className="smartcloud-flow-discussion__actions"
                      gap={4}
                    >
                      {canReply ? (
                        <Button
                          className="smartcloud-flow-discussion__action"
                          size="xs"
                          variant="subtle"
                          onClick={() => requestReply(item)}
                        >
                          {copy.replyLabel}
                        </Button>
                      ) : null}
                      {item.capabilities?.canEdit ? (
                        <Button
                          className="smartcloud-flow-discussion__action"
                          size="xs"
                          variant="subtle"
                          onClick={() => {
                            setEditingId(item.submissionId);
                            setEditBody(item.body || "");
                            setEditRating(
                              item.replyDepth === 0 ? item.rating : undefined,
                            );
                          }}
                        >
                          {copy.editLabel}
                        </Button>
                      ) : null}
                      {item.capabilities?.canDelete ? (
                        <Button
                          className="smartcloud-flow-discussion__action smartcloud-flow-discussion__action--delete"
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => setConfirmDeleteId(item.submissionId)}
                        >
                          {copy.deleteLabel}
                        </Button>
                      ) : null}
                    </Group>
                  ) : reachedReplyDepth ? (
                    <Text size="xs">{copy.depthLimitLabel}</Text>
                  ) : null}
                </Group>
              ) : null}
              {remainingDirectReplies > 0 ? (
                <Button
                  className="smartcloud-flow-discussion__load-replies"
                  size="xs"
                  variant="subtle"
                  onClick={() => void loadReplies(item, false)}
                >
                  {formatDiscussionCount({
                    count: remainingDirectReplies,
                    singular: copy.loadReplyLabel,
                    plural: copy.loadRepliesLabel,
                  })}
                </Button>
              ) : null}
              {confirmDeleteId === item.submissionId ? (
                <Alert color="red" mt="xs" title={copy.deleteConfirmTitle}>
                  <Stack gap="xs">
                    <Text size="sm">{copy.deleteConfirmMessage}</Text>
                    <Group gap="xs">
                      <Button
                        className="smartcloud-flow-discussion__delete-confirm"
                        color="red"
                        size="xs"
                        loading={mutatingId === item.submissionId}
                        onClick={() => void deleteItem(item)}
                      >
                        {copy.deleteConfirmLabel}
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        onClick={() => setConfirmDeleteId(undefined)}
                      >
                        {copy.cancelDeleteLabel}
                      </Button>
                    </Group>
                  </Stack>
                </Alert>
              ) : null}
            </article>
            {directChildren.length ? renderItems(directChildren, level + 1) : null}
            {childCursors[item.submissionId] ? (
              <Button size="xs" variant="subtle" onClick={() => void loadReplies(item, true)}>
                {copy.loadMoreLabel}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <Stack role="region" aria-label={copy.title} dir={currentDirection}>
      {copy.title ||
      (attributes.showCommentCount !== false && !loading && !error) ? (
        <Group gap="xs" align="baseline">
          {copy.title ? <Text fw={700} size="xl">{copy.title}</Text> : null}
          {attributes.showCommentCount !== false && !loading && !error ? (
            <Text className="smartcloud-flow-discussion__comment-count" c="dimmed" size="sm">
              {commentCountLabel}
            </Text>
          ) : null}
        </Group>
      ) : null}
      {ratingPolicy &&
      attributes.showRatingSummary !== false &&
      ratingSummary ? (
        <RatingSummaryView
          className="smartcloud-flow-discussion__rating-summary"
          summary={ratingSummary}
          copy={copy}
          numberFormatter={ratingNumberFormatter}
        />
      ) : null}
      {ratingPolicy && attributes.showRatingFilter !== false ? (
        <Group
          className="smartcloud-flow-discussion__rating-filter"
          gap="sm"
          align="end"
        >
          <Select
            label={copy.filterRatingsLabel}
            value={ratingOperator}
            data={[
              { value: "all", label: copy.allRatingsLabel },
              { value: "eq", label: copy.exactlyLabel },
              { value: "gte", label: copy.atLeastLabel },
              { value: "lte", label: copy.atMostLabel },
            ]}
            allowDeselect={false}
            onChange={(value) => {
              setRatingOperator(
                (value || "all") as DiscussionRatingOperator,
              );
              setItems([]);
              setChildren({});
              setChildCursors({});
              setCursor(undefined);
              cursorRef.current = undefined;
            }}
          />
          {ratingOperator !== "all" ? (
            <Select
              label={copy.ratingValueLabel}
              value={String(effectiveRatingValue ?? ratingValue)}
              data={ratingOptions}
              allowDeselect={false}
              onChange={(value) => {
                if (!value) return;
                setRatingValue(Number(value));
                setItems([]);
                setChildren({});
                setChildCursors({});
                setCursor(undefined);
                cursorRef.current = undefined;
              }}
            />
          ) : null}
        </Group>
      ) : null}
      <div aria-live="polite">
        {loading && items.length === 0 ? (
          <Group><Loader size="sm" /><Text>{copy.loadingMessage}</Text></Group>
        ) : null}
        {error ? (
          <Alert color="red" role="alert">
            <Stack gap="xs">
              <Text>{error}</Text>
              <Button
                className="smartcloud-flow-discussion__retry"
                size="xs"
                onClick={() => void loadRoots(false)}
              >
                {copy.retryLabel}
              </Button>
            </Stack>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert color="red" role="alert" withCloseButton onClose={() => setActionError(undefined)}>
            {actionError}
          </Alert>
        ) : null}
      </div>
      {!loading && !error && items.length === 0 ? <Text>{copy.emptyMessage}</Text> : null}
      {items.length ? renderItems(items) : null}
      {cursor ? <Button onClick={() => void loadRoots(true)}>{copy.loadMoreLabel}</Button> : null}
    </Stack>
  );
}
