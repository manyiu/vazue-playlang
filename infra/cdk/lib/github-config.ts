/** GitHub user or org whose Actions workflows may assume the Playlang deploy role. */
export const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "manyiu";

/**
 * Numeric GitHub user/org id for immutable OIDC `sub` claims.
 * Repos created after 2026-07-15 use `repo:login@id/repo@id:...`.
 */
export const GITHUB_OWNER_ID = process.env.GITHUB_OWNER_ID ?? "11912398";

/**
 * IAM `StringLike` patterns for GitHub Actions OIDC `sub`.
 * Includes the legacy name-only claim and the immutable login@id claim.
 */
export function githubOidcSubs(owner: string, ownerId: string): string[] {
  return [`repo:${owner}/*:*`, `repo:${owner}@${ownerId}/*:*`];
}
