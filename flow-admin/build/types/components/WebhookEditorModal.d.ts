import type { FlowBackendClient } from "../api/backend-client";
import type { BootConfig, WebhookEndpoint } from "../api/types";
interface WebhookEditorModalProps {
    opened: boolean;
    onClose: () => void;
    client: FlowBackendClient;
    boot: BootConfig;
    initialWebhook?: WebhookEndpoint | null;
    mode?: "draft" | "existing";
    zIndex?: number;
    onSaved?: (saved: WebhookEndpoint, isNew: boolean) => void;
}
export default function WebhookEditorModal({ opened, onClose, client, boot, initialWebhook, mode, zIndex, onSaved, }: WebhookEditorModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=WebhookEditorModal.d.ts.map