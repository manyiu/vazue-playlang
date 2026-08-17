# Playlang Elixir AVM bundle

Popcorn eval bundle for in-browser `Code.eval_string/3`. Cooked with Docker so
contributors do not need a local Elixir install.

**Toolchain pin:** Elixir **1.17.3** + OTP **26.0.2** (Popcorn requirement).

## Cook

From the repo root (Docker / OrbStack running):

```bash
pnpm cook:elixir
# or: ./scripts/cook-elixir.sh
```

Writes:

- `packages/runtimes/elixir-bundle/artifacts/bundle.avm` (local cook output)
- `apps/web/public/bundle.avm` (committed + served as `/bundle.avm`)

The Vite Popcorn plugin also emits `assets/bundle.avm` on production builds.

## Runtime contract

JS (`@playlang/runtime-elixir` → `@swmansion/popcorn`):

```ts
const popcorn = await Popcorn.init({
  bundlePaths: ["/bundle.avm"],
  onStdout: (line) => { /* capture */ },
  onStderr: (line) => { /* capture */ },
});
const result = await popcorn.call(
  { code: 'IO.puts("Hello, Playlang")' },
  { process: "main", timeoutMs: 30_000 },
);
```

The playground sends site-wide:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

(`credentialless` unlocks SharedArrayBuffer for AtomVM. CheerpJ CDN iframes are
marked `credentialless` by the Java adapter so they still load.)
