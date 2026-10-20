import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets parallel worktrees run the smoke test side by side.
const port = Number(process.env.E2E_PORT ?? 4329);

// Browser tests run against the built site (`astro build` + `astro preview`).
export default defineConfig({
  testDir: "site/e2e",
  forbidOnly: !!process.env.CI,
  // Room for a busy machine (several walks run in parallel): a short test that passes in seconds alone
  // could pass 30 s under load (structure-steps Tab reach, Lesson 0's keyboard walk, molecule-card).
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
