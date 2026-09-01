import "@mantine/core/styles.css";
import "../runtime/components/FlowDesignTokens.css";
import "./styles.css";
import { MantineProvider } from "@mantine/core";
import { getFlowPlugin, getStore } from "@smart-cloud/flow-core";
import { dismissReactFallbackWhenMounted } from "@smart-cloud/wpsuite-blocks";
import { I18n } from "aws-amplify/utils";
import { createRoot, type Root } from "react-dom/client";
import {
  createFormTheme,
  ensureShadowStylesheets,
  getFlowRuntimeStylesheetHrefs,
  sanitizeThemeOverrides,
} from "../form/renderForm";
import { translations } from "../i18n";
import {
  RatingSummaryShell,
  type RatingSummaryAttributes,
} from "./RatingSummaryShell";

const roots = new WeakMap<HTMLElement, Root>();

export async function renderRatingSummary(input: {
  target: HTMLElement;
  container: HTMLElement;
  attributes: RatingSummaryAttributes;
}) {
  I18n.putVocabularies(translations);
  const store = await getStore();
  const shadow =
    input.target.shadowRoot ?? input.target.attachShadow({ mode: "open" });
  shadow.innerHTML = "";
  await ensureShadowStylesheets(
    shadow,
    getFlowRuntimeStylesheetHrefs(getFlowPlugin()!.baseUrl),
  );
  if (input.attributes.themeOverrides) {
    const style = document.createElement("style");
    style.textContent = sanitizeThemeOverrides(input.attributes.themeOverrides);
    shadow.appendChild(style);
  }
  const mount = document.createElement("div");
  mount.className =
    "smartcloud-flow-shadow-root smartcloud-flow-rating-summary__root";
  shadow.appendChild(mount);
  const root = createRoot(mount);
  roots.set(input.target, root);
  dismissReactFallbackWhenMounted(input.container, mount);
  const colorMode =
    input.attributes.colorMode === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : input.attributes.colorMode || "light";
  root.render(
    <MantineProvider
      theme={createFormTheme(input.attributes)}
      forceColorScheme={colorMode}
      getRootElement={() => mount}
    >
      <RatingSummaryShell attributes={input.attributes} store={store} />
    </MantineProvider>,
  );
  return {
    container: input.container,
    unmount: () => {
      roots.get(input.target)?.unmount();
      roots.delete(input.target);
      shadow.innerHTML = "";
    },
  };
}
