import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    headers: {
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  },
  preview: {
    headers: {
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: [
      "@playlang/runtime-python",
      "@playlang/runtime-lua",
      "@playlang/runtime-sql",
      "@playlang/runtime-ruby",
      "@playlang/runtime-php",
      "@playlang/runtime-go",
      "@playlang/runtime-r",
      "@playlang/runtime-browser-script",
      "php-wasm",
      "webr",
      "yaegi-wasm",
    ],
  },
  assetsInclude: ["**/*.wasm", "**/*.data", "**/*.dat"],
  build: {
    chunkSizeWarningLimit: 2500,
    target: "esnext",
  },
});
