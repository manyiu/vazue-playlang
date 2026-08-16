import { describe, expect, it } from "vitest";
import { GITHUB_OWNER, githubOidcSub } from "./github-config";

describe("githubOidcSub", () => {
  it("allows every repository under the personal account", () => {
    expect(githubOidcSub("manyiu")).toBe("repo:manyiu/*:*");
    expect(GITHUB_OWNER).toBe("manyiu");
  });

  it("does not pin a single repo or environment", () => {
    const sub = githubOidcSub("manyiu");
    expect(sub).toContain("/*:");
    expect(sub).not.toContain("environment:");
  });
});
