import { describe, expect, it, vi } from "vitest";
import { MAX_OUTPUT_BYTES, capOutput, withTimeout } from "./timeout.ts";

describe("withTimeout", () => {
  it("resolves when the work finishes in time", async () => {
    const onTimeout = vi.fn();
    await expect(withTimeout(Promise.resolve(7), 200, onTimeout)).resolves.toBe(7);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("rejects and runs onTimeout when the work hangs", async () => {
    const onTimeout = vi.fn();
    const hung = new Promise<number>(() => undefined);
    await expect(withTimeout(hung, 20, onTimeout)).rejects.toThrow(/Timed out after 20ms/);
    expect(onTimeout).toHaveBeenCalledOnce();
  });
});

describe("capOutput", () => {
  it("leaves short output alone", () => {
    expect(capOutput("hello")).toEqual({ text: "hello", truncated: false });
  });

  it("truncates oversized stdout", () => {
    const huge = "a".repeat(MAX_OUTPUT_BYTES + 50);
    const capped = capOutput(huge);
    expect(capped.truncated).toBe(true);
    expect(capped.text.endsWith("…(truncated)")).toBe(true);
    expect(new TextEncoder().encode(capped.text).byteLength).toBeLessThan(
      new TextEncoder().encode(huge).byteLength,
    );
  });
});
