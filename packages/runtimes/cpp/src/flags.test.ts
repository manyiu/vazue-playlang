import { describe, expect, it } from "vitest";
import { compileFlags, isCSource } from "./flags.ts";
import { BROWSERCC_MODULE_URL, BROWSERCC_VERSION } from "./versions.ts";

describe("isCSource", () => {
  it("treats .c as C and .cpp/.cc as C++", () => {
    expect(isCSource("main.c")).toBe(true);
    expect(isCSource("main.cpp")).toBe(false);
    expect(isCSource("main.cc")).toBe(false);
    expect(isCSource("main.cxx")).toBe(false);
  });
});

describe("compileFlags", () => {
  it("omits -std for C (clang++ driver) and uses C++20 without exceptions", () => {
    expect(compileFlags("main.c")).toEqual([]);
    expect(compileFlags("main.cpp")).toEqual(["-std=c++20", "-fno-exceptions"]);
  });
});

describe("browsercc pin", () => {
  it("loads pinned jsDelivr module URLs", () => {
    expect(BROWSERCC_VERSION).toBe("0.1.1");
    expect(BROWSERCC_MODULE_URL).toBe(
      "https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js",
    );
  });
});
