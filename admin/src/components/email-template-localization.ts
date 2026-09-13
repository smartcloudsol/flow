import type {
  EmailTemplate,
  EmailTemplateLocalization,
} from "../api/types";

export const ENGLISH_LOCALE = "en";

export function canonicalizeTemplateLocale(value?: string | null):
  | string
  | null {
  const candidate = value?.trim().replaceAll("_", "-");
  if (!candidate) return null;

  try {
    return Intl.getCanonicalLocales(candidate)[0] ?? null;
  } catch {
    return null;
  }
}

function hasContent(localization?: EmailTemplateLocalization): boolean {
  return Boolean(
    localization?.subject?.trim() ||
      localization?.htmlBody?.trim() ||
      localization?.textBody?.trim(),
  );
}

export function normalizeEmailTemplate(template: EmailTemplate): EmailTemplate {
  const legacyLocale =
    canonicalizeTemplateLocale(template.defaultLocale) ??
    canonicalizeTemplateLocale(template.locale) ??
    ENGLISH_LOCALE;
  const localizations: Record<string, EmailTemplateLocalization> = {};

  Object.entries(template.localizations ?? {}).forEach(([locale, value]) => {
    const canonicalLocale = canonicalizeTemplateLocale(locale);
    if (!canonicalLocale || !value || typeof value !== "object") return;
    localizations[canonicalLocale] = {
      ...(localizations[canonicalLocale] ?? {}),
      ...value,
    };
  });

  const legacyContent: EmailTemplateLocalization = {
    subject: template.subject,
    htmlBody: template.htmlBody,
    textBody: template.textBody,
  };
  if (hasContent(legacyContent)) {
    localizations[legacyLocale] = {
      ...legacyContent,
      ...(localizations[legacyLocale] ?? {}),
    };
  }

  localizations[ENGLISH_LOCALE] ??= {};
  localizations[legacyLocale] ??= {};

  return syncLegacyTemplateAliases({
    ...template,
    defaultLocale: legacyLocale,
    localizations,
  });
}

export function syncLegacyTemplateAliases(
  template: EmailTemplate,
): EmailTemplate {
  const defaultLocale =
    canonicalizeTemplateLocale(template.defaultLocale) ?? ENGLISH_LOCALE;
  const content = template.localizations?.[defaultLocale] ?? {};

  return {
    ...template,
    defaultLocale,
    localizations: template.localizations,
    locale: defaultLocale,
    subject: content.subject ?? "",
    htmlBody: content.htmlBody ?? "",
    textBody: content.textBody ?? "",
  };
}

export function updateTemplateLocalization(
  template: EmailTemplate,
  locale: string,
  patch: Partial<EmailTemplateLocalization>,
): EmailTemplate {
  const canonicalLocale = canonicalizeTemplateLocale(locale) ?? ENGLISH_LOCALE;
  return syncLegacyTemplateAliases({
    ...template,
    localizations: {
      ...(template.localizations ?? {}),
      [canonicalLocale]: {
        ...(template.localizations?.[canonicalLocale] ?? {}),
        ...patch,
      },
    },
  });
}

export function addTemplateLocale(
  template: EmailTemplate,
  locale: string,
): EmailTemplate {
  const canonicalLocale = canonicalizeTemplateLocale(locale);
  if (!canonicalLocale) return template;

  return {
    ...template,
    localizations: {
      ...(template.localizations ?? {}),
      [canonicalLocale]: template.localizations?.[canonicalLocale] ?? {},
    },
  };
}

export function removeTemplateLocale(
  template: EmailTemplate,
  locale: string,
): EmailTemplate {
  const canonicalLocale = canonicalizeTemplateLocale(locale);
  if (!canonicalLocale || canonicalLocale === ENGLISH_LOCALE) return template;

  const localizations = { ...(template.localizations ?? {}) };
  delete localizations[canonicalLocale];
  const defaultLocale =
    template.defaultLocale === canonicalLocale
      ? ENGLISH_LOCALE
      : template.defaultLocale;
  return syncLegacyTemplateAliases({
    ...template,
    defaultLocale,
    localizations,
  });
}

export function templateLocaleKeys(template: EmailTemplate): string[] {
  const declaredLocale =
    canonicalizeTemplateLocale(template.defaultLocale) ??
    canonicalizeTemplateLocale(template.locale);
  return Array.from(
    new Set(
      [
        ENGLISH_LOCALE,
        declaredLocale,
        ...Object.keys(template.localizations ?? {}).map(
          canonicalizeTemplateLocale,
        ),
      ].filter((locale): locale is string => Boolean(locale)),
    ),
  ).sort((left, right) => {
    if (left === ENGLISH_LOCALE) return -1;
    if (right === ENGLISH_LOCALE) return 1;
    return left.localeCompare(right);
  });
}

function placeholders(value?: string): Set<string> {
  const found = new Set<string>();
  for (const match of value?.matchAll(/{{\s*([^{}|]+?)(?:\s*\|[^{}]*)?\s*}}/g) ?? []) {
    const name = match[1]?.trim();
    if (name) found.add(name);
  }
  return found;
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

export interface TemplateLocalizationWarnings {
  incomplete: boolean;
  placeholderMismatch: boolean;
}

export function getTemplateLocalizationWarnings(
  template: EmailTemplate,
  locale: string,
): TemplateLocalizationWarnings {
  const content = template.localizations?.[locale] ?? {};
  const fallback =
    template.localizations?.[template.defaultLocale ?? ENGLISH_LOCALE] ?? {};
  const incomplete =
    !content.subject?.trim() ||
    (!content.htmlBody?.trim() && !content.textBody?.trim());
  const placeholderMismatch = (["subject", "htmlBody", "textBody"] as const).some(
    (field) => !sameSet(placeholders(content[field]), placeholders(fallback[field])),
  );

  return { incomplete, placeholderMismatch };
}

export function hasLegacyIncompatibleLocalizations(
  template: EmailTemplate,
): boolean {
  const defaultLocale =
    canonicalizeTemplateLocale(template.defaultLocale) ?? ENGLISH_LOCALE;
  return Object.entries(template.localizations ?? {}).some(
    ([locale, content]) => locale !== defaultLocale && hasContent(content),
  );
}

export function serializeEmailTemplate(
  template: EmailTemplate,
  supportsLocalizedTemplates: boolean,
): EmailTemplate {
  const normalized = syncLegacyTemplateAliases(normalizeEmailTemplate(template));
  if (supportsLocalizedTemplates) return normalized;

  if (hasLegacyIncompatibleLocalizations(normalized)) {
    throw new Error(
      "This backend cannot save a template with multiple localized contents.",
    );
  }

  const legacy = { ...normalized };
  delete legacy.defaultLocale;
  delete legacy.localizations;
  return legacy;
}
