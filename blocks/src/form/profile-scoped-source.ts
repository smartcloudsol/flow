import type { FormSourceData } from "./form-extractor";

/** Shared Gutenberg content must never carry one backend's authoritative form identity. */
export function profileScopedFormSource(source: FormSourceData, formId: string | null | undefined,
  profile?: { id: "production" | "development"; bindingRevision: number }): FormSourceData {
  if (!profile) return source;
  if (!Number.isSafeInteger(source.postId) || Number(source.postId) < 1) throw new Error("A saved WordPress post is required for backend profile synchronization.");
  return { ...source, attributes: { ...source.attributes,
    formName: source.attributes.formName || source.attributes.formId || undefined,
    formId: formId || `form-${source.postId}-${profile.id}-${profile.bindingRevision}` } };
}
