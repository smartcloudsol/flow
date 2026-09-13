import assert from "node:assert/strict";
import test from "node:test";
import type { EmailTemplate } from "../src/api/types.ts";
import {
  addTemplateLocale,
  canonicalizeTemplateLocale,
  getTemplateLocalizationWarnings,
  normalizeEmailTemplate,
  removeTemplateLocale,
  serializeEmailTemplate,
  templateLocaleKeys,
  updateTemplateLocalization,
} from "../src/components/email-template-localization.ts";

const baseTemplate: EmailTemplate = {
  templateKey: "reply",
  accountId: "account",
  siteId: "site",
  name: "Reply",
  subject: "Hello {{submission.fields.name}}",
  htmlBody: "<p>Hello {{submission.fields.name}}</p>",
  textBody: "Hello {{submission.fields.name}}",
};

test("canonicalizes BCP 47 locale tags", () => {
  assert.equal(canonicalizeTemplateLocale(" FR_fr "), "fr-FR");
  assert.equal(canonicalizeTemplateLocale("not a locale"), null);
});

test("normalizes legacy fields as English localized content", () => {
  const normalized = normalizeEmailTemplate(baseTemplate);
  assert.equal(normalized.defaultLocale, "en");
  assert.equal(normalized.localizations?.en?.subject, baseTemplate.subject);
  assert.equal(normalized.subject, baseTemplate.subject);
});

test("lists a legacy declared locale together with the English fallback", () => {
  assert.deepEqual(templateLocaleKeys({ ...baseTemplate, locale: "fr_fr" }), [
    "en",
    "fr-FR",
  ]);
});

test("keeps English when localized contents are added and removed", () => {
  const localized = updateTemplateLocalization(
    addTemplateLocale(normalizeEmailTemplate(baseTemplate), "fr-fr"),
    "fr-FR",
    { subject: "Bonjour {{submission.fields.name}}" },
  );
  assert.ok(localized.localizations?.en);
  assert.equal(
    localized.localizations?.["fr-FR"]?.subject,
    "Bonjour {{submission.fields.name}}",
  );
  assert.ok(removeTemplateLocale(localized, "en").localizations?.en);
});

test("blocks multi-locale data from being sent to a legacy backend", () => {
  const localized = updateTemplateLocalization(
    addTemplateLocale(normalizeEmailTemplate(baseTemplate), "fr"),
    "fr",
    { subject: "Bonjour", textBody: "Bonjour" },
  );
  assert.throws(
    () => serializeEmailTemplate(localized, false),
    /cannot save a template with multiple localized contents/,
  );
  assert.ok(serializeEmailTemplate(localized, true).localizations?.fr);
});

test("blocks a non-default localized content that a legacy backend would drop", () => {
  const localized = normalizeEmailTemplate({
    ...baseTemplate,
    subject: undefined,
    htmlBody: undefined,
    textBody: undefined,
    defaultLocale: "fr",
    localizations: { en: { subject: "Hello", textBody: "Hello" }, fr: {} },
  });
  assert.throws(() => serializeEmailTemplate(localized, false));
});

test("warns about incomplete content and mismatched placeholders", () => {
  const localized = updateTemplateLocalization(
    addTemplateLocale(normalizeEmailTemplate(baseTemplate), "de"),
    "de",
    { subject: "Hallo {{submission.email}}" },
  );
  assert.deepEqual(getTemplateLocalizationWarnings(localized, "de"), {
    incomplete: true,
    placeholderMismatch: true,
  });
});
