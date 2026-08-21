import { expect, test } from "@playwright/test";
import { encodeShare, languageById } from "@playlang/runtime-core";
import {
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  PLAYLANG_CORP,
  playlangContentSecurityPolicy,
} from "../../../infra/cdk/lib/playlang-security.ts";

function catalogShare(languageId: string) {
  const language = languageById(languageId);
  if (!language) {
    throw new Error(`Unknown language: ${languageId}`);
  }
  return encodeShare({
    v: 1,
    languageId: language.id,
    files: { [language.examplePath]: language.example },
  });
}

test("serves production CSP so sandboxes cannot rely on inline scripts", { tag: "@ci" }, async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  const headers = response.headers();
  const csp = headers["content-security-policy"];
  expect(csp).toBe(playlangContentSecurityPolicy());
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
  expect(headers["cross-origin-embedder-policy"]).toBe(PLAYLANG_COEP);
  expect(headers["cross-origin-opener-policy"]).toBe(PLAYLANG_COOP);
  expect(headers["cross-origin-resource-policy"]).toBe(PLAYLANG_CORP);

  const sandboxHtml = await request.get("/js-sandbox.html");
  expect(sandboxHtml.ok()).toBeTruthy();
  expect(sandboxHtml.headers()["cross-origin-resource-policy"]).toBe(PLAYLANG_CORP);
  const html = await sandboxHtml.text();
  expect(html).toContain('src="./js-sandbox.js"');
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);

  const sandboxJs = await request.get("/js-sandbox.js");
  expect(sandboxJs.ok()).toBeTruthy();
  expect(await sandboxJs.text()).toContain('source: "playlang-sandbox"');
});

test("does not fetch WasmSharp Comlink from unpkg", { tag: "@ci" }, async ({ page }) => {
  const unpkg: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("unpkg.com")) unpkg.push(req.url());
  });
  const { hash } = encodeShare({
    v: 1,
    languageId: "csharp",
    files: {
      "Program.cs": 'using System;\nConsole.WriteLine("Hello, Playlang");\n',
    },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText(
    /Loading C#|Hello, Playlang|error|Failed/i,
    { timeout: 8_000 },
  );
  expect(unpkg, unpkg.join("\n")).toEqual([]);
  await expect(page.getByTestId("output")).not.toContainText("unpkg.com");
});

test("Popcorn iframe boot is not blocked as an inline script", { tag: "@ci" }, async ({
  page,
}) => {
  const cspInline: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/Content-Security-Policy/i.test(text) && /inline/i.test(text)) {
      cspInline.push(text);
    }
  });
  const { hash } = encodeShare({
    v: 1,
    languageId: "elixir",
    files: { "main.exs": 'IO.puts("Hello, Playlang")\n' },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText(
    /Loading Elixir|Hello, Playlang|error|Failed/i,
    { timeout: 8_000 },
  );
  expect(cspInline, cspInline.join("\n")).toEqual([]);
  await expect(page.getByTestId("output")).not.toContainText("Popcorn.Wasm.ready");
});

test("webR worker is not blocked by CSP", { tag: "@ci" }, async ({ page }) => {
  const cspWorker: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      /Content-Security-Policy/i.test(text) &&
      /webr|worker-src|script-src/i.test(text)
    ) {
      cspWorker.push(text);
    }
  });
  const { hash } = encodeShare({
    v: 1,
    languageId: "r",
    files: { "main.R": 'print("Hello, Playlang")\n' },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText(
    /Loading R|Hello, Playlang|error|Failed/i,
    { timeout: 8_000 },
  );
  expect(cspWorker, cspWorker.join("\n")).toEqual([]);
  await expect(page.getByTestId("output")).not.toContainText(
    /Refused to (load|connect|create)/i,
  );
});

test("runs the default JavaScript example", { tag: "@ci" }, async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("output")).not.toContainText("Timed out");
});

test("loads a shared snapshot from the URL hash", { tag: "@ci" }, async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "javascript",
    files: { "main.js": 'console.log("from-share")' },
  });
  await page.goto(`/#${hash}`);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("from-share", {
    timeout: 15_000,
  });
});

test("runs TypeScript from a share link", { tag: "@ci" }, async ({ page }) => {
  const { hash } = catalogShare("typescript");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 20_000,
  });
  await expect(page.getByTestId("output")).not.toContainText("Timed out");
});

test("sandbox cannot read parent cookies", { tag: "@ci" }, async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "javascript",
    files: {
      "main.js": `try {
  console.log("COOKIE=" + document.cookie);
} catch (error) {
  console.log("COOKIE_BLOCKED");
}
`,
    },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.evaluate(() => {
    document.cookie = "playlang_secret=should-not-leak";
  });
  await page.getByTestId("run").click();
  const output = page.getByTestId("output");
  await expect(output).toContainText(/COOKIE(=|_BLOCKED)/, { timeout: 15_000 });
  await expect(output).not.toContainText("should-not-leak");
});

test("uses a sandboxed iframe for JavaScript execution", { tag: "@ci" }, async ({ page }) => {
  test.setTimeout(60_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "javascript",
    files: { "main.js": "await new Promise(() => {});\n" },
  });
  await page.goto(`/#${hash}`);
  const sandbox = page.locator('iframe[title="Playlang sandbox"]');
  await page.getByTestId("run").click();
  await expect(sandbox).toHaveAttribute("sandbox", "allow-scripts", { timeout: 15_000 });
});

test("surfaces JavaScript runtime errors", { tag: "@ci" }, async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "javascript",
    files: { "main.js": 'throw new Error("boom");\n' },
  });
  await page.goto(`/#${hash}`);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("boom", { timeout: 15_000 });
});

test("runs async JavaScript", { tag: "@ci" }, async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "javascript",
    files: {
      "main.js": 'await Promise.resolve();\nconsole.log("async-ok");\n',
    },
  });
  await page.goto(`/#${hash}`);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("async-ok", { timeout: 15_000 });
});

test("times out hung JavaScript", { tag: "@ci" }, async ({ page }) => {
  test.setTimeout(60_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "javascript",
    files: { "main.js": "await new Promise(() => {});\n" },
  });
  await page.goto(`/#${hash}`);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText(/Timed out after 30000ms/i, {
    timeout: 40_000,
  });
});

test("surfaces TypeScript compile errors without executing", { tag: "@ci" }, async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "typescript",
    files: { "main.ts": "const x = ;\n" },
  });
  await page.goto(`/#${hash}`);
  await page.getByTestId("run").click();
  const output = page.getByTestId("output");
  await expect(output).toContainText(/Expression expected/i, { timeout: 15_000 });
});

test("runs Lua from a share link", { tag: "@ci" }, async ({ page }) => {
  const { hash } = catalogShare("lua");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("output")).not.toContainText("Timed out");
});

test("runs SQL from a share link", { tag: "@ci" }, async ({ page }) => {
  const { hash } = catalogShare("sql");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("output")).not.toContainText("Timed out");
});

test("runs Python from a share link", async ({ page }) => {
  test.setTimeout(120_000);
  const { hash } = catalogShare("python");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 90_000,
  });
});

test("runs Ruby from a share link", async ({ page }) => {
  test.setTimeout(120_000);
  const { hash } = catalogShare("ruby");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 90_000,
  });
});

test("runs PHP from a share link", async ({ page }) => {
  test.setTimeout(120_000);
  const { hash } = catalogShare("php");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 90_000,
  });
});

test("runs Go from a share link", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = catalogShare("go");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 150_000,
  });
});

test("runs R from a share link", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = catalogShare("r");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 150_000,
  });
});

test("runs C# from a share link", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = catalogShare("csharp");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 150_000,
  });
});

test("runs Java from a share link", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = catalogShare("java");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  const output = page.getByTestId("output");
  await expect(output).toContainText("Hello, Playlang", { timeout: 150_000 });
  await expect(output).toContainText("55");
});

test("surfaces Java compile errors", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "java",
    files: {
      "Main.java":
        "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"broken\"\n  }\n}\n",
    },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  const output = page.getByTestId("output");
  await expect(output).toContainText(/error:/i, { timeout: 150_000 });
  await expect(output).toContainText("')' expected");
});

test("runs Java with a package declaration", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "java",
    files: {
      "Main.java":
        'package demo;\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("pkg-ok");\n  }\n}\n',
    },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("pkg-ok", {
    timeout: 150_000,
  });
});

test("runs C++ from a share link", async ({ page }) => {
  test.setTimeout(240_000);
  const { hash } = catalogShare("cpp");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  const output = page.getByTestId("output");
  await expect(output).toContainText("Hello, Playlang", { timeout: 200_000 });
  await expect(output).toContainText("25");
});

test("runs C from a share link", async ({ page }) => {
  test.setTimeout(240_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "cpp",
    files: {
      "main.c":
        '#include <stdio.h>\nint main(void) {\n  puts("Hello, Playlang");\n  printf("%d\\n", 2 + 2);\n  return 0;\n}\n',
    },
    entrypoint: "main.c",
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  const output = page.getByTestId("output");
  await expect(output).toContainText("Hello, Playlang", { timeout: 200_000 });
  await expect(output).toContainText("4");
});

test("runs Elixir from a share link", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = catalogShare("elixir");
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  const output = page.getByTestId("output");
  await expect(output).toContainText("Hello, Playlang", { timeout: 150_000 });
  await expect(output).toContainText("55");
});

test("Copy link writes a hash URL that round-trips", { tag: "@ci" }, async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { hash } = encodeShare({
    v: 1,
    languageId: "javascript",
    files: { "main.js": 'console.log("copied-share")' },
  });
  await page.goto(`/#${hash}`);
  await page.getByTestId("copy-link").click();
  await expect(page.getByTestId("copy-link")).toHaveText("Copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("#p=");
  await page.goto(copied);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("copied-share", {
    timeout: 15_000,
  });
});

test("shows a banner for invalid share links", { tag: "@ci" }, async ({ page }) => {
  await page.goto("/#p=%%%invalid");
  await expect(page.getByTestId("invalid-share-banner")).toContainText(
    "couldn't be loaded",
  );
});

test("confirms before switching language with unsaved edits", { tag: "@ci" }, async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.locator(".monaco-editor");
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type('console.log("edited");');
  await page.getByTestId("language-python").click();
  await expect(page.getByRole("alertdialog")).toContainText("Switch to Python");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("language-javascript")).toHaveAttribute("aria-current", "true");
  await page.getByTestId("language-python").click();
  await page.getByRole("button", { name: "Switch" }).click();
  await expect(page.getByTestId("language-python")).toHaveAttribute("aria-current", "true");
});

test("shows keyboard hint before first run", { tag: "@ci" }, async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("output")).toContainText(/Press Run or (⌘|Ctrl)\+Enter/);
});

test("marks copied share links as outdated after edits", { tag: "@ci" }, async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByTestId("copy-link").click();
  await expect(page.getByTestId("copy-link")).toHaveText("Copied");
  const editor = page.locator(".monaco-editor");
  await editor.click();
  await page.keyboard.type("\nconsole.log('stale');");
  await expect(page.getByTestId("share-stale-badge")).toBeVisible();
});

test("shows clipboard fallback when copy is blocked", { tag: "@ci" }, async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("denied")),
      },
    });
  });
  await page.getByTestId("copy-link").click();
  await expect(page.getByTestId("clipboard-fallback")).toBeVisible();
  await expect(page.getByTestId("clipboard-fallback-input")).toHaveValue(/#p=/);
});

test("renders on a mobile viewport", { tag: "@ci" }, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByTestId("language-picker")).toBeVisible();
  await expect(page.getByTestId("action-bar-mobile")).toBeVisible();
  await page.getByTestId("action-bar-mobile").getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 15_000,
  });
});

test("dismisses onboarding banner", { tag: "@ci" }, async ({ page }) => {
  await page.goto("/");
  const banner = page.getByTestId("onboarding-banner");
  if (await banner.isVisible()) {
    await banner.getByRole("button", { name: "Dismiss" }).click();
    await expect(banner).not.toBeVisible();
  }
  await page.reload();
  await expect(page.getByTestId("onboarding-banner")).not.toBeVisible();
});
