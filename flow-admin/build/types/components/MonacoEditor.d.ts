import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
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
export default function MonacoEditor({ value, onChange, language, height, minHeight, readOnly, theme, minimap, wordWrap, onMount, }: MonacoEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MonacoEditor.d.ts.map