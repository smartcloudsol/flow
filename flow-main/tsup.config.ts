import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  minify: true,
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ["@wordpress/data", "react", "react-dom", "jquery"],
});
