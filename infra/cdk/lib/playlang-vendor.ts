import { WASMSHARP_COMLINK_CDN } from "./playlang-security";

/**
 * WasmSharp's published JS imports Comlink from unpkg. Rewrite to the npm
 * package so production CSP does not need unpkg.com.
 */
export function rewriteWasmSharpComlink(code: string): string | null {
  if (!code.includes(WASMSHARP_COMLINK_CDN)) return null;
  return code.replaceAll(`"${WASMSHARP_COMLINK_CDN}"`, '"comlink"').replaceAll(
    `'${WASMSHARP_COMLINK_CDN}'`,
    '"comlink"',
  );
}

const POPCORN_INLINE_BOOT =
  /<script type="module" defer>\s*import \{ \$\{script\.entrypoint\} \} from "\$\{script\.url\}";\s*\$\{script\.entrypoint\}\(\);\s*<\/script>/;

/**
 * Popcorn boots AtomVM from a srcdoc iframe with an inline module script.
 * Production CSP forbids 'unsafe-inline', so swap the inline boot for a blob:
 * module URL (script-src includes blob:).
 */
export function rewritePopcornSrcdoc(code: string): string | null {
  if (!POPCORN_INLINE_BOOT.test(code)) return null;
  return code.replace(
    POPCORN_INLINE_BOOT,
    `<script type="module" src="\${URL.createObjectURL(new Blob(["import { " + script.entrypoint + " } from " + JSON.stringify(script.url) + "; " + script.entrypoint + "();"], { type: "text/javascript" }))}"></script>`,
  );
}

export function rewritePlaylangVendors(code: string, id: string): string | null {
  let next = code;
  let changed = false;
  if (id.includes("@wasmsharp") || next.includes(WASMSHARP_COMLINK_CDN)) {
    const rewritten = rewriteWasmSharpComlink(next);
    if (rewritten) {
      next = rewritten;
      changed = true;
    }
  }
  if (id.includes("@swmansion/popcorn") || next.includes('type="module" defer')) {
    const rewritten = rewritePopcornSrcdoc(next);
    if (rewritten) {
      next = rewritten;
      changed = true;
    }
  }
  return changed ? next : null;
}
