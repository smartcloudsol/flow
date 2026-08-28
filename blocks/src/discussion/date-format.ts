import type {
  DiscussionDateStyle,
  DiscussionTimeStyle,
} from "./types";

export function formatDiscussionDate(input: {
  value: string;
  locale?: string;
  dateStyle?: DiscussionDateStyle;
  timeStyle?: DiscussionTimeStyle;
}): string | undefined {
  const date = new Date(input.value);
  if (Number.isNaN(date.getTime())) return undefined;

  try {
    return new Intl.DateTimeFormat(input.locale?.trim() || undefined, {
      dateStyle: input.dateStyle || "medium",
      ...(input.timeStyle && input.timeStyle !== "none"
        ? { timeStyle: input.timeStyle }
        : {}),
    }).format(date);
  } catch {
    return undefined;
  }
}
