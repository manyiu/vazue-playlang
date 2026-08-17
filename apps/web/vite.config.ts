import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasmSharp from "@wasmsharp/vite-plugin";
import { popcorn } from "@swmansion/popcorn/vite";
import {
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  playlangContentSecurityPolicy,
} from "../../infra/cdk/lib/playlang-security.ts";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(webRoot, "../..");
const elixirBundle = path.join(rootDir, "apps/web/public/bundle.avm");

/**
 * Match CloudFront COEP/COOP in local Vite. Apply the full production CSP on
 * preview only — Vite's dev client is incompatible with script-src without
 * 'unsafe-inline', and e2e uses `vite preview` so CSP regressions still fail CI.
 */
function playlangSecurityHeaders(): Plugin {
  const applyIsolation = (res: {
    setHeader: (name: string, value: string) => void;
  }) => {
    res.setHeader("Cross-Origin-Opener-Policy", PLAYLANG_COOP);
    res.setHeader("Cross-Origin-Embedder-Policy", PLAYLANG_COEP);
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
  };
  const applyCsp = (res: { setHeader: (name: string, value: string) => void }) => {
    res.setHeader("Content-Security-Policy", playlangContentSecurityPolicy());
  };
  return {
    name: "playlang-security-headers",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        applyIsolation(res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        applyIsolation(res);
        applyCsp(res);
        next();
      });
    },
  };
}

const isolationHeaders = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Opener-Policy": PLAYLANG_COOP,
  "Cross-Origin-Embedder-Policy": PLAYLANG_COEP,
};

const previewSecurityHeaders = {
  ...isolationHeaders,
  "Content-Security-Policy": playlangContentSecurityPolicy(),
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...wasmSharp(),
    popcorn({ bundlePaths: [elixirBundle] }),
    playlangSecurityHeaders(),
  ],
  server: {
    port: 5173,
    // Listen on all interfaces so both localhost and 127.0.0.1 work.
    host: true,
    headers: isolationHeaders,
  },
  preview: {
    host: true,
    headers: previewSecurityHeaders,
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
