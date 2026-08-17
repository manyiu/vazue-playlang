/** Pinned runtime CDNs referenced by Playlang adapters (see packages/runtimes versions.ts). */
export const RUNTIME_CONNECT_SRC = [
  "https://cdn.jsdelivr.net",
  "https://webr.r-wasm.org",
  // CheerpJ Java runtime (Community License CDN; do not self-host).
  "https://cjrtnc.leaningtech.com",
  // Pyodide micropip (optional; gated in product copy).
  "https://pypi.org",
  "https://files.pythonhosted.org",
];

/** CheerpJ loader origin — required in script-src (dynamic script tag). */
export const CHEERPJ_CDN_ORIGIN = "https://cjrtnc.leaningtech.com";
export const JSDELIVR_ORIGIN = "https://cdn.jsdelivr.net";
export const WEBR_CDN_ORIGIN = "https://webr.r-wasm.org";

/**
 * Origins that execute scripts or spawn workers (not package-index fetches).
 * Must appear in both script-src (importScripts / dynamic import) and
 * worker-src (`new Worker(cdnUrl)`).
 */
export const RUNTIME_SCRIPT_ORIGINS = [
  CHEERPJ_CDN_ORIGIN,
  JSDELIVR_ORIGIN,
  WEBR_CDN_ORIGIN,
];

/**
 * WasmSharp ships a hardcoded Comlink URL. Do not allowlist unpkg — the Vite
 * plugin rewrites this import to the npm `comlink` package.
 */
export const WASMSHARP_COMLINK_CDN =
  "https://unpkg.com/comlink/dist/esm/comlink.mjs";

/** SharedArrayBuffer for Popcorn; credentialless keeps CheerpJ iframes workable. */
export const PLAYLANG_COEP = "credentialless";
export const PLAYLANG_COOP = "same-origin";

function directive(name: string, values: string[]): string {
  return `${name} ${values.join(" ")}`;
}

/**
 * CSP string applied by CloudFront and Vite preview (testable without constructing a policy).
 * - No 'unsafe-inline' for scripts: js-sandbox must load an external file.
 * - 'unsafe-eval' is required for the JS/TS guest runner (AsyncFunction in the sandbox iframe).
 */
export function playlangContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    directive("script-src", [
      "'self'",
      "blob:",
      "'unsafe-eval'",
      "'wasm-unsafe-eval'",
      ...RUNTIME_SCRIPT_ORIGINS,
    ]),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${RUNTIME_CONNECT_SRC.join(" ")}`,
    directive("worker-src", ["'self'", "blob:", ...RUNTIME_SCRIPT_ORIGINS]),
    "child-src 'self' blob:",
    directive("frame-src", ["'self'", "blob:", CHEERPJ_CDN_ORIGIN]),
    // 'self' (not 'none'): the JS/TS runner embeds same-origin /js-sandbox.html.
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
