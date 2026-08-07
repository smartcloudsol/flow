import type { ContentReference, FormAttributes } from "../shared/types";

export function sameContentReference(
  left: ContentReference | undefined,
  right: ContentReference | undefined,
): boolean {
  return Boolean(
    left &&
      right &&
      left.namespace === right.namespace &&
      left.type === right.type &&
      left.id === right.id,
  );
}

export function resolveFormContentReference(
  form: FormAttributes,
): ContentReference | undefined {
  if (form.contentRef) return form.contentRef;
  if (form.contentTargetSource === "canonical-url" && typeof window !== "undefined") {
    const canonicalHref = document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.href;
    if (canonicalHref) {
      const url = new URL(canonicalHref, window.location.href);
      return { namespace: "url", type: "page", id: `${url.origin}${url.pathname}` };
    }
    return { namespace: "url", type: "page", id: window.location.pathname };
  }
  if (form.contentTargetSource === "explicit") {
    const namespace = form.targetNamespace?.trim();
    const type = form.targetType?.trim();
    const id = form.targetId?.trim();
    return namespace && type && id ? { namespace, type, id } : undefined;
  }
  if (form.wpContext?.postId && form.wpContext.postType) {
    return {
      namespace: "wordpress",
      type: form.wpContext.postType,
      id: String(form.wpContext.postId),
    };
  }
  return undefined;
}
