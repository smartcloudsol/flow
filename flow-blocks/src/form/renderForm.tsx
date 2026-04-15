import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "../runtime/components/FlowDesignTokens.css";

import { generateColors } from "@mantine/colors-generator";
import {
  createTheme,
  DEFAULT_THEME,
  MantineColorShade,
  MantineProvider,
  type MantineColorsTuple,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { getFlowPlugin, getStore } from "@smart-cloud/flow-core";
import { I18n } from "aws-amplify/utils";
import { createRoot, type Root } from "react-dom/client";
import { translations } from "../i18n";
import type { FormPreviewSelection } from "../runtime/context/FormPreviewContext";
import { FormShell } from "../runtime/components/FormShell";
import type {
  FieldConfig,
  FormAttributes,
  FormStateContents,
} from "../shared/types";

// Sanitize custom CSS to prevent XSS
function sanitizeThemeOverrides(input: string): string {
  return input
    .replace(/<\/?(?:style|script)\b[^>]*>/gi, "")
    .replace(/@import\s+['"]?javascript:[^;]+;?/gi, "")
    .replace(/url\(\s*(['"]?)javascript:[^)]+\)/gi, "")
    .replace(/\bexpression\s*\([^)]*\)/gi, "");
}

// Hash function for style tag deduplication
function hashStringDjb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

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

function createFormTheme(form: FormAttributes) {
  let customColors: Record<string, MantineColorsTuple> | undefined;

  // Generate 10-shade color tuples from base hex colors using Mantine's generateColors
  if (form.colors && Object.keys(form.colors).length > 0) {
    customColors = {};
    Object.keys(form.colors).forEach((c) => {
      customColors![c] = generateColors(form.colors![c]);
    });
  }

  return createTheme({
    respectReducedMotion: true,
    ...(customColors && { colors: customColors }),
    ...(form.primaryColor &&
      [
        ...Object.keys(DEFAULT_THEME.colors),
        ...Object.keys(customColors || {}),
      ].includes(form.primaryColor) && { primaryColor: form.primaryColor }),
    ...(form.primaryShade &&
      Object.keys(form.primaryShade).length > 0 && {
        primaryShade: {
          light: (form.primaryShade.light ??
            (typeof DEFAULT_THEME.primaryShade === "object"
              ? DEFAULT_THEME.primaryShade.light
              : DEFAULT_THEME.primaryShade ?? 6)) as MantineColorShade,
          dark: (form.primaryShade.dark ??
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
      Tooltip: {
        defaultProps: {
          withinPortal: false,
          zIndex: 100002,
        },
      },
      Modal: {
        defaultProps: {
          withinPortal: false,
          zIndex: 100002,
        },
      },
      Popover: {
        defaultProps: {
          withinPortal: false,
          zIndex: 100002,
        },
      },
      Menu: {
        defaultProps: {
          withinPortal: false,
          zIndex: 100002,
        },
      },
      HoverCard: {
        defaultProps: {
          withinPortal: false,
          zIndex: 100002,
        },
      },
      DateInput: {
        defaultProps: {
          popoverProps: {
            withinPortal: false,
            zIndex: 100002,
          },
        },
      },
      Select: {
        defaultProps: {
          comboboxProps: {
            withinPortal: false,
            floatingStrategy: "absolute",
            positionDependencies: [],
            position: "bottom",
            middlewares: {
              flip: true,
              shift: {
                padding: 10,
              },
            },
          },
        },
      },
      MultiSelect: {
        defaultProps: {
          comboboxProps: {
            withinPortal: false,
            floatingStrategy: "absolute",
            positionDependencies: [],
            position: "bottom",
            middlewares: {
              flip: true,
              shift: {
                padding: 10,
              },
            },
          },
        },
      },
      TagsInput: {
        defaultProps: {
          comboboxProps: {
            withinPortal: false,
            floatingStrategy: "absolute",
            positionDependencies: [],
            position: "bottom",
            middlewares: {
              flip: true,
              shift: {
                padding: 10,
              },
            },
          },
        },
      },
    },
  });
}

export interface RenderFormHandle {
  container: HTMLDivElement;
  unmount: () => void;
}

export interface RenderFormArgs {
  target: HTMLElement;
  form: FormAttributes;
  fields: FieldConfig[];
  states?: FormStateContents;
  preview?: FormPreviewSelection;
}

// Store React roots in a WeakMap to reuse them across re-renders
const reactRoots = new WeakMap<HTMLElement, Root>();

export async function renderForm(
  args: RenderFormArgs,
): Promise<RenderFormHandle> {
  const { target, form, fields } = args;
  const states = args.states ?? {};
  const customFormClassNames = normalizeClassNames(form.classNames);
  const shadowRootClassName = [
    "smartcloud-flow-shadow-root",
    ...customFormClassNames,
  ].join(" ");

  // Initialize I18n with translations
  I18n.putVocabularies(translations);

  // Resolve store
  const store = await getStore();

  // Resolve colorMode (auto -> light/dark based on system preference)
  const resolvedColorMode =
    form.colorMode === "auto"
      ? window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "dark"
        : "light"
      : form.colorMode || "light";

  // Apply styles and attributes to the host element (prevents theme interference)
  target.style.outline = "none";
  target.style.boxShadow = "none";
  target.style.backgroundColor = "transparent";
  target.setAttribute("data-mantine-color-scheme", resolvedColorMode);

  // Get or create shadow DOM (reuse if already exists)
  const shadow = target.shadowRoot ?? target.attachShadow({ mode: "open" });

  // Check if we already have a root element (avoid unnecessary re-initialization)
  let rootEl = shadow.querySelector<HTMLDivElement>(
    ".smartcloud-flow-shadow-root",
  );
  const isInitialRender = !rootEl;

  if (isInitialRender) {
    // Initial render: clear and set up DOM structure
    shadow.innerHTML = "";

    // Load styles into shadow DOM
    const pluginUrl = getFlowPlugin()!.baseUrl;
    const cssUrl = `${pluginUrl}blocks/view.css`;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;

    // Wait for CSS to load before rendering React
    await new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve(); // Continue even if CSS fails
      shadow.appendChild(link);
    });

    // Inject custom CSS (themeOverrides) if provided
    if (form.themeOverrides) {
      const styleId = "smartcloud-flow-theme-overrides";
      const styleHash = hashStringDjb2(form.themeOverrides);
      const style = document.createElement("style");
      style.id = styleId;
      style.setAttribute("data-hash", styleHash);
      style.textContent = sanitizeThemeOverrides(form.themeOverrides);
      shadow.appendChild(style);
    }

    // Create mount point inside shadow DOM
    rootEl = document.createElement("div");
    rootEl.className = shadowRootClassName;
    rootEl.setAttribute("data-mantine-color-scheme", resolvedColorMode);
    rootEl.style.position = "relative";
    rootEl.style.minHeight = "100px";
    rootEl.style.overflow = "visible";
    shadow.appendChild(rootEl);
  } else {
    // Re-render: update existing structure
    rootEl!.className = shadowRootClassName;
    rootEl!.setAttribute("data-mantine-color-scheme", resolvedColorMode);

    // Update theme overrides if changed
    const existingStyle = shadow.querySelector<HTMLStyleElement>(
      "#smartcloud-flow-theme-overrides",
    );
    if (form.themeOverrides) {
      const styleHash = hashStringDjb2(form.themeOverrides);
      const existingHash = existingStyle?.getAttribute("data-hash");

      if (!existingStyle || existingHash !== styleHash) {
        existingStyle?.remove();
        const style = document.createElement("style");
        style.id = "smartcloud-flow-theme-overrides";
        style.setAttribute("data-hash", styleHash);
        style.textContent = sanitizeThemeOverrides(form.themeOverrides);
        shadow.appendChild(style);
      }
    } else if (existingStyle) {
      existingStyle.remove();
    }
  }

  const theme = createFormTheme(form);

  // Get or create React root (reuse existing root for updates)
  let root = reactRoots.get(target);
  if (!root) {
    root = createRoot(rootEl!);
    reactRoots.set(target, root);
  }

  // Render or update React tree
  root.render(
    <MantineProvider
      theme={theme}
      forceColorScheme={resolvedColorMode}
      getRootElement={() => rootEl!}
    >
      <ModalsProvider modalProps={{ withinPortal: false, zIndex: 100002 }}>
        <FormShell
          form={form}
          fields={fields}
          states={states}
          preview={args.preview}
          store={store}
          rootElement={rootEl!}
          hostElement={target as HTMLDivElement}
        />
      </ModalsProvider>
    </MantineProvider>,
  );

  const cleanup = () => {
    const root = reactRoots.get(target);
    if (root) {
      try {
        root.unmount();
      } catch {
        // ignore
      }
      reactRoots.delete(target);
    }
    // Clear shadow DOM content
    if (target.shadowRoot) {
      target.shadowRoot.innerHTML = "";
    }
  };

  return {
    container: target as HTMLDivElement,
    unmount: cleanup,
  };
}
