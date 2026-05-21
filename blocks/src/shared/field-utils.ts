import type { SelectOption } from "./types";

/**
 * Parse options text (one option per line in "Label|value" format) to SelectOption array
 */
export function parseOptions(optionsText: string | undefined): SelectOption[] {
  if (!optionsText) {
    return [];
  }

  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.split("|");
      return {
        label: label?.trim() ?? "",
        value: value?.trim() ?? label?.trim() ?? "",
      };
    });
}
