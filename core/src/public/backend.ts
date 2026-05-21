/* eslint-disable @typescript-eslint/no-unused-vars */
import { BackendCallOptions, CapabilityDecision, ContextKind } from "../types";

export async function dispatchBackend<TResponse>(
  _decision: CapabilityDecision,
  _context: ContextKind,
  _customPath: string,
  _method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  _requestBody: unknown,
  _options: BackendCallOptions,
): Promise<TResponse> {
  return Promise.resolve<TResponse>({} as TResponse);
}
