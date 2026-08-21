import { describe, expect, it } from "vitest";
import { BROWSERCC_MODULE_URL, BROWSER_WASI_SHIM_URL } from "../../../packages/runtimes/cpp/src/versions.ts";
import { YAEGI_WASM_EXEC_URL, YAEGI_WASM_URL } from "../../../packages/runtimes/go/src/versions.ts";
import { CHEERPJ_LOADER_URL } from "../../../packages/runtimes/java/src/versions.ts";
import { PHP_WASM_CDN_BASE } from "../../../packages/runtimes/php/src/versions.ts";
import { PYODIDE_INDEX_URL } from "../../../packages/runtimes/python/src/protocol.ts";
import { WEBR_BASE_URL } from "../../../packages/runtimes/r/src/versions.ts";
import { RUBY_WASM_URL } from "../../../packages/runtimes/ruby/src/versions.ts";
import {
  CHEERPJ_CDN_ORIGIN,
  JSDELIVR_ORIGIN,
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  PLAYLANG_CORP,
  RUNTIME_CONNECT_SRC,
  RUNTIME_SCRIPT_ORIGINS,
  WASMSHARP_COMLINK_CDN,
  WEBR_CDN_ORIGIN,
  playlangContentSecurityPolicy,
} from "./cdn-shared";
import { rewritePlaylangVendors, rewritePopcornSrcdoc, rewriteWasmSharpComlink } from "./playlang-vendor";

function originOf(url: string): string {
  return new URL(url).origin;
}

function directive(csp: string, name: string): string {
  return csp.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";
}

describe("Playlang CSP", () => {
  it("allowlists the CheerpJ Community CDN for scripts, frames, workers, and connects", () => {
    expect(CHEERPJ_CDN_ORIGIN).toBe("https://cjrtnc.leaningtech.com");
    expect(RUNTIME_CONNECT_SRC).toContain(CHEERPJ_CDN_ORIGIN);
    expect(RUNTIME_SCRIPT_ORIGINS).toContain(CHEERPJ_CDN_ORIGIN);

    const csp = playlangContentSecurityPolicy();
    expect(directive(csp, "script-src")).toContain(CHEERPJ_CDN_ORIGIN);
    expect(directive(csp, "script-src")).toContain(JSDELIVR_ORIGIN);
    expect(directive(csp, "script-src")).toContain(WEBR_CDN_ORIGIN);
    expect(csp).toContain(`connect-src 'self' ${RUNTIME_CONNECT_SRC.join(" ")}`);
    expect(directive(csp, "worker-src")).toContain("'self'");
    expect(directive(csp, "worker-src")).toContain("blob:");
    expect(directive(csp, "worker-src")).toContain(WEBR_CDN_ORIGIN);
    expect(directive(csp, "worker-src")).toContain(CHEERPJ_CDN_ORIGIN);
    expect(directive(csp, "worker-src")).toContain(JSDELIVR_ORIGIN);
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(directive(csp, "frame-src")).toContain(CHEERPJ_CDN_ORIGIN);
    expect(directive(csp, "frame-src")).toContain("blob:");
  });

  it("allows unsafe-eval for the JS/TS guest AsyncFunction sandbox", () => {
    const csp = playlangContentSecurityPolicy();
    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("does not allow inline scripts (js-sandbox must use an external file)", () => {
    const csp = playlangContentSecurityPolicy();
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("allows same-origin framing for the JS sandbox iframe", () => {
    const csp = playlangContentSecurityPolicy();
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain("frame-ancestors 'none'");
  });

  it("uses COEP credentialless so Popcorn and CheerpJ can coexist", () => {
    expect(PLAYLANG_COOP).toBe("same-origin");
    expect(PLAYLANG_COEP).toBe("credentialless");
    expect(PLAYLANG_CORP).toBe("cross-origin");
  });

  it("allowlists every runtime CDN origin referenced in adapter versions", () => {
    const runtimeUrls = [
      CHEERPJ_LOADER_URL,
      YAEGI_WASM_URL,
      YAEGI_WASM_EXEC_URL,
      PHP_WASM_CDN_BASE,
      PYODIDE_INDEX_URL,
      WEBR_BASE_URL,
      RUBY_WASM_URL,
      BROWSERCC_MODULE_URL,
      BROWSER_WASI_SHIM_URL,
    ];
    const csp = playlangContentSecurityPolicy();
    const connectDirective = directive(csp, "connect-src");
    const scriptDirective = directive(csp, "script-src");
    const workerDirective = directive(csp, "worker-src");

    for (const url of runtimeUrls) {
      const origin = originOf(url);
      const allowed =
        RUNTIME_CONNECT_SRC.includes(origin) ||
        connectDirective.includes(origin) ||
        scriptDirective.includes(origin);
      expect(allowed, `missing CSP allowlist for ${origin} (${url})`).toBe(true);
    }

    for (const origin of RUNTIME_SCRIPT_ORIGINS) {
      expect(scriptDirective, `script-src missing ${origin}`).toContain(origin);
      expect(workerDirective, `worker-src missing ${origin}`).toContain(origin);
    }
  });

  it("does not allowlist unpkg; WasmSharp Comlink is vendored", () => {
    const csp = playlangContentSecurityPolicy();
    expect(csp).not.toContain("unpkg.com");
    expect(WASMSHARP_COMLINK_CDN).toBe("https://unpkg.com/comlink/dist/esm/comlink.mjs");
  });
});

describe("Playlang vendor rewrites", () => {
  it("rewrites WasmSharp's unpkg Comlink import to the npm package", () => {
    const source = `import * as Comlink from "${WASMSHARP_COMLINK_CDN}";\n`;
    expect(rewriteWasmSharpComlink(source)).toBe('import * as Comlink from "comlink";\n');
  });

  it("rewrites Popcorn's inline srcdoc boot to a blob module URL", () => {
    const source = `
this.iframe.srcdoc = \`
      <html lang="en" dir="ltr">
          <head>
          \${metaTagsFrom(config)}
          </head>
          <body>
            <script type="module" defer>
              import { \${script.entrypoint} } from "\${script.url}";
              \${script.entrypoint}();
            </script>
          </body>
      </html>\`;
`;
    const rewritten = rewritePopcornSrcdoc(source);
    expect(rewritten).toBeTruthy();
    expect(rewritten).not.toMatch(/type="module" defer/);
    expect(rewritten).toContain("createObjectURL");
    expect(rewritten).toContain("text/javascript");
  });

  it("applies both rewrites from a Vite transform helper", () => {
    const wasm = rewritePlaylangVendors(
      `import x from "${WASMSHARP_COMLINK_CDN}";`,
      "/node_modules/@wasmsharp/core/WasmCompiler.js",
    );
    expect(wasm).toContain('"comlink"');
    expect(wasm).not.toContain("unpkg.com");
  });
});
