const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const path = require("path");

function resolvePackageEntry(packageName) {
  return require.resolve(packageName, {
    paths: [process.cwd()],
  });
}

const sharedPackageAliases = {
  "@mantine/core$": resolvePackageEntry("@mantine/core"),
  "@mantine/form$": resolvePackageEntry("@mantine/form"),
  "@mantine/hooks$": resolvePackageEntry("@mantine/hooks"),
  "@mantine/modals$": resolvePackageEntry("@mantine/modals"),
  "@mantine/notifications$": resolvePackageEntry("@mantine/notifications"),
  "@mantine/tiptap$": resolvePackageEntry("@mantine/tiptap"),
  "@monaco-editor/react$": resolvePackageEntry("@monaco-editor/react"),
  "@tabler/icons-react$": resolvePackageEntry("@tabler/icons-react"),
  "@tanstack/react-query$": resolvePackageEntry("@tanstack/react-query"),
  "@tiptap/extension-color$": resolvePackageEntry("@tiptap/extension-color"),
  "@tiptap/extension-link$": resolvePackageEntry("@tiptap/extension-link"),
  "@tiptap/extension-placeholder$": resolvePackageEntry(
    "@tiptap/extension-placeholder",
  ),
  "@tiptap/extension-text-align$": resolvePackageEntry(
    "@tiptap/extension-text-align",
  ),
  "@tiptap/extension-text-style$": resolvePackageEntry(
    "@tiptap/extension-text-style",
  ),
  "@tiptap/extension-underline$": resolvePackageEntry(
    "@tiptap/extension-underline",
  ),
  "@tiptap/react$": resolvePackageEntry("@tiptap/react"),
  "@tiptap/starter-kit$": resolvePackageEntry("@tiptap/starter-kit"),
  "monaco-editor$": resolvePackageEntry("monaco-editor"),
};

module.exports = function () {
  return {
    ...defaultConfig,
    entry: {
      editor: [path.resolve(process.cwd(), "src", "editor.tsx")],
      view: [
        path.resolve(process.cwd(), "src", "form", "view.tsx"),
        path.resolve(process.cwd(), "src", "content-root", "view.tsx"),
        path.resolve(process.cwd(), "src", "operations", "view.tsx")
      ],
    },
    optimization: {
      ...defaultConfig.optimization,
      splitChunks: {
        name: (module, chunks) => chunks.map((chunk) => chunk.name).join("-"),
      },
    },
    externals: {
      ...defaultConfig.externals,
      "@smart-cloud/flow-admin/editor-runtime": "WpSuiteFlowEditorRuntime",
      "@smart-cloud/flow-admin/operations-runtime":
        "WpSuiteFlowOperationsRuntime",
      "jose": "WpSuiteJose",
    },
    resolve: {
      ...(defaultConfig.resolve || {}),
      alias: {
        ...((defaultConfig.resolve && defaultConfig.resolve.alias) || {}),
        ...sharedPackageAliases,
      },
    },
    plugins: defaultConfig.plugins.filter(
      (plugin) => plugin.constructor.name !== "RtlCssPlugin"
    ),
  };
};
