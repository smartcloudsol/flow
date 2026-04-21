import { BackendCallOptions, CapabilityDecision, ContextKind } from "../types";
export declare function dispatchBackend<TResponse>(_decision: CapabilityDecision, _context: ContextKind, _customPath: string, _method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", _requestBody: unknown, _options: BackendCallOptions): Promise<TResponse>;
