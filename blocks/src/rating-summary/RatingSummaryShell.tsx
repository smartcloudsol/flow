import { Alert, Button, Group, Loader, Stack, Text } from "@mantine/core";
import {
  getStoreSelect,
  type ContentReference,
  type ContentTargetSource,
  type Store,
} from "@smart-cloud/flow-core";
import { useSelect } from "@wordpress/data";
import { I18n } from "aws-amplify/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDiscussionPage } from "../discussion/api";
import { RatingSummaryView } from "../discussion/RatingSummaryView";
import type {
  DiscussionPolicy,
  DiscussionRatingSummary,
} from "../discussion/types";

export interface RatingSummaryAttributes {
  formId?: string;
  contentTargetSource?: ContentTargetSource;
  targetNamespace?: string;
  targetType?: string;
  targetId?: string;
  contentRef?: ContentReference;
  discussionChannel?: string;
  title?: string;
  showDistribution?: boolean;
  averageRatingLabel?: string;
  ratingCountLabel?: string;
  ratingCountPluralLabel?: string;
  ratingDistributionLabel?: string;
  ratingValueTemplate?: string;
  loadingMessage?: string;
  errorMessage?: string;
  retryLabel?: string;
  emptyMessage?: string;
  ratingUnavailableMessage?: string;
  language?: string;
  direction?: string;
  colorMode?: "light" | "dark" | "auto";
  primaryColor?: string;
  themeOverrides?: string;
}

function resolveContentReference(
  attributes: RatingSummaryAttributes,
): ContentReference | undefined {
  if (attributes.contentRef) return attributes.contentRef;
  if (attributes.contentTargetSource === "canonical-url") {
    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    )?.href;
    if (canonical) {
      const url = new URL(canonical, window.location.href);
      return {
        namespace: "url",
        type: "page",
        id: `${url.origin}${url.pathname}`,
      };
    }
    return { namespace: "url", type: "page", id: window.location.pathname };
  }
  const namespace = attributes.targetNamespace?.trim();
  const type = attributes.targetType?.trim();
  const id = attributes.targetId?.trim();
  return namespace && type && id ? { namespace, type, id } : undefined;
}

function authoredOrTranslated(
  authored: string | undefined,
  translated: string,
): string {
  return typeof authored === "string" ? authored : translated;
}

export function RatingSummaryShell({
  attributes,
  store,
}: {
  attributes: RatingSummaryAttributes;
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
    if (customTranslations) I18n.putVocabularies(customTranslations);
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
    void currentLanguage;
    return {
      title: authoredOrTranslated(attributes.title, I18n.get("Rating summary")),
      averageRatingLabel: authoredOrTranslated(
        attributes.averageRatingLabel,
        I18n.get("Average rating"),
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
      ratingValueTemplate: authoredOrTranslated(
        attributes.ratingValueTemplate,
        I18n.get("{value} out of {maximum}"),
      ),
      loadingMessage: authoredOrTranslated(
        attributes.loadingMessage,
        I18n.get("Loading rating summary..."),
      ),
      errorMessage: authoredOrTranslated(
        attributes.errorMessage,
        I18n.get("Unable to load the rating summary."),
      ),
      retryLabel: authoredOrTranslated(
        attributes.retryLabel,
        I18n.get("Retry"),
      ),
      emptyMessage: authoredOrTranslated(
        attributes.emptyMessage,
        I18n.get("No ratings yet."),
      ),
      ratingUnavailableMessage: authoredOrTranslated(
        attributes.ratingUnavailableMessage,
        I18n.get("Ratings are not enabled for this discussion."),
      ),
    };
  }, [attributes, currentLanguage]);
  const contentRef = useMemo(
    () => resolveContentReference(attributes),
    [attributes],
  );
  const channel =
    attributes.discussionChannel?.trim() ||
    `${attributes.formId || "form"}:${contentRef?.namespace || ""}:${
      contentRef?.type || ""
    }:${contentRef?.id || ""}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [policy, setPolicy] = useState<DiscussionPolicy>();
  const [summary, setSummary] = useState<DiscussionRatingSummary>();
  const abortRef = useRef<AbortController | null>(null);

  const loadSummary = useCallback(async () => {
    if (!attributes.formId || !contentRef) {
      setPolicy(undefined);
      setSummary(undefined);
      setError(copy.errorMessage);
      setLoading(false);
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
        limit: 1,
        sortDir: "desc",
        replyPreviewLimit: 0,
        includeCapabilities: false,
        signal: controller.signal,
      });
      setPolicy(page.policy);
      setSummary(page.ratingSummary);
    } catch {
      if (!controller.signal.aborted) {
        setPolicy(undefined);
        setSummary(undefined);
        setError(copy.errorMessage);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [attributes.formId, contentRef, copy.errorMessage]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSummary(), 0);
    return () => {
      window.clearTimeout(timeout);
      abortRef.current?.abort();
    };
  }, [loadSummary]);

  useEffect(() => {
    const onSuccess = (rawEvent: Event) => {
      const detail = (rawEvent as CustomEvent<Record<string, unknown>>).detail;
      if (
        detail?.formId !== attributes.formId ||
        detail.discussionChannel !== channel
      ) {
        return;
      }
      window.setTimeout(() => void loadSummary(), 750);
    };
    document.addEventListener("smartcloud-flow:submit-success", onSuccess);
    return () =>
      document.removeEventListener("smartcloud-flow:submit-success", onSuccess);
  }, [attributes.formId, channel, loadSummary]);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(
        currentLanguage || document.documentElement.lang || navigator.language,
        { maximumFractionDigits: 2 },
      ),
    [currentLanguage],
  );

  return (
    <Stack role="region" aria-label={copy.title} dir={currentDirection}>
      {copy.title ? (
        <Text
          className="smartcloud-flow-rating-summary__title"
          fw={700}
          size="xl"
        >
          {copy.title}
        </Text>
      ) : null}
      <div aria-live="polite">
        {loading ? (
          <Group>
            <Loader size="sm" />
            <Text>{copy.loadingMessage}</Text>
          </Group>
        ) : null}
        {error ? (
          <Alert color="red" role="alert">
            <Stack gap="xs">
              <Text>{error}</Text>
              <Button
                className="smartcloud-flow-rating-summary__retry"
                size="xs"
                onClick={() => void loadSummary()}
              >
                {copy.retryLabel}
              </Button>
            </Stack>
          </Alert>
        ) : null}
      </div>
      {!loading && !error && !policy?.rating ? (
        <Text>{copy.ratingUnavailableMessage}</Text>
      ) : null}
      {!loading &&
      !error &&
      policy?.rating &&
      (!summary || summary.count === 0) ? (
        <Text>{copy.emptyMessage}</Text>
      ) : null}
      {!loading && !error && policy?.rating && summary && summary.count > 0 ? (
        <RatingSummaryView
          summary={summary}
          copy={copy}
          numberFormatter={numberFormatter}
          showDistribution={attributes.showDistribution !== false}
        />
      ) : null}
    </Stack>
  );
}
