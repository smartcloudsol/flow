import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";

console.log("PREMIUM BUILD:", process.env.WPSUITE_PREMIUM === "true");

export default defineConfig({
  plugins: [react(), basicSsl()],
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
