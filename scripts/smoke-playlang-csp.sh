#!/usr/bin/env bash
# Compare live Playlang headers against the canonical CSP in playlang-security.ts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pnpm --filter @playlang/infra-cdk exec tsx "$ROOT/scripts/smoke-playlang-csp.ts" "$@"
