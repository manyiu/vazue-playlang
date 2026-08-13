import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasmSharp from "@wasmsharp/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), ...wasmSharp()],
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
      "@playlang/runtime-csharp",
      "@playlang/runtime-browser-script",
      "php-wasm",
      "webr",
      "@wasmsharp/core",
    ],
  },
  assetsInclude: ["**/*.wasm", "**/*.data", "**/*.dat", "**/*.dll"],
  build: {
    chunkSizeWarningLimit: 2500,
    target: "esnext",
  },
});
