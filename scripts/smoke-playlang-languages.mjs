/**
 * Production (or PLAYLANG_URL) smoke: run every language's catalog starter.
 * Uses Playwright Chromium. Intended for deploy verification.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webRequire = createRequire(join(root, "apps/web/package.json"));
const playwrightRequire = createRequire(webRequire.resolve("@playwright/test"));
const { chromium } = playwrightRequire("playwright");

const BASE = (process.env.PLAYLANG_URL ?? "https://playlang.vazue.com").replace(
  /\/$/,
  "",
);

/** @type {Array<[string, number]>} */
const LANGS = [
  ["javascript", 30_000],
  ["typescript", 30_000],
  ["lua", 45_000],
  ["sql", 45_000],
  ["python", 90_000],
  ["ruby", 90_000],
  ["php", 90_000],
  ["go", 120_000],
  ["r", 120_000],
  ["csharp", 120_000],
  ["java", 150_000],
  ["cpp", 200_000],
  ["elixir", 150_000],
];

function passed(id, text) {
  if (id === "sql") return /Hello, Playlang/.test(text) || /greeting/i.test(text);
  return /Hello, Playlang/.test(text);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(200_000);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

  /** @type {Array<Record<string, unknown>>} */
  const results = [];

  for (const [id, timeoutMs] of LANGS) {
    const started = Date.now();
    try {
      await page.getByTestId(`language-${id}`).click();
      const switchBtn = page.getByRole("button", { name: /^Switch$/ });
      if (await switchBtn.isVisible().catch(() => false)) {
        await switchBtn.click();
      }
      await page.getByTestId("run").click();
      await page.waitForFunction(
        () => {
          const t =
            document.querySelector('[data-testid="output"]')?.textContent || "";
          const run = document.querySelector('[data-testid="run"]');
          const busy = run?.disabled || /Running|Loading/i.test(t);
          return !busy && t.trim().length > 0;
        },
        null,
        { timeout: timeoutMs },
      );
      const text = (await page.getByTestId("output").innerText()).trim();
      const ok = passed(id, text);
      results.push({
        id,
        ok,
        ms: Date.now() - started,
        out: text.slice(0, 240),
      });
    } catch (error) {
      const text = await page.getByTestId("output").innerText().catch(() => "");
      results.push({
        id,
        ok: false,
        ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
        out: text.slice(0, 240),
      });
    }
    console.log(JSON.stringify(results.at(-1)));
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        base: BASE,
        passed: results.filter((r) => r.ok).map((r) => r.id),
        failed: failed.map((r) => ({
          id: r.id,
          out: r.out,
          error: r.error,
        })),
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
