import { type Store } from "@smart-cloud/flow-core";
type OperationsTab = "submissions" | "workflows";
export interface OperationsRuntimeAppProps {
    store: Store;
    initialTab?: OperationsTab;
    availableTabs?: OperationsTab[];
    title?: string;
    language?: string;
    direction?: "ltr" | "rtl" | "auto";
}
export default function OperationsRuntimeApp({ store, initialTab, availableTabs, title, language: languageOverride, direction: directionOverride, }: OperationsRuntimeAppProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=OperationsRuntimeApp.d.ts.map