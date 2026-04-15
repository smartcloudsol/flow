export interface JsonDraftEditorProps {
    label: string;
    description?: string;
    value: string;
    onChange: (value: string | undefined) => void;
    height?: string | number;
    minHeight?: string | number;
    warnings?: Array<string | null | undefined>;
}
export default function JsonDraftEditor({ label, description, value, onChange, height, minHeight, warnings, }: JsonDraftEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=JsonDraftEditor.d.ts.map