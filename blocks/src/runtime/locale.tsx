import { useMemo, useSyncExternalStore, type PropsWithChildren } from "react";
import { createTranslator, getSiteLocaleRuntime, resolveComponentLocale } from "@smart-cloud/wpsuite-core";
import { getStoreSelect, type Store } from "@smart-cloud/flow-core";
import { useSelect } from "@wordpress/data";
import { translations } from "../i18n";

import { FlowLocaleContext } from "./locale-context";
export function FlowLocaleProvider({ language, store, children }: PropsWithChildren<{ language?: string; store: Store }>) {
  const runtime = useMemo(() => getSiteLocaleRuntime(), []);
  const site = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
  const applicationLanguage = useSelect(() => getStoreSelect(store).getLanguage(), [store]);
  const custom = useSelect(() => getStoreSelect(store).getCustomTranslations(), [store]);
  const effective = resolveComponentLocale(language, applicationLanguage, site.locale);
  const value = useMemo(() => ({ language: effective, get: createTranslator(effective, translations, custom) }), [effective, custom]);
  return <FlowLocaleContext.Provider value={value}>{children}</FlowLocaleContext.Provider>;
}
