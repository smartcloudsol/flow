import type { FlowBackendClient } from "../api/backend-client";
import type { BootConfig, EmailTemplate } from "../api/types";
interface TemplateEditorModalProps {
    opened: boolean;
    onClose: () => void;
    client: FlowBackendClient;
    boot: BootConfig;
    initialTemplate?: EmailTemplate | null;
    mode?: "draft" | "existing";
    zIndex?: number;
    onSaved?: (saved: EmailTemplate, isNew: boolean) => void;
}
export default function TemplateEditorModal({ opened, onClose, client, boot, initialTemplate, mode, zIndex, onSaved, }: TemplateEditorModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TemplateEditorModal.d.ts.map