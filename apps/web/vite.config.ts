import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasmSharp from "@wasmsharp/vite-plugin";
import { popcorn } from "@swmansion/popcorn/vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(webRoot, "../..");
const elixirBundle = path.join(rootDir, "apps/web/public/bundle.avm");

/**
 * Popcorn's Vite plugin hardcodes COEP: require-corp. Use credentialless so
 * CheerpJ CDN iframes can load when marked credentialless by the Java adapter.
 */
function popcornCompatibleCoep(): Plugin {
  const apply = (res: { setHeader: (name: string, value: string) => void }) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  };
  return {
    name: "playlang-popcorn-compatible-coep",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        apply(res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        apply(res);
        next();
      });
    },
  };
}

const securityHeaders = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...wasmSharp(),
    popcorn({ bundlePaths: [elixirBundle] }),
    popcornCompatibleCoep(),
  ],
  server: {
    port: 5173,
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
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
      "@playlang/runtime-java",
      "@playlang/runtime-cpp",
      "@playlang/runtime-elixir",
      "@playlang/runtime-browser-script",
      "@swmansion/popcorn",
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
