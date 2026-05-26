export type FlowControlSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface FlowSliderMark {
  value: number;
  label?: string;
}

export const FLOW_SIZE_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "MD", value: "md" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
];

export function parseDelimitedList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeDelimitedList(value: string[] | undefined): string {
  return (value || []).join(", ");
}

export function parseSliderMarks(value: string | undefined): FlowSliderMark[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawValue, rawLabel] = line.split("|");
      const numericValue = Number(rawValue?.trim());

      if (!Number.isFinite(numericValue)) {
        return null;
      }

      const label = rawLabel?.trim();
      return {
        value: numericValue,
        ...(label ? { label } : {}),
      };
    })
    .filter((mark): mark is FlowSliderMark => Boolean(mark));
}

export function serializeSliderMarks(
  value: FlowSliderMark[] | undefined,
): string {
  return (value || [])
    .map((mark) => `${mark.value}${mark.label ? `|${mark.label}` : ""}`)
    .join("\n");
}

export function normalizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    const parsed = parseDelimitedList(value);
    return parsed.length ? parsed : undefined;
  }

  return undefined;
}

export function normalizeSliderMarks(
  value: unknown,
): FlowSliderMark[] | undefined {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const mark = item as Record<string, unknown>;
        const numericValue = Number(mark.value);

        if (!Number.isFinite(numericValue)) {
          return null;
        }

        return {
          value: numericValue,
          ...(typeof mark.label === "string" && mark.label.trim()
            ? { label: mark.label.trim() }
            : {}),
        };
      })
      .filter((mark): mark is FlowSliderMark => Boolean(mark));
  }

  if (typeof value === "string") {
    const parsed = parseSliderMarks(value);
    return parsed.length ? parsed : undefined;
  }

  return undefined;
}

export function normalizeNumberTuple(
  value: unknown,
): [number, number] | undefined {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  ) {
    return [value[0], value[1]];
  }

  return undefined;
}
