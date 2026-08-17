import { describe, expect, it } from "vitest";
import {
  CHEERPJ_CDN_ORIGIN,
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  RUNTIME_CONNECT_SRC,
  playlangContentSecurityPolicy,
} from "./cdn-shared";

describe("Playlang CSP", () => {
  it("allowlists the CheerpJ Community CDN for scripts, frames, and connects", () => {
    expect(CHEERPJ_CDN_ORIGIN).toBe("https://cjrtnc.leaningtech.com");
    expect(RUNTIME_CONNECT_SRC).toContain(CHEERPJ_CDN_ORIGIN);

    const csp = playlangContentSecurityPolicy();
    expect(csp).toContain(
      `script-src 'self' blob: 'wasm-unsafe-eval' ${CHEERPJ_CDN_ORIGIN} https://cdn.jsdelivr.net`,
    );
    expect(csp).toContain("https://cdn.jsdelivr.net");
    expect(csp).toContain(`connect-src 'self' ${RUNTIME_CONNECT_SRC.join(" ")}`);
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("frame-src 'self' https://cjrtnc.leaningtech.com");
  });

  it("uses COEP credentialless so Popcorn and CheerpJ can coexist", () => {
    expect(PLAYLANG_COOP).toBe("same-origin");
    expect(PLAYLANG_COEP).toBe("credentialless");
  });
});
