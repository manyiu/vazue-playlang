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

/** SharedArrayBuffer for Popcorn; credentialless keeps CheerpJ iframes workable. */
export const PLAYLANG_COEP = "credentialless";
export const PLAYLANG_COOP = "same-origin";

/**
 * CSP string applied by CloudFront and Vite preview (testable without constructing a policy).
 * - No 'unsafe-inline' for scripts: js-sandbox must load an external file.
 * - 'unsafe-eval' is required for the JS/TS guest runner (AsyncFunction in the sandbox iframe).
 */
export function playlangContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    // jsDelivr: PHP / Ruby / browsercc (and other) ES modules loaded at runtime.
    `script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval' ${CHEERPJ_CDN_ORIGIN} https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${RUNTIME_CONNECT_SRC.join(" ")}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    `frame-src 'self' ${CHEERPJ_CDN_ORIGIN}`,
    // 'self' (not 'none'): the JS/TS runner embeds same-origin /js-sandbox.html.
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
