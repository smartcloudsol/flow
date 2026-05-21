import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import TemplateVariableComponent from "./TemplateVariableComponent";

export const TemplateVariable = Node.create({
  name: "templateVariable",

  group: "inline",

  inline: true,

  atom: true,

  addAttributes() {
    return {
      path: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-path"),
        renderHTML: (attributes) => ({
          "data-path": attributes.path,
        }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-template-variable]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-template-variable": "true",
        class: "template-variable",
      }),
      `{{${HTMLAttributes["data-path"]}}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TemplateVariableComponent);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isTemplateVariable = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isTemplateVariable = true;
              tr.delete(pos, pos + node.nodeSize);
              return false;
            }
          });

          return isTemplateVariable;
        }),
    };
  },
});

// Helper to parse {{...}} patterns and convert to template variable nodes
export function parseTemplateVariables(text: string): Array<{
  type: "text" | "variable";
  content: string;
  path?: string;
}> {
  const regex = /\{\{([^}]+)\}\}/g;
  const parts: Array<{
    type: "text" | "variable";
    content: string;
    path?: string;
  }> = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the variable
    const path = match[1].trim();
    parts.push({
      type: "variable",
      content: match[0],
      path,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

// Helper to convert {{...}} patterns in HTML to template variable spans
export function convertTemplateVariablesToSpans(html: string): string {
  if (!html || typeof document === "undefined") {
    return html;
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const wrapVariablesInTextNode = (textNode: globalThis.Text) => {
    const text = textNode.textContent || "";
    const regex = /\{\{([^}]+)\}\}/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let changed = false;

    while ((match = regex.exec(text)) !== null) {
      changed = true;

      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index)),
        );
      }

      const rawMatch = match[0];
      const trimmedPath = match[1].trim();
      const parts = trimmedPath.split(".");
      const label = parts[parts.length - 1];
      const span = document.createElement("span");
      span.setAttribute("data-template-variable", "true");
      span.setAttribute("data-path", trimmedPath);
      span.setAttribute("data-label", label);
      span.className = "template-variable";
      span.textContent = rawMatch;
      fragment.appendChild(span);

      lastIndex = regex.lastIndex;
    }

    if (!changed) {
      return;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.replaceWith(fragment);
  };

  const walk = (node: globalThis.Node) => {
    if (node.nodeType === globalThis.Node.TEXT_NODE) {
      wrapVariablesInTextNode(node as globalThis.Text);
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.matches("span[data-template-variable]")) {
      return;
    }

    Array.from(node.childNodes).forEach((child) => walk(child));
  };

  Array.from(template.content.childNodes).forEach((child) => walk(child));

  return template.innerHTML;
}
