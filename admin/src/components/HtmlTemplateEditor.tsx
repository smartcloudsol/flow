import { Box, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { Color } from "@tiptap/extension-color";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { editor } from "monaco-editor";
import type { Selection } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormDefinition } from "../api/types";
import MonacoEditor from "./MonacoEditor";
import { HtmlAttributeSupport, HtmlDiv } from "./tiptap/HtmlElementSupport";
import {
  HtmlTable,
  HtmlTableCell,
  HtmlTableHeader,
  HtmlTableRow,
  normalizeTableSectionsHtml,
} from "./tiptap/HtmlTableSupport";
import {
  TemplateVariable,
  convertTemplateVariablesToSpans,
} from "./tiptap/TemplateVariable";
import TemplateVariablePicker from "./tiptap/TemplateVariablePicker";
import { t } from "../operations/i18n";

export interface HtmlTemplateEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  height?: string | number;
  placeholder?: string;
  formDefinition?: FormDefinition;
  variablePickerZIndex?: number;
}

export default function HtmlTemplateEditor({
  value,
  onChange,
  height = "400px",
  placeholder,
  formDefinition,
  variablePickerZIndex = 100003,
}: HtmlTemplateEditorProps) {
  const [mode, setMode] = useState<"visual" | "code" | "preview">("visual");
  const resolvedHeight = typeof height === "number" ? `${height}px` : height;
  const extractEditableEnvelope = useCallback(
    (
      html: string,
    ): {
      prefix: string;
      bodyHtml: string;
      suffix: string;
    } => {
      const sourceHtml = html || "";
      const bodyOpenMatch = /<body\b[^>]*>/i.exec(sourceHtml);

      if (bodyOpenMatch) {
        const bodyStart = bodyOpenMatch.index + bodyOpenMatch[0].length;
        const bodyCloseMatch = /<\/body\s*>/i.exec(sourceHtml.slice(bodyStart));

        if (bodyCloseMatch) {
          const bodyEnd = bodyStart + bodyCloseMatch.index;

          return {
            prefix: sourceHtml.slice(0, bodyStart),
            bodyHtml: sourceHtml.slice(bodyStart, bodyEnd).trim(),
            suffix: sourceHtml.slice(bodyEnd),
          };
        }
      }

      const styles: string[] = [];
      const bodyHtml = sourceHtml.replace(
        /<style\b[^>]*>[\s\S]*?<\/style>/gi,
        (match) => {
          styles.push(match);
          return "";
        },
      );

      return {
        prefix: styles.length > 0 ? `${styles.join("\n")}\n` : "",
        bodyHtml: bodyHtml.trim(),
        suffix: "",
      };
    },
    [],
  );

  const initialExtracted = extractEditableEnvelope(value || "");
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const codeSelectionRef = useRef<Selection | null>(null);
  const modeRef = useRef<"visual" | "code" | "preview">(mode);
  const lastEmittedVisualValue = useRef<string>("");
  const htmlEnvelopeRef = useRef({
    prefix: initialExtracted.prefix,
    suffix: initialExtracted.suffix,
  });

  const normalizeHtml = (html: string) => html.replace(/\s+/g, " ").trim();
  const recomposeHtml = useCallback(
    (
      bodyHtml: string,
      envelope: { prefix: string; suffix: string } = htmlEnvelopeRef.current,
    ) => `${envelope.prefix}${bodyHtml}${envelope.suffix}`.trim(),
    [],
  );

  useEffect(() => {
    const extracted = extractEditableEnvelope(value || "");
    htmlEnvelopeRef.current = {
      prefix: extracted.prefix,
      suffix: extracted.suffix,
    };
  }, [extractEditableEnvelope, value]);

  // Tiptap editor for visual mode
  const tiptapEditor = useEditor({
    extensions: [
      StarterKit,
      HtmlAttributeSupport,
      HtmlDiv,
      HtmlTable,
      HtmlTableRow,
      HtmlTableCell,
      HtmlTableHeader,
      Underline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph", "div"] }),
      Placeholder.configure({
        placeholder: placeholder || t("Write your email template here..."),
      }),
      TextStyle,
      Color,
      TemplateVariable,
    ],
    content: convertTemplateVariablesToSpans(initialExtracted.bodyHtml || ""),
    onUpdate: ({ editor }) => {
      if (modeRef.current === "visual") {
        const nextBodyHtml = normalizeTableSectionsHtml(editor.getHTML());
        const nextHtml = recomposeHtml(nextBodyHtml);
        lastEmittedVisualValue.current = normalizeHtml(nextHtml);
        onChange?.(nextHtml);
      }
    },
  });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Sync value changes when switching modes or external value changes
  useEffect(() => {
    if (!tiptapEditor) return;

    if (mode === "visual") {
      const extracted = extractEditableEnvelope(value || "");
      htmlEnvelopeRef.current = {
        prefix: extracted.prefix,
        suffix: extracted.suffix,
      };

      // Always convert {{...}} patterns to spans for visual mode
      const convertedValue = convertTemplateVariablesToSpans(
        extracted.bodyHtml || "",
      );
      const normalizedConverted = normalizeHtml(
        recomposeHtml(convertedValue, extracted),
      );
      // Skip self-originated updates to preserve the caret position.
      if (normalizedConverted === lastEmittedVisualValue.current) {
        return;
      }
      const currentContent = tiptapEditor.getHTML();
      const normalizedCurrent = normalizeHtml(currentContent);

      if (normalizedConverted !== normalizedCurrent) {
        tiptapEditor.commands.setContent(convertedValue, {
          emitUpdate: false,
        });
      }
    }
  }, [value, tiptapEditor, mode, extractEditableEnvelope, recomposeHtml]);

  const insertText = (text: string, offsetBefore = 0, offsetAfter = 0) => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const lineNumber = model.getLineCount();
    const column = model.getLineMaxColumn(lineNumber);
    const selection = editor.getSelection() ||
      codeSelectionRef.current || {
        startLineNumber: lineNumber,
        startColumn: column,
        endLineNumber: lineNumber,
        endColumn: column,
      };

    const selectedText = model.getValueInRange(selection) || "";
    const textToInsert = text.replace("{{selection}}", selectedText);

    editor.executeEdits("", [
      {
        range: selection,
        text: textToInsert,
        forceMoveMarkers: true,
      },
    ]);

    // Move cursor to appropriate position
    if (selectedText) {
      // If there was a selection, move after the inserted text
      const newPosition = {
        lineNumber: selection.startLineNumber,
        column: selection.startColumn + textToInsert.length - offsetAfter,
      };
      editor.setPosition(newPosition);
    } else {
      // If no selection, move cursor between the tags
      const newPosition = {
        lineNumber: selection.startLineNumber,
        column: selection.startColumn + offsetBefore,
      };
      editor.setPosition(newPosition);
    }

    editor.focus();
  };

  const handleEditorMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor/esm/vs/editor/editor.api"),
  ) => {
    editorRef.current = editor;
    codeSelectionRef.current = editor.getSelection();

    editor.onDidChangeCursorSelection((event) => {
      codeSelectionRef.current = event.selection;
    });

    // Add custom keyboard shortcuts
    const KeyMod = monaco.KeyMod;
    const KeyCode = monaco.KeyCode;

    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyB, () => {
      insertText("<strong>{{selection}}</strong>", 8, 9);
    });

    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyI, () => {
      insertText("<em>{{selection}}</em>", 4, 5);
    });
  };

  // Helper to insert template variables in both modes
  /*
  const insertTemplate = (templateVar: string) => {
    if (mode === "visual") {
      tiptapEditor?.commands.insertContent(templateVar);
    } else {
      insertText(templateVar, templateVar.length, 0);
    }
  };
  */

  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="wrap">
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as "visual" | "code" | "preview")}
          data={[
            { label: t("Visual"), value: "visual" },
            { label: t("Code"), value: "code" },
            { label: t("Preview"), value: "preview" },
          ]}
          size="xs"
        />

        <Box
          style={{
            borderLeft: "1px solid var(--mantine-color-gray-3)",
            height: 24,
            marginLeft: 4,
            marginRight: 4,
          }}
        />

        {mode === "visual" && (
          <TemplateVariablePicker
            editor={tiptapEditor}
            formDefinition={formDefinition}
            size="xs"
            zIndex={variablePickerZIndex}
          />
        )}
        {mode === "code" && (
          <TemplateVariablePicker
            formDefinition={formDefinition}
            size="xs"
            zIndex={variablePickerZIndex}
            onInsert={(path) => insertText(`{{${path}}}`, path.length + 4, 0)}
          />
        )}
      </Group>

      {placeholder && !value && (
        <Text size="xs" c="dimmed">
          {placeholder}
        </Text>
      )}

      {mode === "visual" ? (
        <Box
          style={{
            height: resolvedHeight,
            minHeight: resolvedHeight,
            overflow: "hidden",
            resize: "vertical",
          }}
        >
          <RichTextEditor
            editor={tiptapEditor}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <RichTextEditor.Toolbar>
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Bold />
                <RichTextEditor.Italic />
                <RichTextEditor.Underline />
                <RichTextEditor.ClearFormatting />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.BulletList />
                <RichTextEditor.OrderedList />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Link />
                <RichTextEditor.Unlink />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.AlignLeft />
                <RichTextEditor.AlignCenter />
                <RichTextEditor.AlignRight />
              </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>

            <RichTextEditor.Content
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            />
          </RichTextEditor>
        </Box>
      ) : mode === "code" ? (
        <MonacoEditor
          language="html"
          height={height}
          minHeight={height}
          value={value}
          onChange={(newValue) => {
            if (onChange) {
              onChange(newValue);
            }
          }}
          onMount={handleEditorMount}
        />
      ) : (
        <Box
          style={{
            height: resolvedHeight,
            border: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <iframe
            title="Template preview"
            style={{
              width: "100%",
              height: "100%",
              border: 0,
              background: "#fff",
            }}
            srcDoc={`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="margin:0;padding:0;">
    ${value || ""}
  </body>
</html>`}
          />
        </Box>
      )}
    </Stack>
  );
}
