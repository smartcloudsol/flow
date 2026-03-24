import { useRef, useEffect } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { Box, Loader, Stack, Text } from "@mantine/core";
import type { editor } from "monaco-editor";

export interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language: "html" | "json" | "yaml" | "markdown" | "plaintext" | "handlebars";
  height?: string | number;
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
  readOnly = false,
  theme = "vs-light",
  minimap = false,
  wordWrap = "on",
  onMount,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Store monaco globally for keyboard shortcuts
    if (!window.monaco) {
      window.monaco = monaco;
    }

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

    // Call external onMount if provided
    if (onMount) {
      onMount(editor, monaco);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup
      editorRef.current?.dispose();
    };
  }, []);

  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "var(--mantine-radius-sm)",
        overflow: "hidden",
      }}
    >
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme={theme}
        loading={
          <Stack align="center" justify="center" style={{ height }}>
            <Loader size="md" />
            <Text size="sm" c="dimmed">
              Loading editor...
            </Text>
          </Stack>
        }
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
        }}
      />
    </Box>
  );
}

// Extend window to access monaco globally
declare global {
  interface Window {
    monaco?: Monaco;
  }
}
