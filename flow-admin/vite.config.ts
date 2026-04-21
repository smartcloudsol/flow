import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

console.log("PREMIUM BUILD:", process.env.WPSUITE_PREMIUM === "true");

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      "@monaco-editor/loader": path.resolve(
        __dirname,
        "src/components/monacoLoaderShim.ts",
      ),
    },
  },
  define: {
    global: {},
    "process.env": {},
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
      external: ["@wordpress/upload-media", "jose"],
    },
  },
});
