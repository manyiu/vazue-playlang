import { describe, expect, it } from "vitest";
import { entrySource } from "./files.ts";

describe("entrySource", () => {
  it("uses the named entrypoint", () => {
    expect(
      entrySource(
        {
          languageId: "python",
          files: { "main.py": "print(1)", "other.py": "print(2)" },
          entrypoint: "main.py",
          timeoutMs: 1000,
        },
        "main.py",
      ),
    ).toBe("print(1)");
  });

  it("falls back to the first file", () => {
    expect(
      entrySource(
        {
          languageId: "python",
          files: { "a.py": "print(1)" },
          timeoutMs: 1000,
        },
        "main.py",
      ),
    ).toBe("print(1)");
  });
});
