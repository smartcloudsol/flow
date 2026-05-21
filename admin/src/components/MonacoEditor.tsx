import { useEffect, useRef, useState } from "react";
import type { Monaco, OnMount } from "@monaco-editor/react";
import { Box, Loader, Stack, Text } from "@mantine/core";
import type { editor } from "monaco-editor";
import { t } from "../operations/i18n";
import { ensureMonacoInitialized, loadMonacoReactModule } from "./monaco-init";

export interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language: "html" | "json" | "yaml" | "markdown" | "plaintext" | "handlebars";
  height?: string | number;
  minHeight?: string | number;
  readOnly?: boolean;
  theme?: "vs-dark" | "vs-light";
  minimap?: boolean;
  wordWrap?: "on" | "off" | "wordWrapColumn" | "bounded";
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
}

export default function MonacoEditor({
  value,
  onChange,
  language,
  height = "400px",
  minHeight = "180px",
  readOnly = false,
  theme = "vs-light",
  minimap = false,
  wordWrap = "on",
  onMount,
}: MonacoEditorProps) {
  const resolvedHeight = typeof height === "number" ? `${height}px` : height;
  const resolvedMinHeight =
    typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [EditorComponent, setEditorComponent] = useState<
    (typeof import("@monaco-editor/react"))["default"] | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([ensureMonacoInitialized(), loadMonacoReactModule()])
      .then(([, monacoReactModule]) => {
        if (!cancelled) {
          setEditorComponent(() => monacoReactModule.default);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : t("Failed to load editor."),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.setLanguageConfiguration("markdown", {
      wordPattern: /[^\s]+/g,
    });

    monaco.languages.setLanguageConfiguration("yaml", {
      comments: {
        lineComment: "#",
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });

    editor.updateOptions({
      readOnly,
      wordWrap,
      minimap: { enabled: minimap },
      fontSize: 14,
      lineNumbers: "on",
      renderWhitespace: "selection",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
    });

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  useEffect(() => {
    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  const loadingState = (
    <Stack align="center" justify="center" style={{ height: "100%" }}>
      <Loader size="md" />
      <Text size="sm" c="dimmed">
        {t("Loading editor...")}
      </Text>
    </Stack>
  );

  return (
    <Box
      style={{
        height: resolvedHeight,
        minHeight: resolvedMinHeight,
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "var(--mantine-radius-sm)",
        overflow: "auto",
        resize: readOnly ? undefined : "vertical",
      }}
    >
      {EditorComponent ? (
        <EditorComponent
          height="100%"
          language={language}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          theme={theme}
          loading={loadingState}
          options={{
            readOnly,
            wordWrap,
            minimap: { enabled: minimap },
            fontSize: 14,
            lineNumbers: "on",
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      ) : loadError ? (
        <Stack align="center" justify="center" style={{ height: "100%" }}>
          <Text size="sm" c="red">
            {loadError}
          </Text>
        </Stack>
      ) : (
        loadingState
      )}
    </Box>
  );
}
