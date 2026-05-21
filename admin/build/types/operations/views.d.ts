import type { AdminView } from "../api/types";
export type OperationsView = Extract<AdminView, "submissions" | "workflows">;
export interface OperationsViewDefinition {
    title: string;
    description: string;
    scrollToId: string;
}
export declare const OPERATIONS_VIEW_ORDER: OperationsView[];
export declare const OPERATIONS_VIEW_DEFINITIONS: Record<OperationsView, OperationsViewDefinition>;
//# sourceMappingURL=views.d.ts.map