/** GitHub user or org whose Actions workflows may assume the Playlang deploy role. */
export const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "manyiu";

/**
 * GitHub Actions OIDC `sub` pattern.
 * `repo:manyiu/*:*` allows every repository under this account (any ref / environment).
 * Must be used with IAM `StringLike`, not `StringEquals`.
 */
export function githubOidcSub(owner: string): string {
  return `repo:${owner}/*:*`;
}
