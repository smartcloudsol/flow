const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const path = require("path");

module.exports = function () {
  return {
    ...defaultConfig,
    entry: {
      index: [
        path.resolve(process.cwd(), "src", "index.tsx"),
        path.resolve(process.cwd(), "src", "form", "index.tsx"),
        path.resolve(process.cwd(), "src", "form", "view.tsx"),
        path.resolve(process.cwd(), "src", "text-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "textarea-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "select-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "checkbox-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "date-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "switch-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "number-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "radio-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "password-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "pin-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "color-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "file-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "slider-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "range-slider-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "tags-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "rating-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "save-draft-button", "index.tsx"),
        path.resolve(process.cwd(), "src", "ai-suggestions", "index.tsx"),
        path.resolve(process.cwd(), "src", "submit-button", "index.tsx"),
        path.resolve(process.cwd(), "src", "fieldset", "index.tsx"),
        path.resolve(process.cwd(), "src", "collapse", "index.tsx"),
        path.resolve(process.cwd(), "src", "divider", "index.tsx"),
        path.resolve(process.cwd(), "src", "visually-hidden", "index.tsx"),
        path.resolve(process.cwd(), "src", "stack-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "group-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "grid-field", "index.tsx"),
        path.resolve(process.cwd(), "src", "wizard", "index.tsx"),
        path.resolve(process.cwd(), "src", "wizard-step", "index.tsx"),
        path.resolve(process.cwd(), "src", "success-state", "index.tsx"),
        path.resolve(process.cwd(), "src", "submission-meta", "index.tsx"),
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
      "jose": "WpSuiteJose",
    },
    plugins: defaultConfig.plugins.filter(
      (plugin) => plugin.constructor.name !== "RtlCssPlugin"
    ),
  };
};
