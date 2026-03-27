import {
  getStoreSelect,
  TEXT_DOMAIN,
  type CustomTranslations,
  type Store,
} from "@smart-cloud/flow-core";
import { I18n } from "aws-amplify/utils";
import { __ } from "@wordpress/i18n";
import { operationsTranslations } from "./translations";

type TranslateFn = (key: string) => string;

let translate: TranslateFn = (key) => key;

export function t(key: string): string {
  return translate(key) || key;
}

export function initWordPressOperationsI18n(): void {
  translate = (key) => __(key, TEXT_DOMAIN) || key;
}

export function initAmplifyOperationsI18n(): void {
  I18n.putVocabularies(operationsTranslations);
  translate = (key) => I18n.get(key) || key;
}

export function syncAmplifyOperationsI18n(
  store: Store,
  overrides?: {
    language?: string;
    direction?: "ltr" | "rtl" | "auto";
  },
): {
  language?: string;
  direction: "ltr" | "rtl";
} {
  const customTranslations = getStoreSelect(store).getCustomTranslations();
  if (customTranslations) {
    I18n.putVocabularies(customTranslations as CustomTranslations);
  }

  const language = overrides?.language ?? getStoreSelect(store).getLanguage();
  if (!language || language === "system") {
    I18n.setLanguage("");
  } else {
    I18n.setLanguage(language);
  }

  return {
    language: !language || language === "system" ? undefined : String(language),
    direction: resolveOperationsDirection(
      language ?? undefined,
      overrides?.direction ?? getStoreSelect(store).getDirection() ?? undefined,
    ),
  };
}

export function resolveOperationsDirection(
  language?: string | null,
  direction?: "ltr" | "rtl" | "auto" | null,
): "ltr" | "rtl" {
  if (!direction || direction === "auto") {
    return language === "ar" || language === "he" ? "rtl" : "ltr";
  }

  return direction;
}
