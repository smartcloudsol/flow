import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "../runtime/components/FlowDesignTokens.css";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { getFlowPlugin, getStore } from "@smart-cloud/flow-core";
import { I18n } from "aws-amplify/utils";
import { createRoot, type Root } from "react-dom/client";
import {
  createFormTheme,
  hashStringDjb2,
  sanitizeThemeOverrides,
} from "../form/renderForm";
import { translations } from "../i18n";
import { ContentRootShell } from "../runtime/components/ContentRootShell";
import type { FieldConfig, FormAttributes } from "../shared/types";

function normalizeClassNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .flatMap((entry) =>
          typeof entry === "string" ? entry.split(/\s+/) : [],
        )
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export interface RenderContentRootHandle {
  container: HTMLDivElement;
  unmount: () => void;
}

export interface RenderContentRootArgs {
  target: HTMLElement;
  rootAttributes: FormAttributes;
  fields: FieldConfig[];
}

const reactRoots = new WeakMap<HTMLElement, Root>();

export async function renderContentRoot(
  args: RenderContentRootArgs,
): Promise<RenderContentRootHandle> {
  const { target, rootAttributes, fields } = args;
  const customClassNames = normalizeClassNames(rootAttributes.classNames);
  const shadowRootClassName = [
    "smartcloud-flow-shadow-root",
    "smartcloud-flow-content-root-shadow-root",
    ...customClassNames,
  ].join(" ");

  I18n.putVocabularies(translations);

  const store = await getStore();
  const pluginUrl = getFlowPlugin()!.baseUrl;
  const resolvedColorScheme =
    rootAttributes.colorMode === "auto"
      ? window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "dark"
        : "light"
      : rootAttributes.colorMode || "light";

  target.style.outline = "none";
  target.style.boxShadow = "none";
  target.style.backgroundColor = "transparent";
  target.style.display = "block";
  target.style.position = "relative";
  target.setAttribute("data-mantine-color-scheme", resolvedColorScheme);

  const shadowRoot = target.shadowRoot || target.attachShadow({ mode: "open" });
  const styleHref = `${pluginUrl}blocks/view.css`;
  let rootElement = shadowRoot.querySelector<HTMLDivElement>(
    ".smartcloud-flow-content-root-shadow-root",
  );
  const isInitialRender = !rootElement;

  if (isInitialRender) {
    shadowRoot.innerHTML = "";

    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = styleHref;

    await new Promise<void>((resolve) => {
      styleLink.onload = () => resolve();
      styleLink.onerror = () => resolve();
      shadowRoot.appendChild(styleLink);
    });

    rootElement = document.createElement("div");
    rootElement.className = shadowRootClassName;
    rootElement.setAttribute("data-mantine-color-scheme", resolvedColorScheme);
    rootElement.style.position = "relative";
    rootElement.style.minHeight = "48px";
    rootElement.style.overflow = "visible";
    shadowRoot.appendChild(rootElement);
  }

  rootElement.className = shadowRootClassName;
  rootElement.setAttribute("data-mantine-color-scheme", resolvedColorScheme);

  const existingThemeStyle = shadowRoot.querySelector<HTMLStyleElement>(
    "#smartcloud-flow-content-root-theme-overrides",
  );

  if (rootAttributes.themeOverrides) {
    const sanitizedCss = sanitizeThemeOverrides(rootAttributes.themeOverrides);
    if (sanitizedCss.trim()) {
      const styleHash = hashStringDjb2(sanitizedCss);
      const existingHash = existingThemeStyle?.getAttribute("data-hash");

      if (!existingThemeStyle || existingHash !== styleHash) {
        existingThemeStyle?.remove();

        const styleElement = document.createElement("style");
        styleElement.id = "smartcloud-flow-content-root-theme-overrides";
        styleElement.setAttribute("data-hash", styleHash);
        styleElement.textContent = sanitizedCss;
        shadowRoot.appendChild(styleElement);
      }
    }
  } else if (existingThemeStyle) {
    existingThemeStyle.remove();
  }

  let root = reactRoots.get(target);
  if (!root) {
    root = createRoot(rootElement);
    reactRoots.set(target, root);
  }

  root.render(
    <MantineProvider
      theme={createFormTheme(rootAttributes)}
      forceColorScheme={resolvedColorScheme}
      getRootElement={() => rootElement!}
    >
      <ModalsProvider modalProps={{ withinPortal: false, zIndex: 100002 }}>
        <ContentRootShell
          rootAttributes={rootAttributes}
          fields={fields}
          store={store}
        />
      </ModalsProvider>
    </MantineProvider>,
  );

  return {
    container: target as HTMLDivElement,
    unmount: () => {
      const existingRoot = reactRoots.get(target);
      if (existingRoot) {
        existingRoot.unmount();
        reactRoots.delete(target);
      }

      if (target.shadowRoot) {
        target.shadowRoot.innerHTML = "";
      }
    },
  };
}
