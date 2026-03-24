import { defineConfig } from "tsup";

const premium = process.env.WPSUITE_PREMIUM === "true";
console.log("PREMIUM BUILD:", premium);

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  minify: true,
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ["@wordpress/data"],
  define: {
    __WPSUITE_PREMIUM__: String(premium),
  },
});
