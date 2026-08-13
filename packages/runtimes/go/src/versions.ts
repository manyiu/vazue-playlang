/** Pinned Yaegi WASM npm package (CDN assets under src/). */
export const YAEGI_WASM_PKG_VERSION = "1.0.2";
/** Yaegi interpreter series exposed by the browser build. */
export const GO_LANGUAGE_VERSION = "1.25";

const YAEGI_CDN_BASE =
  `https://cdn.jsdelivr.net/npm/yaegi-wasm@${YAEGI_WASM_PKG_VERSION}/src/`;

export const YAEGI_WASM_URL = `${YAEGI_CDN_BASE}yaegi-browser.wasm`;
export const YAEGI_WASM_EXEC_URL = `${YAEGI_CDN_BASE}wasm_exec.js`;
