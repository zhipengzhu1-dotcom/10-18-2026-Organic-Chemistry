import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4329);

// Browser tests run against the built site (`astro build` + `astro preview`).
export default defineConfig({
  testDir: "site/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm run build && pnpm --filter @astratron/site run preview --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
