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
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  RUNTIME_CONNECT_SRC,
  playlangContentSecurityPolicy,
} from "./cdn-shared";

function originOf(url: string): string {
  return new URL(url).origin;
}

describe("Playlang CSP", () => {
  it("allowlists the CheerpJ Community CDN for scripts, frames, and connects", () => {
    expect(CHEERPJ_CDN_ORIGIN).toBe("https://cjrtnc.leaningtech.com");
    expect(RUNTIME_CONNECT_SRC).toContain(CHEERPJ_CDN_ORIGIN);

    const csp = playlangContentSecurityPolicy();
    expect(csp).toContain(
      `script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval' ${CHEERPJ_CDN_ORIGIN} https://cdn.jsdelivr.net`,
    );
    expect(csp).toContain("https://cdn.jsdelivr.net");
    expect(csp).toContain(`connect-src 'self' ${RUNTIME_CONNECT_SRC.join(" ")}`);
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain(`frame-src 'self' ${CHEERPJ_CDN_ORIGIN}`);
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
    const connectDirective = csp.split("; ").find((part) => part.startsWith("connect-src ")) ?? "";
    const scriptDirective = csp.split("; ").find((part) => part.startsWith("script-src ")) ?? "";

    for (const url of runtimeUrls) {
      const origin = originOf(url);
      const allowed =
        RUNTIME_CONNECT_SRC.includes(origin) ||
        connectDirective.includes(origin) ||
        scriptDirective.includes(origin);
      expect(allowed, `missing CSP allowlist for ${origin} (${url})`).toBe(true);
    }
  });
});
