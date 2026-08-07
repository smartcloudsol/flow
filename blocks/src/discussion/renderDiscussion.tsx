import "@mantine/core/styles.css";
import "../runtime/components/FlowDesignTokens.css";
import { MantineProvider } from "@mantine/core";
import { createRoot, type Root } from "react-dom/client";
import { dismissReactFallbackWhenMounted } from "@smart-cloud/wpsuite-blocks";
import {
  createFormTheme,
  ensureShadowStylesheets,
  getFlowRuntimeStylesheetHrefs,
  sanitizeThemeOverrides,
} from "../form/renderForm";
import { getFlowPlugin } from "@smart-cloud/flow-core";
import { DiscussionShell } from "./DiscussionShell";
import type { DiscussionAttributes } from "./types";

const roots = new WeakMap<HTMLElement, Root>();

export async function renderDiscussion(input: {
  target: HTMLElement;
  container: HTMLElement;
  hostElement: HTMLElement;
  attributes: DiscussionAttributes;
}) {
  const shadow = input.target.shadowRoot ?? input.target.attachShadow({ mode: "open" });
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
  mount.className = "smartcloud-flow-shadow-root smartcloud-flow-discussion__root";
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
      <DiscussionShell attributes={input.attributes} hostElement={input.hostElement} />
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
