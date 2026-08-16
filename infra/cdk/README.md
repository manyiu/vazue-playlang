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
```

## GitHub Actions (later)

OIDC deploy for web-only updates on `main` — not included in this first local deploy path.

## Rollback

Web bucket has **versioning** enabled. Restore a previous object version in S3, then run `pnpm deploy:web` again. Default behavior uses `Cache-Control: no-cache` on HTML so browsers revalidate `index.html`.
