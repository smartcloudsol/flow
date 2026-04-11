import { Extension, Node, mergeAttributes } from "@tiptap/core";

function renderHtmlAttributes(attributes: Record<string, unknown>) {
  const htmlAttributes: Record<string, string> = {};

  if (typeof attributes.class === "string" && attributes.class.trim()) {
    htmlAttributes.class = attributes.class;
  }

  if (typeof attributes.style === "string" && attributes.style.trim()) {
    htmlAttributes.style = attributes.style;
  }

  return htmlAttributes;
}

const htmlAttributeSpec = {
  default: null,
};

export const HtmlAttributeSupport = Extension.create({
  name: "htmlAttributeSupport",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "listItem",
          "blockquote",
          "div",
          "textStyle",
        ],
        attributes: {
          class: {
            ...htmlAttributeSpec,
            parseHTML: (element) => element.getAttribute("class"),
            renderHTML: (attributes) =>
              typeof attributes.class === "string" && attributes.class.trim()
                ? { class: attributes.class }
                : {},
          },
          style: {
            ...htmlAttributeSpec,
            parseHTML: (element) => element.getAttribute("style"),
            renderHTML: (attributes) =>
              typeof attributes.style === "string" && attributes.style.trim()
                ? { style: attributes.style }
                : {},
          },
        },
      },
    ];
  },
});

export const HtmlDiv = Node.create({
  name: "div",
  group: "block",
  content: "block*",

  parseHTML() {
    return [{ tag: "div" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(renderHtmlAttributes(HTMLAttributes)), 0];
  },
});
