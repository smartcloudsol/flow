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

function createHtmlAttribute(name: string) {
  return {
    ...htmlAttributeSpec,
    parseHTML: (element: Element) => element.getAttribute(name),
    renderHTML: (attributes: Record<string, unknown>) =>
      typeof attributes[name] === "string" && attributes[name].trim()
        ? { [name]: attributes[name] }
        : {},
  };
}

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
          "table",
          "tableRow",
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          class: createHtmlAttribute("class"),
          style: createHtmlAttribute("style"),
          align: createHtmlAttribute("align"),
          valign: createHtmlAttribute("valign"),
          width: createHtmlAttribute("width"),
          height: createHtmlAttribute("height"),
          bgcolor: createHtmlAttribute("bgcolor"),
        },
      },
      {
        types: ["table"],
        attributes: {
          border: createHtmlAttribute("border"),
          cellpadding: createHtmlAttribute("cellpadding"),
          cellspacing: createHtmlAttribute("cellspacing"),
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
