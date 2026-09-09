import type { FieldConfig, FormAttributes } from "../shared/types";

export type FlowTranslate = (key: string) => string;

const HTML_AUTHORED_ATTRIBUTES = [
  "placeholder",
  "title",
  "aria-label",
  "alt",
] as const;

const HTML_TRANSLATION_BOUNDARIES = new Set([
  "script",
  "style",
  "template",
  "code",
  "pre",
  "svg",
]);

const FORM_AUTHORED_STRING_KEYS = new Set([
  "formName",
  "submitLabel",
  "successMessage",
  "errorMessage",
  "showFormAgainLabel",
  "draftResumeTitle",
  "draftResumeDescription",
  "draftSaveSuccessMessage",
  "pendingModerationMessage",
  "replyingToLabel",
  "cancelReplyLabel",
  "discussionSignInRequiredMessage",
  "discussionSignInLabel",
  "discussionPermissionDeniedMessage",
]);

const FIELD_AUTHORED_STRING_KEYS = new Set([
  "label",
  "description",
  "placeholder",
  "validationMessage",
  "checkedLabel",
  "onLabel",
  "offLabel",
  "clearAllLabel",
  "successMessage",
  "title",
  "subtitle",
  "buttonLabel",
  "acceptLabel",
  "continueLabel",
  "continueDescription",
  "emptyStateText",
  "nextButtonLabel",
  "prevButtonLabel",
  "submitButtonLabel",
  "legend",
  "content",
  "cite",
  "showLabel",
  "hideLabel",
  "alt",
  "caption",
  "bullet",
  "overflowLabel",
  "message",
]);

function translateNonEmpty(value: unknown, translate: FlowTranslate): unknown {
  if (typeof value !== "string" || value === "" || /^\s*$/u.test(value)) {
    return value;
  }

  const match = /^(\s*)([\s\S]*?)(\s*)$/u.exec(value);
  if (!match) {
    return value;
  }

  const [, leading, content, trailing] = match;
  const lookupKey = content.replaceAll("\u00a0", " ");
  const translated = translate(lookupKey);

  return `${leading}${translated === lookupKey ? content : translated}${trailing}`;
}

export function translateAuthoredString(
  value: string,
  translate: FlowTranslate,
): string {
  return translateNonEmpty(value, translate) as string;
}

function translateHtmlTextNode(value: string, translate: FlowTranslate) {
  return translateAuthoredString(value, translate);
}

function translateHtmlElement(element: Element, translate: FlowTranslate) {
  const tagName = element.tagName.toLowerCase();
  if (HTML_TRANSLATION_BOUNDARIES.has(tagName)) {
    return;
  }

  HTML_AUTHORED_ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) {
      return;
    }

    const value = element.getAttribute(attribute) ?? "";
    element.setAttribute(attribute, translateAuthoredString(value, translate));
  });

  if (tagName === "input") {
    const type = (element.getAttribute("type") || "text").toLowerCase();
    if (["submit", "reset", "button"].includes(type)) {
      const value = element.getAttribute("value");
      if (value !== null) {
        element.setAttribute("value", translateAuthoredString(value, translate));
      }
    }
  }

  Array.from(element.childNodes).forEach((child) => {
    if (child.nodeType === 3) {
      child.nodeValue = translateHtmlTextNode(child.nodeValue ?? "", translate);
      return;
    }

    if (child.nodeType === 1) {
      translateHtmlElement(child as Element, translate);
    }
  });
}

export function translateAuthoredHtml(
  html: string,
  translate: FlowTranslate,
  ownerDocument: Document = document,
): string {
  if (!html) {
    return html;
  }

  const container = ownerDocument.createElement("div");
  container.innerHTML = html;
  translateHtmlElement(container, translate);
  return container.innerHTML;
}

function translateNestedAuthoredValue(
  value: unknown,
  translate: FlowTranslate,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => translateNestedAuthoredValue(entry, translate));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;
  const translated: Record<string, unknown> = {};
  const isDisplayCode = source.type === "display-code";

  for (const [key, entry] of Object.entries(source)) {
    if (
      FIELD_AUTHORED_STRING_KEYS.has(key) &&
      !(isDisplayCode && key === "content")
    ) {
      translated[key] = translateNonEmpty(entry, translate);
      continue;
    }

    translated[key] = translateNestedAuthoredValue(entry, translate);
  }

  return translated;
}

export function translateAuthoredFormContent(
  form: FormAttributes,
  fields: FieldConfig[],
  translate: FlowTranslate,
): { form: FormAttributes; fields: FieldConfig[] } {
  const translatedForm = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      FORM_AUTHORED_STRING_KEYS.has(key)
        ? translateNonEmpty(value, translate)
        : key === "actions"
          ? translateNestedAuthoredValue(value, translate)
          : value,
    ]),
  ) as FormAttributes;

  return {
    form: translatedForm,
    fields: translateNestedAuthoredValue(fields, translate) as FieldConfig[],
  };
}
