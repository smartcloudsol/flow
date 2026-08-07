import { Alert, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDiscussionPage } from "./api";
import type {
  ContentReference,
  DiscussionAttributes,
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

export function DiscussionShell({
  attributes,
  hostElement,
}: {
  attributes: DiscussionAttributes;
  hostElement: HTMLElement;
}) {
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
  const abortRef = useRef<AbortController | null>(null);
  const replyAbortRefs = useRef(new Map<string, AbortController>());

  const loadRoots = useCallback(
    async (append = false) => {
      if (!attributes.formId || !contentRef) {
        setError(attributes.errorMessage);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(undefined);
      try {
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
          signal: controller.signal,
        });
        setItems((current) => deduplicate(append ? [...current, ...page.items] : page.items));
        setCursor(page.cursor);
        cursorRef.current = page.cursor;
      } catch {
        if (!controller.signal.aborted) {
          setError(attributes.errorMessage);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, [attributes, contentRef]);

  const loadReplies = useCallback(
    async (parent: PublicDiscussionItem, append = false) => {
      if (!attributes.formId || !contentRef) return;
      replyAbortRefs.current.get(parent.submissionId)?.abort();
      const controller = new AbortController();
      replyAbortRefs.current.set(parent.submissionId, controller);
      try {
        const page = await fetchDiscussionPage({
          formId: attributes.formId,
          contentRef,
          parentSubmissionId: parent.submissionId,
          limit: Math.min(Math.max(attributes.replyPageSize ?? 10, 1), 50),
          ...(append && childCursors[parent.submissionId]
            ? { cursor: childCursors[parent.submissionId] }
            : {}),
          sortDir: attributes.replySortDirection === "asc" ? "asc" : "desc",
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
      } catch {
        if (!controller.signal.aborted) setError(attributes.errorMessage);
      }
    }, [attributes, childCursors, contentRef]);

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

  const renderItems = (list: PublicDiscussionItem[], level = 0): React.ReactNode => (
    <ul className="smartcloud-flow-discussion__list" aria-label={attributes.title}>
      {list.map((item) => {
        const directChildren = children[item.submissionId] ?? item.replyPreview ?? [];
        return (
          <li key={item.submissionId} className="smartcloud-flow-discussion__item">
            <article aria-label={`${attributes.replyLabel || ""} ${item.authorName || attributes.anonymousAuthorLabel || ""}`.trim()}>
              <Text fw={600} size="sm">
                {item.renderState === "tombstone"
                  ? attributes.tombstoneLabel
                  : item.authorName || attributes.anonymousAuthorLabel}
              </Text>
              {item.renderState === "visible" && item.body ? (
                <Text className="smartcloud-flow-discussion__body">{item.body}</Text>
              ) : null}
              <Group gap="xs" mt="xs">
                {item.replyDepth < 5 ? (
                  <Button size="xs" variant="subtle" onClick={() => requestReply(item)}>
                    {attributes.replyLabel}
                  </Button>
                ) : (
                  <Text size="xs">{attributes.depthLimitLabel}</Text>
                )}
                {item.directReplyCount > directChildren.length ? (
                  <Button size="xs" variant="subtle" onClick={() => void loadReplies(item, false)}>
                    {attributes.loadRepliesLabel}
                  </Button>
                ) : null}
              </Group>
            </article>
            {directChildren.length ? renderItems(directChildren, level + 1) : null}
            {childCursors[item.submissionId] ? (
              <Button size="xs" variant="subtle" onClick={() => void loadReplies(item, true)}>
                {attributes.loadMoreLabel}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <Stack role="region" aria-label={attributes.title} dir={attributes.direction || undefined}>
      {attributes.title ? <Text fw={700} size="xl">{attributes.title}</Text> : null}
      <div aria-live="polite">
        {loading && items.length === 0 ? (
          <Group><Loader size="sm" /><Text>{attributes.loadingMessage}</Text></Group>
        ) : null}
        {error ? (
          <Alert color="red" role="alert">
            <Stack gap="xs">
              <Text>{attributes.errorMessage || error}</Text>
              <Button size="xs" onClick={() => void loadRoots(false)}>{attributes.retryLabel}</Button>
            </Stack>
          </Alert>
        ) : null}
      </div>
      {!loading && !error && items.length === 0 ? <Text>{attributes.emptyMessage}</Text> : null}
      {items.length ? renderItems(items) : null}
      {cursor ? <Button onClick={() => void loadRoots(true)}>{attributes.loadMoreLabel}</Button> : null}
    </Stack>
  );
}
