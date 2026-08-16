import { describe, expect, it } from "vitest";
import { GITHUB_OWNER, GITHUB_OWNER_ID, githubOidcSubs } from "./github-config";

describe("githubOidcSubs", () => {
  it("matches both legacy and immutable GitHub OIDC subjects", () => {
    expect(githubOidcSubs("manyiu", "11912398")).toEqual([
      "repo:manyiu/*:*",
      "repo:manyiu@11912398/*:*",
    ]);
    expect(GITHUB_OWNER).toBe("manyiu");
    expect(GITHUB_OWNER_ID).toBe("11912398");
  });

  it("covers the immutable environment claim used by new repos", () => {
    const [, immutable] = githubOidcSubs("manyiu", "11912398");
    const actual =
      "repo:manyiu@11912398/vazue-playlang@1335729930:environment:production";
    const prefix = immutable.slice(0, immutable.indexOf("*"));
    expect(actual.startsWith(prefix)).toBe(true);
    expect(immutable).toBe("repo:manyiu@11912398/*:*");
  });
});
