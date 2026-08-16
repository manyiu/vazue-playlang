/** Pinned browsercc release (Clang/LLD + WASI sysroot on jsDelivr). */
export const BROWSERCC_VERSION = "0.1.1";

/** Catalog / UI label for the toolchain package version. */
export const CLANG_LANGUAGE_VERSION = "0.1.1";

/**
 * Load the compiler JS from CDN so Vite never emits ~95 MB of clang/lld/sysroot
 * into apps/web/dist. import.meta.url inside browsercc resolves to this origin,
 * so sysroot.tar + *.wasm fetch from the same pinned path.
 */
export const BROWSERCC_MODULE_URL = `https://cdn.jsdelivr.net/npm/browsercc@${BROWSERCC_VERSION}/dist/index.js`;

/** WASI host for compiled guests — also CDN-loaded to avoid Vite OPFS/file quirks. */
export const BROWSER_WASI_SHIM_VERSION = "0.4.2";
export const BROWSER_WASI_SHIM_URL = `https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@${BROWSER_WASI_SHIM_VERSION}/dist/index.js`;
