import { describe, expect, it } from "vitest";
import {
  GITHUB_OWNER,
  GITHUB_OWNER_ID,
  GITHUB_REPO,
  GITHUB_REPO_ID,
  githubOidcSubs,
} from "./github-config";

function matchesOidcSub(pattern: string, actual: string): boolean {
  const prefix = pattern.slice(0, pattern.indexOf("*"));
  return actual.startsWith(prefix);
}

describe("githubOidcSubs", () => {
  it("matches both legacy and immutable GitHub OIDC subjects for this repo", () => {
    expect(githubOidcSubs("manyiu", "11912398", "vazue-playlang", "1335729930")).toEqual([
      "repo:manyiu/vazue-playlang:*",
      "repo:manyiu@11912398/vazue-playlang@1335729930:*",
    ]);
    expect(GITHUB_OWNER).toBe("manyiu");
    expect(GITHUB_OWNER_ID).toBe("11912398");
    expect(GITHUB_REPO).toBe("vazue-playlang");
    expect(GITHUB_REPO_ID).toBe("1335729930");
  });

  it("covers the immutable environment claim used by this repo", () => {
    const [, immutable] = githubOidcSubs(
      "manyiu",
      "11912398",
      "vazue-playlang",
      "1335729930",
    );
    const actual =
      "repo:manyiu@11912398/vazue-playlang@1335729930:environment:production";
    expect(matchesOidcSub(immutable, actual)).toBe(true);
    expect(immutable).toBe("repo:manyiu@11912398/vazue-playlang@1335729930:*");
  });

  it("does not match other repositories under the same owner", () => {
    const [legacy, immutable] = githubOidcSubs(
      "manyiu",
      "11912398",
      "vazue-playlang",
      "1335729930",
    );
    expect(matchesOidcSub(legacy, "repo:manyiu/other-repo:ref:refs/heads/main")).toBe(
      false,
    );
    expect(
      matchesOidcSub(
        immutable,
        "repo:manyiu@11912398/other-repo@999:environment:production",
      ),
    ).toBe(false);
  });
});
