import { Group, Progress, Rating, Stack, Text } from "@mantine/core";
import { formatDiscussionCount } from "./count-labels";
import type { DiscussionRatingSummary } from "./types";

export interface RatingSummaryCopy {
  averageRatingLabel: string;
  ratingCountLabel: string;
  ratingCountPluralLabel: string;
  ratingDistributionLabel: string;
  ratingValueTemplate: string;
}

function replaceTokens(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function RatingSummaryView({
  summary,
  copy,
  numberFormatter,
  showDistribution = true,
  className = "smartcloud-flow-rating-summary__summary",
}: {
  summary: DiscussionRatingSummary;
  copy: RatingSummaryCopy;
  numberFormatter: Intl.NumberFormat;
  showDistribution?: boolean;
  className?: string;
}) {
  return (
    <Stack
      className={className}
      gap="xs"
      aria-label={copy.ratingDistributionLabel}
    >
      <Group gap="xs" align="center">
        <Text fw={600} size="sm">
          {copy.averageRatingLabel}
        </Text>
        {summary.average !== null ? (
          <>
            <Rating
              readOnly
              count={summary.maximum}
              fractions={summary.fractions}
              value={summary.average}
            />
            <Text size="sm">{numberFormatter.format(summary.average)}</Text>
          </>
        ) : null}
        <Text c="dimmed" size="xs">
          {formatDiscussionCount({
            count: summary.count,
            singular: copy.ratingCountLabel,
            plural: copy.ratingCountPluralLabel,
          })}
        </Text>
      </Group>
      {showDistribution
        ? summary.buckets
            .slice()
            .sort((left, right) => right.value - left.value)
            .map((bucket) => (
              <Group
                key={bucket.value}
                className="smartcloud-flow-rating-summary__bucket"
                gap="xs"
                wrap="nowrap"
              >
                <Text size="xs" w={36} ta="end">
                  {numberFormatter.format(bucket.value)}
                </Text>
                <Progress
                  aria-label={replaceTokens(copy.ratingValueTemplate, {
                    value: numberFormatter.format(bucket.value),
                    maximum: numberFormatter.format(summary.maximum),
                  })}
                  value={bucket.percentage}
                  style={{ flex: 1 }}
                />
                <Text c="dimmed" size="xs" w={84}>
                  {bucket.count} ({numberFormatter.format(bucket.percentage)}%)
                </Text>
              </Group>
            ))
        : null}
    </Stack>
  );
}
