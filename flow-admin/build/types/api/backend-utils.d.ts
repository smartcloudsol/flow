import { type CapabilityDecision } from "@smart-cloud/flow-core";
export declare function getDecisionForAdminBackend(): Promise<CapabilityDecision>;
export declare function buildQuery(params: Record<string, string | number | boolean | undefined>): string;
export declare function adminRequest<T>(path: string, method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T>;
//# sourceMappingURL=backend-utils.d.ts.map