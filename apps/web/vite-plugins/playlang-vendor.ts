import type { Plugin } from "vite";
import { rewritePlaylangVendors } from "../../../infra/cdk/lib/playlang-vendor.ts";
import { WASMSHARP_COMLINK_CDN } from "../../../infra/cdk/lib/playlang-security.ts";

/** Vendor WasmSharp Comlink and Popcorn's srcdoc boot so production CSP can stay strict. */
export function playlangVendorRewrites(): Plugin {
  return {
    name: "playlang-vendor-rewrites",
    enforce: "pre",
    transform(code, id) {
      const rewritten = rewritePlaylangVendors(code, id);
      if (!rewritten) return null;
      return { code: rewritten, map: null };
    },
  };
}

export const playlangVendorAlias = {
  [WASMSHARP_COMLINK_CDN]: "comlink",
};
