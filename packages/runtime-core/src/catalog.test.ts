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
    expect(ids).toContain("go");
    expect(ids).toContain("r");
    expect(ids).toContain("csharp");
    expect(ids).toContain("java");
    expect(ids).toContain("cpp");
    expect(ids).toContain("elixir");
  });

  it("describes Java as CheerpJ with guest network", () => {
    const java = languageById("java");
    expect(java).toMatchObject({
      id: "java",
      name: "Java",
      monacoLanguage: "java",
      engine: "CheerpJ",
      version: "17",
      status: "available",
      guestNetwork: true,
      examplePath: "Main.java",
    });
    expect(java?.example).toMatch(/System\.out\.println\("Hello, Playlang"\)/);
  });

  it("describes C/C++ as browsercc and Elixir as Popcorn", () => {
    expect(languageById("cpp")).toMatchObject({
      status: "available",
      engine: "browsercc",
      version: "0.1.1",
      guestNetwork: true,
      examplePath: "main.cpp",
    });
    expect(languageById("elixir")).toMatchObject({
      status: "available",
      engine: "Popcorn",
      version: "0.3.3",
      monacoLanguage: "elixir",
      guestNetwork: true,
      examplePath: "main.exs",
    });
  });

  it("drops languages that cannot ship as real browser runtimes yet", () => {
    expect(languageById("rust")).toBeUndefined();
    expect(languageById("swift")).toBeUndefined();
    expect(languageById("haskell")).toBeUndefined();
  });

  it("has unique ids", () => {
    const ids = LANGUAGES.map((language) => language.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
