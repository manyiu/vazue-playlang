# Playlang — AWS CDK

Production hosting on **S3 + CloudFront** in `us-east-1`:

| URL | Stack |
| --- | --- |
| `https://playlang.vazue.com` | `PlaylangWebStack` (playground SPA) |

DNS and TLS live in `PlaylangDnsCertStack` (Route 53 lookup for `vazue.com`, ACM cert).

## Prerequisites

1. AWS account with hosted zone `vazue.com` in Route 53
2. AWS CLI configured locally (`AWS_PROFILE` or SSO)
3. Node 20+ and pnpm (repo root)
4. Built web app: `pnpm build` (or use `pnpm deploy:web` from repo root)

## First-time setup

```bash
# From repo root
pnpm install

export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1
export DOMAIN=playlang.vazue.com
export HOSTED_ZONE_NAME=vazue.com

# Bootstrap CDK in us-east-1 (once per account)
cd infra/cdk
pnpm exec cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/us-east-1

# Cache hosted zone lookup (local only; cdk.context.json is gitignored)
pnpm exec cdk synth PlaylangDnsCertStack
```

## Deploy sequence (local)

```bash
# From repo root — DNS + certificate (first time, or when cert changes)
pnpm deploy:dns

# Build + upload SPA to S3 via CloudFormation
pnpm deploy:web
```

`deploy:web` runs `pnpm build` then `cdk deploy PlaylangWebStack`.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `CDK_DEFAULT_ACCOUNT` | — | AWS account (required for deploy) |
| `CDK_DEFAULT_REGION` | `us-east-1` | CloudFront + ACM region |
| `DOMAIN` | `playlang.vazue.com` | CloudFront alias + cert |
| `HOSTED_ZONE_NAME` | `vazue.com` | Route 53 lookup |
| `GITHUB_OWNER` | `manyiu` | OIDC trust: all repos under this GitHub account |

Copy `.env.example` to `.env.local` for local overrides. Never commit real account IDs.

## Security headers

CloudFront response headers policy sets:

- CSP allowlist for pinned runtime CDNs (jsDelivr, webr.r-wasm.org, CheerpJ `cjrtnc.leaningtech.com`, PyPI for micropip)
- `Referrer-Policy: no-referrer`
- HSTS without `includeSubDomains`
- SPA routing function: extensionless paths → `index.html` (never rewrites `/assets/*.wasm`)

## Stack dependencies

```text
PlaylangDnsCertStack
  └── PlaylangWebStack
        └── PlaylangGithubOidcStack
```

## GitHub Actions

PR and `main` CI (`.github/workflows/ci.yml`) run typecheck, unit tests, and
Playwright on **JS/TS only** (`@ci` tag). WASM language e2e stays local/nightly.

Web publishes (`.github/workflows/deploy-web.yml`) run on push to `main` via
**GitHub OIDC** — no AWS access keys in git or in GitHub Secrets.

| Piece | Value |
| --- | --- |
| IAM role | `PlaylangWebDeploy` (`PlaylangGithubOidcStack`) |
| Trust | `repo:manyiu/*:*` (every repo under the personal GitHub account) |
| Permissions | Web bucket read/write, CloudFront invalidation, `DescribeStacks` on `PlaylangWebStack` |
| GitHub | Environment `production` (restricted to `main`) + secret `AWS_ROLE_ARN` |

Forks outside `manyiu` cannot assume the role. Infra changes (DNS, CloudFront, cert) stay on
`pnpm deploy:dns` / `pnpm deploy:web` from a local AWS SSO session.

### First-time OIDC setup

1. Public repo `manyiu/vazue-playlang` (or set `GITHUB_OWNER` before synth)
2. Account already has an OIDC provider for `token.actions.githubusercontent.com` (Vazue: `GithubActionsOidcStack` in aws-common-cdk)
3. From repo root, with AWS SSO:

```bash
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1
pnpm deploy:oidc
```

4. Copy output `WebDeployRoleArn` into GitHub Environment secret `AWS_ROLE_ARN` on `production`.

CI deploys with `aws s3 sync` + invalidation, not `cdk deploy`, so the role does
not need CloudFormation update rights.

## Rollback

Web bucket has **versioning** enabled. Restore a previous object version in S3, then run `pnpm deploy:web` again. Default behavior uses `Cache-Control: no-cache` on HTML so browsers revalidate `index.html`.
