#!/usr/bin/env bash
# Cook Playlang's Elixir eval .avm inside Docker (no local Elixir install).
#
# Popcorn currently requires Elixir 1.17.3 + OTP 26.0.2.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE_DIR="$ROOT/packages/runtimes/elixir-bundle"
IMAGE="${PLAYLANG_ELIXIR_IMAGE:-hexpm/elixir:1.17.3-erlang-26.0.2-ubuntu-noble-20260730.1}"
# Popcorn defaults to /bundle.avm (with /assets/bundle.avm fallback after Vite build).
PUBLIC_BUNDLE="$ROOT/apps/web/public/bundle.avm"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required (OrbStack / Docker Desktop)." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Cannot talk to the Docker daemon. Start OrbStack/Docker and retry." >&2
  exit 1
fi

mkdir -p "$BUNDLE_DIR/artifacts" "$(dirname "$PUBLIC_BUNDLE")"

echo "Cooking Playlang Elixir bundle with $IMAGE …"

docker run --rm \
  -v "$BUNDLE_DIR:/app" \
  -w /app \
  -e MIX_ENV=prod \
  -e HEX_HTTP_CONCURRENCY=1 \
  "$IMAGE" \
  bash -lc '
    set -euo pipefail
    mix local.hex --force --if-missing
    mix local.rebar --force --if-missing
    mix deps.get
    mix compile
    mix popcorn.cook
    ls -lh artifacts
  '

if [[ ! -f "$BUNDLE_DIR/artifacts/bundle.avm" ]]; then
  echo "Expected artifacts/bundle.avm was not produced." >&2
  find "$BUNDLE_DIR/artifacts" -type f >&2 || true
  exit 1
fi

cp -f "$BUNDLE_DIR/artifacts/bundle.avm" "$PUBLIC_BUNDLE"
ls -lh "$PUBLIC_BUNDLE"
echo "Cooked Elixir bundle ready."
