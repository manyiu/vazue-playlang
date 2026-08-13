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
      "@playlang/runtime-browser-script",
    ],
  },
  assetsInclude: ["**/*.wasm"],
});
