import type { AdminView } from "../api/types";

export type OperationsView = Extract<AdminView, "submissions" | "workflows">;

export interface OperationsViewDefinition {
  title: string;
  description: string;
  scrollToId: string;
}

export const OPERATIONS_VIEW_ORDER: OperationsView[] = [
  "submissions",
  "workflows",
];

export const OPERATIONS_VIEW_DEFINITIONS: Record<
  OperationsView,
  OperationsViewDefinition
> = {
  submissions: {
    title: "Form Submissions",
    description:
      "View and manage form submissions from your WordPress site. All submissions are stored in AWS DynamoDB.",
    scrollToId: "submissions",
  },
  workflows: {
    title: "Workflows",
    description:
      "Use Process Maps as the main orchestration surface, then fall back to Advanced CRUD for workflows, webhook endpoints, and templates when needed.",
    scrollToId: "workflows",
  },
};
