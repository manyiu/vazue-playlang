import { defineConfig, devices } from "@playwright/test";

const usePreview = !!process.env.CI || process.env.PLAYLANG_E2E_PREVIEW === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: {
    // CI uses vite preview so production CSP is applied (dev Vite cannot).
    command: usePreview
      ? "pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port 5173 --strictPort"
      : "pnpm exec vite --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: usePreview ? 300_000 : 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
