import type { FormDefinition } from "../api/types";
export declare function getConditionFieldOptions(): {
    value: string;
    label: string;
}[];
export declare function normalizeConditionFieldValue(field: string): string;
export declare function normalizeConditionStoredValue(field: string, value: string, forms?: FormDefinition[]): string;
//# sourceMappingURL=condition-builder-utils.d.ts.map