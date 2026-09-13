import type { EmailTemplate, EmailTemplateLocalization } from "../api/types";
export declare const ENGLISH_LOCALE = "en";
export declare function canonicalizeTemplateLocale(value?: string | null): string | null;
export declare function normalizeEmailTemplate(template: EmailTemplate): EmailTemplate;
export declare function syncLegacyTemplateAliases(template: EmailTemplate): EmailTemplate;
export declare function updateTemplateLocalization(template: EmailTemplate, locale: string, patch: Partial<EmailTemplateLocalization>): EmailTemplate;
export declare function addTemplateLocale(template: EmailTemplate, locale: string): EmailTemplate;
export declare function removeTemplateLocale(template: EmailTemplate, locale: string): EmailTemplate;
export declare function templateLocaleKeys(template: EmailTemplate): string[];
export interface TemplateLocalizationWarnings {
    incomplete: boolean;
    placeholderMismatch: boolean;
}
export declare function getTemplateLocalizationWarnings(template: EmailTemplate, locale: string): TemplateLocalizationWarnings;
export declare function hasLegacyIncompatibleLocalizations(template: EmailTemplate): boolean;
export declare function serializeEmailTemplate(template: EmailTemplate, supportsLocalizedTemplates: boolean): EmailTemplate;
//# sourceMappingURL=email-template-localization.d.ts.map