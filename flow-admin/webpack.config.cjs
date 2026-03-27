const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const webpack = require("webpack");
const path = require("path");

console.log("PREMIUM BUILD:", process.env.WPSUITE_PREMIUM === "true");

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
    plugins: [
      ...defaultConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== "RtlCssPlugin",
      ),
      new webpack.EnvironmentPlugin({
        WPSUITE_PREMIUM: false,
      }),
    ],
    output: {
      ...defaultConfig.output,
      assetModuleFilename: "images/[name].[contenthash:8][ext][query]",
    },
  };
};
