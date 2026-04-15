import { Node } from "@tiptap/core";
export declare const TemplateVariable: Node<any, any>;
export declare function parseTemplateVariables(text: string): Array<{
    type: "text" | "variable";
    content: string;
    path?: string;
}>;
export declare function convertTemplateVariablesToSpans(html: string): string;
//# sourceMappingURL=TemplateVariable.d.ts.map