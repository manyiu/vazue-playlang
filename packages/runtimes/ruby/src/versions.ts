/** Pinned ruby.wasm package version (CDN asset + @ruby/wasm-wasi API). */
export const RUBY_WASM_PKG_VERSION = "2.10.1";
/** CRuby series served by the wasm binary. */
export const RUBY_LANGUAGE_VERSION = "3.4";
export const RUBY_WASM_URL =
  `https://cdn.jsdelivr.net/npm/@ruby/${RUBY_LANGUAGE_VERSION}-wasm-wasi@${RUBY_WASM_PKG_VERSION}/dist/ruby+stdlib.wasm`;
