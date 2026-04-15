import type { FlowBackendClient } from "../api/backend-client";
import type { BootConfig, Workflow } from "../api/types";
import { type WorkflowCondition } from "./ConditionBuilder";
export interface WorkflowEditorModalProps {
    opened: boolean;
    onClose: () => void;
    /** null = create new, non-null = edit existing */
    initialWorkflow: Workflow | null;
    client: FlowBackendClient;
    boot: BootConfig;
    onSaved: (workflow: Workflow, isNew: boolean) => void;
    allowedTriggerEvents?: string[];
    defaultTriggerEvent?: string;
    defaultConditions?: WorkflowCondition[];
    persistTriggerEvent?: boolean;
    zIndex?: number;
}
export default function WorkflowEditorModal({ opened, onClose, initialWorkflow, client, boot, onSaved, allowedTriggerEvents, defaultTriggerEvent, defaultConditions, persistTriggerEvent, zIndex, }: WorkflowEditorModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=WorkflowEditorModal.d.ts.map