import type { PublicDiscussionItem } from "./types";

export function discussionItemCount(items: PublicDiscussionItem[]): number {
  return items.reduce(
    (count, item) => count + 1 + Math.max(0, item.totalReplyCount || 0),
    0,
  );
}

export function formatDiscussionCount(input: {
  count: number;
  singular: string | undefined;
  plural: string | undefined;
  hasMore?: boolean;
}): string {
  const count = Math.max(0, Math.trunc(input.count));
  const template =
    count === 1
      ? input.singular || input.plural || "{count}"
      : input.plural || input.singular || "{count}";
  const renderedCount = `${count}${input.hasMore ? "+" : ""}`;
  return template.includes("{count}")
    ? template.replaceAll("{count}", renderedCount)
    : `${template} (${renderedCount})`;
}
