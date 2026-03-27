import { FlowBackendClient } from "./api/backend-client";
import { getDecisionForAdminBackend } from "./api/backend-utils";

const flowEditorRuntime = {
  FlowBackendClient,
  getDecisionForAdminBackend,
};

declare global {
  var WpSuiteFlowEditorRuntime:
    | {
        FlowBackendClient: typeof FlowBackendClient;
        getDecisionForAdminBackend: typeof getDecisionForAdminBackend;
      }
    | undefined;

  interface Window {
    WpSuiteFlowEditorRuntime?: typeof flowEditorRuntime;
  }
}

globalThis.WpSuiteFlowEditorRuntime = flowEditorRuntime;

export { FlowBackendClient, getDecisionForAdminBackend };
export default flowEditorRuntime;