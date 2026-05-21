import type { Editor } from "@tiptap/react";
import type { FormDefinition } from "../../api/types";
export interface TemplateVariableOption {
    path: string;
    label: string;
    description?: string;
}
interface TemplateVariablePickerProps {
    editor?: Editor | null;
    formDefinition?: FormDefinition;
    variables?: TemplateVariableOption[];
    size?: "xs" | "sm" | "md" | "lg";
    zIndex?: number;
    onInsert?: (path: string, label: string) => void;
}
export default function TemplateVariablePicker({ editor, formDefinition, variables, size, zIndex, onInsert, }: TemplateVariablePickerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TemplateVariablePicker.d.ts.map