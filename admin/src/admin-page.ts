export const FLOW_ADMIN_PAGES = ["general", "api-settings", "submissions", "workflows"] as const;
export type FlowAdminPage = typeof FLOW_ADMIN_PAGES[number];

export function resolveFlowAdminPage(search: string): FlowAdminPage {
  const requested = new URLSearchParams(search).get("section");
  if (requested === "templates") return "workflows";
  return FLOW_ADMIN_PAGES.find(page => page === requested) ?? "general";
}

/** Loading is not denial. Explicit backend capability denial blocks operations immediately. */
export function guardFlowAdminPage(
  page: FlowAdminPage,
  ready: boolean,
  proAvailable: boolean,
  capabilities?: { submissions: boolean; workflows: boolean },
): FlowAdminPage {
  if (ready && !proAvailable && page !== "general") return "general";
  if ((page === "submissions" || page === "workflows") && capabilities?.[page] === false) return "general";
  return page;
}
