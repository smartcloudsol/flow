const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

console.log("PREMIUM BUILD:", process.env.WPSUITE_PREMIUM === "true");

function getStyleChunkName(chunks, cacheGroupKey) {
  const namedChunk = chunks.find(
    (chunk) => typeof chunk?.name === "string" && chunk.name.length > 0,
  );

  if (namedChunk?.name) {
    return `${path.dirname(namedChunk.name)}/${cacheGroupKey}-${path.basename(
      namedChunk.name,
    )}`;
  }

  const fallbackChunk = chunks[0];
  const suffix =
    fallbackChunk && fallbackChunk.id !== null && fallbackChunk.id !== undefined
      ? String(fallbackChunk.id)
      : "async";

  return `${cacheGroupKey}-${suffix}`;
}

const defaultSplitChunks = defaultConfig.optimization?.splitChunks ?? {};
const defaultStyleGroup = defaultSplitChunks?.cacheGroups?.style ?? {};

const patchedSplitChunks = {
  ...defaultSplitChunks,
  cacheGroups: {
    ...defaultSplitChunks.cacheGroups,
    style: {
      ...defaultStyleGroup,
      name: (_, chunks, cacheGroupKey) =>
        getStyleChunkName(chunks, cacheGroupKey),
    },
    monacoEditor: {
      name: "monaco-editor",
      test: /[\\/]node_modules[\\/](monaco-editor|@monaco-editor)[\\/]/,
      chunks: "all",
      priority: 40,
      enforce: true,
      reuseExistingChunk: true,
    },
  },
};

module.exports = function () {
  return {
    ...defaultConfig,
    entry: {
      index: [path.resolve(process.cwd(), "src", "index.tsx")],
      "editor-runtime": [path.resolve(process.cwd(), "src", "editor-runtime.ts")],
      "operations-runtime": [
        path.resolve(process.cwd(), "src", "operations-runtime.tsx"),
      ],
    },
    externals: {
      ...defaultConfig.externals,
      "@mantine/core": "WpSuiteMantine",
      "@mantine/form": "WpSuiteMantine",
      "@mantine/hooks": "WpSuiteMantine",
      "@mantine/modals": "WpSuiteMantine",
      "@mantine/notifications": "WpSuiteMantine",
      "crypto": "WpSuiteCrypto",
      "jose": "WpSuiteJose",
    },
    resolve: {
      ...defaultConfig.resolve,
      alias: {
        ...(defaultConfig.resolve?.alias ?? {}),
        "@monaco-editor/loader": path.resolve(
          process.cwd(),
          "src",
          "components",
          "monacoLoaderShim.ts",
        ),
      },
    },
    optimization: {
      ...defaultConfig.optimization,
      splitChunks: patchedSplitChunks,
    },
    plugins: [
      ...defaultConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== "RtlCssPlugin",
      ),
      new MonacoWebpackPlugin({
        languages: ["json", "html"],
        features: [],
        filename: "workers/[name].worker.[contenthash:8].js",
      }),
      new webpack.EnvironmentPlugin({
        WPSUITE_PREMIUM: false,
      }),
    ],
    output: {
      ...defaultConfig.output,
      assetModuleFilename: "images/[name].[contenthash:8][ext][query]",
      chunkFilename: "chunks/[name].[contenthash:8].js",
    },
  };
};
