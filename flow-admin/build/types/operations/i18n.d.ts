import { type Store } from "@smart-cloud/flow-core";
export declare function t(key: string): string;
export declare function initWordPressOperationsI18n(): void;
export declare function initAmplifyOperationsI18n(): void;
export declare function getOperationsLanguage(): string | undefined;
export declare function syncAmplifyOperationsI18n(store: Store, overrides?: {
    language?: string;
    direction?: "ltr" | "rtl" | "auto";
}): {
    language?: string;
    direction: "ltr" | "rtl";
};
export declare function resolveOperationsDirection(language?: string | null, direction?: "ltr" | "rtl" | "auto" | null): "ltr" | "rtl";
//# sourceMappingURL=i18n.d.ts.map