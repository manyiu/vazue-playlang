#!/usr/bin/env bash
# Browser smoke: run every catalog language on production (or PLAYLANG_URL).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/web"

pnpm exec playwright install --with-deps chromium
node "$ROOT/scripts/smoke-playlang-languages.mjs"
