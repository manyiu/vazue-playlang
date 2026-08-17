# Playlang

In-browser programming playground. JavaScript, TypeScript, Python (Pyodide),
Lua, SQLite, Ruby, PHP, Go (Yaegi), R (webR), C# (WasmSharp), Java (CheerpJ),
C/C++ (browsercc), and Elixir (Popcorn/AtomVM) run in your tab. Vazue does not
execute or receive your code.

Rust, Swift, and Haskell are omitted — no product-ready in-browser
compile-and-run path yet.

Live at [playlang.vazue.com](https://playlang.vazue.com)

## Local development

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm cook:elixir   # once if apps/web/public/bundle.avm is missing (needs Docker)
pnpm dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
pnpm test:unit
pnpm test:e2e
pnpm test
```

First Playwright run downloads Chromium (`pnpm --filter @playlang/web exec playwright install chromium`).

CI on GitHub runs typecheck, unit tests, and Playwright tagged `@ci` (JS/TS plus CSP
loader smokes for C# / R / Elixir). Full WASM language e2e is local and must use
production CSP:

```bash
pnpm --filter @playlang/web test:e2e:preview
```

`pnpm test:e2e` against a running `pnpm dev` server does not apply `script-src`
and will not catch CDN / iframe CSP failures.

AWS / CDK is not required to run locally. To deploy to `playlang.vazue.com`, see
[`infra/cdk/README.md`](infra/cdk/README.md). Deploy config belongs in environment
variables, never in git (see `.env.example`).

## Share links

Copy link packs the current language and files into the URL hash (`#p=…`). Anyone
who opens that URL can read (and run) the snapshot. It is not live collaboration.
Large snippets cannot be shared this way; the UI will refuse instead of truncating.

## License

MIT. Third-party runtimes have their own licenses; see [NOTICE](NOTICE).
