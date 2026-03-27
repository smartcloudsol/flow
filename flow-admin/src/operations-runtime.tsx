import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";

import {
  createTheme,
  DEFAULT_THEME,
  MantineColorShade,
  MantineProvider,
  type MantineColorsTuple,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { getFlowPlugin, getStore } from "@smart-cloud/flow-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import {
  initAmplifyOperationsI18n,
  syncAmplifyOperationsI18n,
} from "./operations/i18n";
import OperationsRuntimeApp from "./components/OperationsRuntimeApp";

type OperationsTab = "submissions" | "templates" | "workflows";

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
  primaryShade?: { light?: number; dark?: number };
  colors?: Record<string, string>;
  themeOverrides?: string;
}

type ParsedOperationsConfig = Omit<RenderOperationsArgs, "target">;

export interface FlowOperationsRuntimeApi {
  mount: (target: HTMLElement) => Promise<RenderOperationsHandle>;
  mountById: (id: string) => Promise<RenderOperationsHandle | undefined>;
}

const reactRoots = new WeakMap<HTMLElement, Root>();
const shadowCleanups = new WeakMap<HTMLElement, () => void>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: false,
    },
  },
});

function buildColorTuple(color: string): MantineColorsTuple {
  return Array.from(
    { length: 10 },
    () => color,
  ) as unknown as MantineColorsTuple;
}

function sanitizeThemeOverrides(input: string): string {
  return input
    .replace(/<\/?(?:style|script)\b[^>]*>/gi, "")
    .replace(/@import\s+['"]?javascript:[^;]+;?/gi, "")
    .replace(/url\(\s*(['"]?)javascript:[^)]+\)/gi, "")
    .replace(/\bexpression\s*\([^)]*\)/gi, "");
}

function hashStringDjb2(str: string): string {
  let hash = 5381;
  for (let index = 0; index < str.length; index++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

const OPERATIONS_RUNTIME_FIXES_CSS = `
.smartcloud-flow-operations-shadow-root .mantine-Modal-inner {
  left: 0 !important;
  right: 0 !important;
  inset-inline: 0 !important;
}

.smartcloud-flow-operations-shadow-root .mantine-Modal-content {
  margin-inline: auto;
}
`;

function isMirroredStyleNode(
  node: Node,
): node is HTMLStyleElement | HTMLLinkElement {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  if (node instanceof HTMLLinkElement) {
    return (
      node.rel === "stylesheet" &&
      /monaco-editor|vs\/editor\/editor\.main\.css|mantine|tiptap/i.test(
        node.href,
      )
    );
  }

  if (!(node instanceof HTMLStyleElement)) {
    return false;
  }

  const cssText = node.textContent ?? "";

  return (
    cssText.includes(".mantine-") ||
    cssText.includes("--mantine-") ||
    cssText.includes("[data-mantine-color-scheme") ||
    cssText.includes(".tiptap") ||
    cssText.includes(".monaco-editor") ||
    cssText.includes(".monaco-hover") ||
    cssText.includes(".monaco-scrollable-element") ||
    cssText.includes(".mtk")
  );
}

function cloneStyleNode(
  node: HTMLStyleElement | HTMLLinkElement,
): HTMLStyleElement | HTMLLinkElement {
  const clone = node.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;

  if (clone instanceof HTMLStyleElement) {
    clone.textContent = node.textContent;
  }

  return clone;
}

function mirrorHeadStylesIntoShadow(shadow: ShadowRoot): () => void {
  const host = document.createElement("div");
  host.className = "smartcloud-flow-operations-head-styles";
  shadow.appendChild(host);

  const mirrored = new Map<HTMLElement, HTMLElement>();

  const sync = () => {
    const sourceNodes = Array.from(
      document.head.querySelectorAll("style, link[rel='stylesheet']"),
    ).filter((node): node is HTMLStyleElement | HTMLLinkElement =>
      isMirroredStyleNode(node),
    );

    for (const sourceNode of sourceNodes) {
      const existingClone = mirrored.get(sourceNode);

      if (existingClone) {
        if (
          sourceNode instanceof HTMLStyleElement &&
          existingClone instanceof HTMLStyleElement
        ) {
          existingClone.textContent = sourceNode.textContent;
        }

        continue;
      }

      const clone = cloneStyleNode(sourceNode) as HTMLElement;
      mirrored.set(sourceNode, clone);
      host.appendChild(clone);
    }

    for (const [sourceNode, clone] of Array.from(mirrored.entries())) {
      if (
        !sourceNodes.includes(sourceNode as HTMLStyleElement | HTMLLinkElement)
      ) {
        clone.remove();
        mirrored.delete(sourceNode);
      }
    }
  };

  sync();

  const observer = new MutationObserver(() => {
    sync();
  });

  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });

  return () => {
    observer.disconnect();
    mirrored.clear();
    host.remove();
  };
}

function createOperationsTheme(args: RenderOperationsArgs) {
  let customColors: Record<string, MantineColorsTuple> | undefined;

  if (args.colors && Object.keys(args.colors).length > 0) {
    customColors = {};
    Object.keys(args.colors).forEach((colorName) => {
      customColors![colorName] = buildColorTuple(args.colors![colorName]);
    });
  }

  return createTheme({
    respectReducedMotion: true,
    ...(customColors && { colors: customColors }),
    ...(args.primaryColor &&
      [
        ...Object.keys(DEFAULT_THEME.colors),
        ...Object.keys(customColors || {}),
      ].includes(args.primaryColor) && { primaryColor: args.primaryColor }),
    ...(args.primaryShade &&
      Object.keys(args.primaryShade).length > 0 && {
        primaryShade: {
          light: (args.primaryShade.light ??
            (typeof DEFAULT_THEME.primaryShade === "object"
              ? DEFAULT_THEME.primaryShade.light
              : DEFAULT_THEME.primaryShade ?? 6)) as MantineColorShade,
          dark: (args.primaryShade.dark ??
            (typeof DEFAULT_THEME.primaryShade === "object"
              ? DEFAULT_THEME.primaryShade.dark
              : DEFAULT_THEME.primaryShade ?? 6)) as MantineColorShade,
        },
      }),
    defaultRadius: "md",
    components: {
      Button: {
        styles: { root: { borderRadius: "inherit" } },
      },
      Notification: {
        styles: {
          root: {
            backgroundColor: "var(--mantine-color-body)",
            color: "var(--mantine-color-text)",
            boxShadow: "0 18px 40px -24px rgba(15, 23, 42, 0.45)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            backdropFilter: "blur(8px)",
          },
        },
      },
      Modal: {
        defaultProps: {
          withinPortal: false,
        },
      },
      Menu: {
        defaultProps: {
          withinPortal: false,
        },
      },
      Select: {
        defaultProps: {
          comboboxProps: {
            withinPortal: false,
          },
        },
      },
      MultiSelect: {
        defaultProps: {
          comboboxProps: {
            withinPortal: false,
          },
        },
      },
      TagsInput: {
        defaultProps: {
          comboboxProps: {
            withinPortal: false,
          },
        },
      },
    },
  });
}

function parseOperationsElement(element: HTMLElement): ParsedOperationsConfig {
  const encoded = element.dataset.config;
  if (!encoded) {
    return {};
  }

  try {
    return JSON.parse(window.atob(encoded)) as ParsedOperationsConfig;
  } catch {
    return {};
  }
}

async function mountOperationsTarget(
  target: HTMLElement,
): Promise<RenderOperationsHandle> {
  const args = parseOperationsElement(target);
  const {
    initialTab,
    availableTabs,
    title,
    language,
    direction,
    themeOverrides,
  } = args;
  const store = await getStore();
  initAmplifyOperationsI18n();
  syncAmplifyOperationsI18n(store, {
    language,
    direction,
  });

  const resolvedColorScheme =
    args.colorMode === "auto"
      ? window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "dark"
        : "light"
      : args.colorMode || "light";

  target.style.outline = "none";
  target.style.boxShadow = "none";
  target.style.backgroundColor = "transparent";
  target.style.display = "block";
  target.style.width = "100%";
  target.setAttribute("data-mantine-color-scheme", resolvedColorScheme);
  if (language) {
    target.setAttribute("lang", language);
  } else {
    target.removeAttribute("lang");
  }
  if (direction && direction !== "auto") {
    target.setAttribute("dir", direction);
  } else {
    target.removeAttribute("dir");
  }

  const shadow = target.shadowRoot ?? target.attachShadow({ mode: "open" });
  let rootEl = shadow.querySelector<HTMLDivElement>(
    ".smartcloud-flow-operations-shadow-root",
  );

  if (!rootEl) {
    shadow.innerHTML = "";

    const cleanupExistingShadow = shadowCleanups.get(target);
    if (cleanupExistingShadow) {
      cleanupExistingShadow();
      shadowCleanups.delete(target);
    }

    const plugin = getFlowPlugin();
    const pluginUrl = plugin?.baseUrl ?? "";
    const pluginVersion = plugin?.version
      ? `?ver=${encodeURIComponent(String(plugin.version))}`
      : "";

    if (pluginUrl) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${pluginUrl}admin/operations-runtime.css${pluginVersion}`;

      await new Promise<void>((resolve) => {
        link.onload = () => resolve();
        link.onerror = () => resolve();
        shadow.appendChild(link);
      });
    }

    shadowCleanups.set(target, mirrorHeadStylesIntoShadow(shadow));

    rootEl = document.createElement("div");
    rootEl.className = "smartcloud-flow-operations-shadow-root";
    rootEl.setAttribute("data-mantine-color-scheme", resolvedColorScheme);
    rootEl.style.position = "relative";
    rootEl.style.minHeight = "200px";
    rootEl.style.overflow = "visible";
    rootEl.style.display = "block";
    rootEl.style.width = "100%";
    shadow.appendChild(rootEl);
  } else {
    rootEl.setAttribute("data-mantine-color-scheme", resolvedColorScheme);
  }

  if (language) {
    rootEl.setAttribute("lang", language);
  } else {
    rootEl.removeAttribute("lang");
  }
  if (direction && direction !== "auto") {
    rootEl.setAttribute("dir", direction);
  } else {
    rootEl.removeAttribute("dir");
  }

  const existingThemeStyle = shadow.querySelector<HTMLStyleElement>(
    "#smartcloud-flow-operations-theme-overrides",
  );
  let runtimeFixesStyle = shadow.querySelector<HTMLStyleElement>(
    "#smartcloud-flow-operations-runtime-fixes",
  );
  if (!runtimeFixesStyle) {
    runtimeFixesStyle = document.createElement("style");
    runtimeFixesStyle.id = "smartcloud-flow-operations-runtime-fixes";
    runtimeFixesStyle.textContent = OPERATIONS_RUNTIME_FIXES_CSS;
    shadow.appendChild(runtimeFixesStyle);
  }

  if (themeOverrides) {
    const styleHash = hashStringDjb2(themeOverrides);
    const existingHash = existingThemeStyle?.getAttribute("data-hash");

    if (!existingThemeStyle || existingHash !== styleHash) {
      existingThemeStyle?.remove();
      const style = document.createElement("style");
      style.id = "smartcloud-flow-operations-theme-overrides";
      style.setAttribute("data-hash", styleHash);
      style.textContent = sanitizeThemeOverrides(themeOverrides);
      shadow.appendChild(style);
    }
  } else if (existingThemeStyle) {
    existingThemeStyle.remove();
  }

  let root = reactRoots.get(target);
  if (!root) {
    root = createRoot(rootEl);
    reactRoots.set(target, root);
  }

  const theme = createOperationsTheme({ target, ...args });

  root.render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        forceColorScheme={resolvedColorScheme}
        cssVariablesSelector=".smartcloud-flow-operations-shadow-root"
        getRootElement={() => rootEl!}
      >
        <Notifications
          position="top-right"
          zIndex={100510}
          withinPortal={false}
        />
        <ModalsProvider
          modalProps={{
            withinPortal: false,
            zIndex: 100505,
          }}
        >
          <OperationsRuntimeApp
            store={store}
            initialTab={initialTab}
            availableTabs={availableTabs}
            title={title}
            language={language}
            direction={direction}
          />
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );

  const cleanup = () => {
    const existingRoot = reactRoots.get(target);
    if (existingRoot) {
      existingRoot.unmount();
      reactRoots.delete(target);
    }

    const cleanupShadow = shadowCleanups.get(target);
    if (cleanupShadow) {
      cleanupShadow();
      shadowCleanups.delete(target);
    }

    if (target.shadowRoot) {
      target.shadowRoot.innerHTML = "";
    }
  };

  return {
    container: rootEl,
    unmount: cleanup,
  };
}

async function mountOperationsById(
  id: string,
): Promise<RenderOperationsHandle | undefined> {
  const element = document.getElementById(id);
  if (!element) {
    return undefined;
  }

  return mountOperationsTarget(element);
}

const flowOperationsRuntime: FlowOperationsRuntimeApi = {
  mount: mountOperationsTarget,
  mountById: mountOperationsById,
};

declare global {
  var WpSuiteFlowOperationsRuntime: FlowOperationsRuntimeApi | undefined;

  interface Window {
    WpSuiteFlowOperationsRuntime?: FlowOperationsRuntimeApi;
  }
}

globalThis.WpSuiteFlowOperationsRuntime = flowOperationsRuntime;

export default flowOperationsRuntime;
