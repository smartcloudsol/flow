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
  // Match {{...}} that are NOT already inside a data-template-variable span
  const regex = /\{\{([^}]+)\}\}/g;

  return html.replace(regex, (match, path) => {
    const trimmedPath = path.trim();
    // Extract a label from the path (e.g., "submission.fields.name" → "name")
    const parts = trimmedPath.split(".");
    const label = parts[parts.length - 1];

    return `<span data-template-variable="true" data-path="${trimmedPath}" data-label="${label}" class="template-variable">${match}</span>`;
  });
}
