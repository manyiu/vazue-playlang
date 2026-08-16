# Playlang

In-browser programming playground. JavaScript, TypeScript, Python (Pyodide),
Lua, SQLite, Ruby, PHP, Go (Yaegi), R (webR), C# (WasmSharp), Java (CheerpJ),
and C/C++ (browsercc) run in your tab. Vazue does not execute or receive your
code.

Coming next: Elixir (Popcorn/AtomVM). Rust, Swift, and Haskell are omitted —
no product-ready in-browser compile-and-run path yet.

Live at [playlang.vazue.com](https://playlang.vazue.com)

## Local development

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
pnpm test:unit
pnpm test:e2e
pnpm test
```

First Playwright run downloads Chromium (`pnpm --filter @playlang/web exec playwright install chromium`).

CI on GitHub runs typecheck, unit tests, and Playwright for JS/TS only. WASM
language e2e is local. Production deploys from `main` via OIDC (see
[`infra/cdk/README.md`](infra/cdk/README.md)); forks use their own AWS account.

AWS / CDK is not required to run locally. To deploy to `playlang.vazue.com`, see
[`infra/cdk/README.md`](infra/cdk/README.md). Deploy config belongs in environment
variables, never in git (see `.env.example`).

## Share links

Copy link packs the current language and files into the URL hash (`#p=…`). Anyone
who opens that URL can read (and run) the snapshot. It is not live collaboration.
Large snippets cannot be shared this way; the UI will refuse instead of truncating.

## License

MIT. Third-party runtimes have their own licenses; see [NOTICE](NOTICE).
