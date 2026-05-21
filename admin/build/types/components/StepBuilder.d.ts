import type { EmailTemplate, WebhookEndpoint } from "../api/types";
export interface WorkflowStep {
    actionType: string;
    config: Record<string, unknown>;
}
export interface StepBuilderProps {
    steps: WorkflowStep[];
    onChange: (steps: WorkflowStep[]) => void;
    templates?: EmailTemplate[];
    webhooks?: WebhookEndpoint[];
}
export default function StepBuilder({ steps, onChange, templates, webhooks, }: StepBuilderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=StepBuilder.d.ts.map