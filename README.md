# Playlang

In-browser programming playground. Your source runs on your machine (JS/TS today;
more languages via WASM next). Vazue does not execute or receive your code.

Planned public URL: [playlang.vazue.com](https://playlang.vazue.com)

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


AWS / CDK is not required to run locally. Deploy config belongs in environment
variables, never in git (see `.env.example`).

## Share links

Copy link packs the current language and files into the URL hash (`#p=…`). Anyone
who opens that URL can read (and run) the snapshot. It is not live collaboration.
Large snippets cannot be shared this way; the UI will refuse instead of truncating.

## License

MIT. Third-party runtimes have their own licenses; see [NOTICE](NOTICE).
