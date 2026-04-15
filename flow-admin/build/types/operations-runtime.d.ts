import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
type OperationsTab = "submissions" | "workflows";
export interface RenderOperationsHandle {
    container: HTMLDivElement;
    unmount: () => void;
}
export interface RenderOperationsArgs {
    target: HTMLElement;
    initialTab?: OperationsTab;
    availableTabs?: OperationsTab[];
    title?: string;
    language?: string;
    direction?: "ltr" | "rtl" | "auto";
    colorMode?: "light" | "dark" | "auto";
    primaryColor?: string;
    primaryShade?: {
        light?: number;
        dark?: number;
    };
    colors?: Record<string, string>;
    themeOverrides?: string;
}
export interface FlowOperationsRuntimeApi {
    mount: (target: HTMLElement) => Promise<RenderOperationsHandle>;
    mountById: (id: string) => Promise<RenderOperationsHandle | undefined>;
}
declare const flowOperationsRuntime: FlowOperationsRuntimeApi;
declare global {
    var WpSuiteFlowOperationsRuntime: FlowOperationsRuntimeApi | undefined;
    interface Window {
        WpSuiteFlowOperationsRuntime?: FlowOperationsRuntimeApi;
    }
}
export default flowOperationsRuntime;
//# sourceMappingURL=operations-runtime.d.ts.map