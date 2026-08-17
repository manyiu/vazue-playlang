/** GitHub user or org whose Actions workflows may assume the Playlang deploy role. */
export const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "manyiu";

/**
 * Numeric GitHub user/org id for immutable OIDC `sub` claims.
 * Repos created after 2026-07-15 use `repo:login@id/repo@id:...`.
 */
export const GITHUB_OWNER_ID = process.env.GITHUB_OWNER_ID ?? "11912398";

/** GitHub repository allowed to assume the Playlang deploy role. */
export const GITHUB_REPO = process.env.GITHUB_REPO ?? "vazue-playlang";

/** Numeric GitHub repository id for immutable OIDC `sub` claims. */
export const GITHUB_REPO_ID = process.env.GITHUB_REPO_ID ?? "1335729930";

/**
 * IAM `StringLike` patterns for GitHub Actions OIDC `sub`.
 * Includes the legacy name-only claim and the immutable login@id claim.
 * Scoped to one repository so other repos under the same owner cannot assume the role.
 */
export function githubOidcSubs(
  owner: string,
  ownerId: string,
  repo: string,
  repoId: string,
): string[] {
  return [
    `repo:${owner}/${repo}:*`,
    `repo:${owner}@${ownerId}/${repo}@${repoId}:*`,
  ];
}
