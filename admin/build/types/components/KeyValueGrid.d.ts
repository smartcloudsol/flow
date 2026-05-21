interface FieldSchema {
    label?: string;
    [key: string]: unknown;
}
export declare function KeyValueGrid({ value, maxHeight, fieldSchema, }: {
    value: Record<string, unknown>;
    maxHeight?: number;
    fieldSchema?: Record<string, FieldSchema>;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=KeyValueGrid.d.ts.map