export function buildDiscussionRatingValues(
  maximum: number,
  fractions: number,
): number[] {
  if (
    !Number.isInteger(maximum) ||
    maximum < 1 ||
    !Number.isInteger(fractions) ||
    fractions < 1
  ) {
    return [];
  }
  return Array.from(
    { length: maximum * fractions },
    (_, index) => (index + 1) / fractions,
  );
}

export function normalizeDiscussionRatingValue(
  value: number,
  maximum: number,
  fractions: number,
): number | undefined {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(maximum) ||
    maximum < 1 ||
    !Number.isInteger(fractions) ||
    fractions < 1
  ) {
    return undefined;
  }
  const minimumUnits = 1;
  const maximumUnits = maximum * fractions;
  const units = Math.min(
    maximumUnits,
    Math.max(minimumUnits, Math.round(value * fractions)),
  );
  return units / fractions;
}
