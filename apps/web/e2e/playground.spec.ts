import { expect, test } from "@playwright/test";
import { encodeShare } from "@playlang/runtime-core";

test("runs the default JavaScript example", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 15_000,
  });
});

test("loads a shared snapshot from the URL hash", async ({ page }) => {
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

test("runs TypeScript from a share link", async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "typescript",
    files: {
      "main.ts": "const n: number = 40;\nconsole.log(n + 2);\n",
    },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("42", { timeout: 20_000 });
});

test("sandbox cannot read parent cookies", async ({ page }) => {
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

test("runs Lua from a share link", async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "lua",
    files: { "main.lua": 'print("Hello, Playlang")\nprint(2 + 2)\n' },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 30_000,
  });
});

test("runs SQL from a share link", async ({ page }) => {
  const { hash } = encodeShare({
    v: 1,
    languageId: "sql",
    files: { "query.sql": "SELECT 'Hello, Playlang' AS greeting;" },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 30_000,
  });
});

test("runs Python from a share link", async ({ page }) => {
  test.setTimeout(120_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "python",
    files: { "main.py": 'print("Hello, Playlang")\nprint(2 + 2)\n' },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 90_000,
  });
});

test("runs Ruby from a share link", async ({ page }) => {
  test.setTimeout(120_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "ruby",
    files: { "main.rb": 'puts "Hello, Playlang"\nputs 2 + 2\n' },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 90_000,
  });
});

test("runs PHP from a share link", async ({ page }) => {
  test.setTimeout(120_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "php",
    files: { "main.php": '<?php\necho "Hello, Playlang\\n";\necho 2 + 2;\n' },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 90_000,
  });
});

test("runs Go from a share link", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "go",
    files: {
      "main.go":
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, Playlang")\n\tfmt.Println(2 + 2)\n}\n',
    },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 150_000,
  });
});

test("runs R from a share link", async ({ page }) => {
  test.setTimeout(180_000);
  const { hash } = encodeShare({
    v: 1,
    languageId: "r",
    files: { "main.R": 'print("Hello, Playlang")\nprint(2 + 2)\n' },
  });
  await page.goto(`/#${hash}`);
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("output")).toContainText("Hello, Playlang", {
    timeout: 150_000,
  });
});

test("Copy link writes a hash URL that round-trips", async ({ page, context }) => {
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
