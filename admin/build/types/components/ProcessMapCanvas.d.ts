import "@xyflow/react/dist/style.css";
import type { FlowBackendClient } from "../api/backend-client";
import type { BootConfig, ProcessMap, Workflow } from "../api/types";
export interface ProcessMapCanvasProps {
    processMap: ProcessMap | null;
    workflows: Workflow[];
    onSave: (map: ProcessMap) => Promise<ProcessMap>;
    onCancel: () => void;
    boot: BootConfig;
    client: FlowBackendClient;
    isSaving?: boolean;
    onWorkflowSaved?: (workflow: Workflow, isNew: boolean) => void;
    InfoLabel?: (props: {
        text: string;
        scrollToId: string;
        onOpen: (targetScrollToId: string) => void;
    }) => JSX.Element;
    openInfo?: (targetScrollToId: string) => void;
}
export default function ProcessMapCanvas(props: ProcessMapCanvasProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProcessMapCanvas.d.ts.map