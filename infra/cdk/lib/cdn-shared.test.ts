import { describe, expect, it } from "vitest";
import {
  CHEERPJ_CDN_ORIGIN,
  RUNTIME_CONNECT_SRC,
  playlangContentSecurityPolicy,
} from "./cdn-shared";

describe("Playlang CSP", () => {
  it("allowlists the CheerpJ Community CDN for scripts and connects", () => {
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
  });
});
