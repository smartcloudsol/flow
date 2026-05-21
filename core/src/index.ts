import { __ } from "@wordpress/i18n";
import { attachDefaultPluginRuntime } from "@smart-cloud/wpsuite-core";
import { TEXT_DOMAIN } from "./constants";
import {
  getFlowPlugin,
  getStore,
  waitForFlowReady,
  type FlowErrorEvent,
  type FlowPlugin,
  type FlowReadyEvent,
} from "./runtime";
import { createStore } from "./store";
import {
  type Backend,
  type Capabilities,
  type FlowLanguageCode,
} from "./types";

export {
  getFlowPlugin,
  getStore,
  TEXT_DOMAIN,
  waitForFlowReady,
  type FlowErrorEvent,
  type FlowPlugin,
  type FlowReadyEvent,
};

export {
  getStoreDispatch,
  getStoreSelect,
  observeStore,
  reloadConfig,
  sanitizeFlowConfig,
  type CustomTranslations,
  type FlowConfig,
  type State,
  type Store,
} from "./store";

export * from "./types";

export const LANGUAGE_OPTIONS: { label: string; value: FlowLanguageCode }[] = [
  { label: __("Arabic", TEXT_DOMAIN), value: "ar" },
  { label: __("Chinese", TEXT_DOMAIN), value: "zh" },
  { label: __("Dutch", TEXT_DOMAIN), value: "nl" },
  { label: __("English", TEXT_DOMAIN), value: "en" },
  { label: __("French", TEXT_DOMAIN), value: "fr" },
  { label: __("German", TEXT_DOMAIN), value: "de" },
  { label: __("Hebrew", TEXT_DOMAIN), value: "he" },
  { label: __("Hindi", TEXT_DOMAIN), value: "hi" },
  { label: __("Hungarian", TEXT_DOMAIN), value: "hu" },
  { label: __("Indonesian", TEXT_DOMAIN), value: "id" },
  { label: __("Italian", TEXT_DOMAIN), value: "it" },
  { label: __("Japanese", TEXT_DOMAIN), value: "ja" },
  { label: __("Korean", TEXT_DOMAIN), value: "ko" },
  { label: __("Norwegian", TEXT_DOMAIN), value: "no" },
  { label: __("Polish", TEXT_DOMAIN), value: "pl" },
  { label: __("Portuguese", TEXT_DOMAIN), value: "pt" },
  { label: __("Russian", TEXT_DOMAIN), value: "ru" },
  { label: __("Spanish", TEXT_DOMAIN), value: "es" },
  { label: __("Swedish", TEXT_DOMAIN), value: "sv" },
  { label: __("Thai", TEXT_DOMAIN), value: "th" },
  { label: __("Turkish", TEXT_DOMAIN), value: "tr" },
  { label: __("Ukrainian", TEXT_DOMAIN), value: "uk" },
];

// Backend capabilities and dispatcher
const capabilities: Promise<Capabilities> = import(
  __WPSUITE_PREMIUM__ ? "./protected/capabilities" : "./public/capabilities"
);

export const decideCapability = async (
  ...args: Parameters<Capabilities["decideCapability"]>
) => {
  const module = await capabilities;
  return module.decideCapability(...args);
};

export const resolveBackend = async (
  ...args: Parameters<Capabilities["resolveBackend"]>
) => {
  const module = await capabilities;
  return module.resolveBackend(...args);
};

const backend: Promise<Backend<unknown>> = import(
  __WPSUITE_PREMIUM__ ? "./protected/backend" : "./public/backend"
);
export const dispatchBackend = async (
  ...args: Parameters<Backend<unknown>["dispatchBackend"]>
) => {
  const module = await backend;
  return module.dispatchBackend(...args);
};

export const initializeFlow = (): FlowPlugin => {
  const wp = globalThis.WpSuite;
  const flow = getFlowPlugin();
  if (!flow) {
    console.error("Flow plugin is not available");
    throw new Error("Flow plugin is not available");
  }
  attachDefaultPluginRuntime(flow);
  flow.status = flow.status ?? "initializing";
  const store = createStore();
  flow.features = {
    store,
  };

  store
    .then(() => {
      flow.status = "available";
      wp?.events?.emit("wpsuite:flow:ready", {
        key: flow.key,
        version: flow.version,
      });
    })
    .catch((err) => {
      flow.status = "error";
      console.error("Flow plugin failed to initialize:", err);
      wp?.events?.emit("wpsuite:flow:error", {
        key: flow.key,
        error: String(err),
      });
    });

  return flow;
};
