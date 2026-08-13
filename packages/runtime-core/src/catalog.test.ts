import { describe, expect, it } from "vitest";
import { LANGUAGES, availableLanguages, languageById } from "./catalog.ts";

describe("language catalog", () => {
  it("marks launch languages as available", () => {
    const ids = availableLanguages().map((language) => language.id);
    expect(ids).toContain("javascript");
    expect(ids).toContain("typescript");
    expect(ids).toContain("python");
    expect(ids).toContain("lua");
    expect(ids).toContain("sql");
    expect(ids).toContain("ruby");
    expect(ids).toContain("php");
    expect(ids).not.toContain("rust");
  });

  it("gives rust a reason it cannot run in the browser yet", () => {
    const rust = languageById("rust");
    expect(rust?.status).toBe("unavailable");
    expect(rust?.reason).toMatch(/Cargo/i);
  });

  it("has unique ids", () => {
    const ids = LANGUAGES.map((language) => language.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
