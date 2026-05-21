import { FlowBackendClient } from "./api/backend-client";
import { getDecisionForAdminBackend } from "./api/backend-utils";
declare const flowEditorRuntime: {
    FlowBackendClient: typeof FlowBackendClient;
    getDecisionForAdminBackend: typeof getDecisionForAdminBackend;
};
declare global {
    var WpSuiteFlowEditorRuntime: {
        FlowBackendClient: typeof FlowBackendClient;
        getDecisionForAdminBackend: typeof getDecisionForAdminBackend;
    } | undefined;
    interface Window {
        WpSuiteFlowEditorRuntime?: typeof flowEditorRuntime;
    }
}
export { FlowBackendClient, getDecisionForAdminBackend };
export default flowEditorRuntime;
//# sourceMappingURL=editor-runtime.d.ts.map