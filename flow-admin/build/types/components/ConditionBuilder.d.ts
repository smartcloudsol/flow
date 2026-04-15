import type { FormDefinition } from "../api/types";
export interface WorkflowCondition {
    field: string;
    operator: string;
    value: string;
}
export interface ConditionBuilderProps {
    conditions: WorkflowCondition[];
    onChange: (conditions: WorkflowCondition[]) => void;
    forms?: FormDefinition[];
}
export default function ConditionBuilder({ conditions, onChange, forms, }: ConditionBuilderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ConditionBuilder.d.ts.map