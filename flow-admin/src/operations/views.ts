import type { AdminView } from "../api/types";

export type OperationsView = Extract<
  AdminView,
  "submissions" | "templates" | "workflows"
>;

export interface OperationsViewDefinition {
  title: string;
  description: string;
  scrollToId: string;
}

export const OPERATIONS_VIEW_ORDER: OperationsView[] = [
  "submissions",
  "templates",
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
  templates: {
    title: "Email Templates",
    description:
      "Create and manage email templates for automated responses and workflow notifications. Templates support Handlebars syntax for dynamic content.",
    scrollToId: "templates",
  },
  workflows: {
    title: "Automated Workflows",
    description:
      "Create automated workflows that are triggered when forms are submitted. Workflows can send emails, make HTTP requests, and execute conditional logic.",
    scrollToId: "workflows",
  },
};
