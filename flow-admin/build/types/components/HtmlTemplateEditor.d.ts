import type { FormDefinition } from "../api/types";
export interface HtmlTemplateEditorProps {
    value: string;
    onChange?: (value: string | undefined) => void;
    height?: string | number;
    placeholder?: string;
    formDefinition?: FormDefinition;
    variablePickerZIndex?: number;
}
export default function HtmlTemplateEditor({ value, onChange, height, placeholder, formDefinition, variablePickerZIndex, }: HtmlTemplateEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=HtmlTemplateEditor.d.ts.map