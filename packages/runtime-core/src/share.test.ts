import { describe, expect, it } from "vitest";
import * as lzStringNs from "lz-string";
import {
  decodeShare,
  decodeShareWithStatus,
  encodeShare,
  isShareHash,
  shareStatusMessage,
  SHARE_MAX_BYTES,
  SHARE_WARN_BYTES,
} from "./share.ts";

const lzString =
  (lzStringNs as unknown as { default?: { compressToEncodedURIComponent: (s: string) => string } })
    .default ?? lzStringNs;

describe("share codec", () => {
  it("round-trips a snapshot", () => {
    const payload = {
      v: 1 as const,
      languageId: "javascript",
      files: { "main.js": "console.log(1)" },
      entrypoint: "main.js",
    };
    const { hash, status } = encodeShare(payload);
    expect(status).toBe("ok");
    expect(decodeShare(`#${hash}`)).toEqual(payload);
    expect(decodeShare(hash)).toEqual(payload);
  });

  it("rejects malformed hashes", () => {
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("#nope")).toBeNull();
    expect(decodeShare("#p=%%%")).toBeNull();
  });

  it("rejects decompressed JSON that is not a v1 payload", () => {
    const bogus = lzString.compressToEncodedURIComponent(
      JSON.stringify({ v: 2, languageId: "javascript" }),
    );
    expect(decodeShare(`#p=${bogus}`)).toBeNull();
    const badFiles = lzString.compressToEncodedURIComponent(
      JSON.stringify({ v: 1, languageId: "javascript", files: { "main.js": 1 } }),
    );
    expect(decodeShare(`#p=${badFiles}`)).toBeNull();
  });

  it("round-trips stdin in a snapshot", () => {
    const payload = {
      v: 1 as const,
      languageId: "python",
      files: { "main.py": "print(input())" },
      stdin: "hello",
    };
    const { hash } = encodeShare(payload);
    expect(decodeShare(`#${hash}`)).toEqual(payload);
  });

  it("detects invalid share hashes", () => {
    expect(isShareHash("#p=abc")).toBe(true);
    expect(isShareHash("#nope")).toBe(false);
    expect(decodeShareWithStatus("#p=%%%")).toEqual({
      payload: null,
      error: "invalid_hash",
    });
    expect(decodeShareWithStatus("")).toEqual({ payload: null, error: null });
    expect(decodeShareWithStatus("#")).toEqual({ payload: null, error: null });
  });

  it("flags oversized payloads", () => {
    const files = {
      "main.js": Array.from({ length: 80_000 }, (_, i) => (i * 2654435761).toString(36)).join(""),
    };
    const { status, bytes } = encodeShare({ v: 1, languageId: "javascript", files });
    expect(bytes).toBeGreaterThan(SHARE_MAX_BYTES);
    expect(status).toBe("too_large");
    expect(shareStatusMessage(status)).toMatch(/Too large/);
  });

  it("warns when the link is long but still shareable", () => {
    expect(SHARE_WARN_BYTES).toBeLessThan(SHARE_MAX_BYTES);
    expect(shareStatusMessage("warn")).toMatch(/chat apps/);
    expect(shareStatusMessage("ok")).toMatch(/Anyone with this link/);
  });
});
