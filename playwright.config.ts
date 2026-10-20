import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

// The servers' ports: E2E_PORT / E2E_DEV_PORT if set, else free ports picked once by the runner.
// Workers load this config again but inherit the runner's env, so they see the same ports.
const freePort = () =>
  execFileSync(process.execPath, [
    "-e",
    "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})",
  ])
    .toString()
    .trim();
process.env.E2E_PORT ||= freePort();
process.env.E2E_DEV_PORT ||= freePort();
const port = Number(process.env.E2E_PORT);
const devPort = Number(process.env.E2E_DEV_PORT);
const tutorClaude = fileURLToPath(new URL("site/src/tutor/test/fake-claude.mjs", import.meta.url));

// Browser tests run against the built site (`astro build` + `astro preview`).
export default defineConfig({
  testDir: "site/e2e",
  // Tests are independent (each gets a fresh page and storage), so shards balance by test, not by file.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Room for a busy machine (several walks run in parallel): a short test that passes in seconds alone
  // could pass 30 s under load (structure-steps Tab reach, Lesson 0's keyboard walk, molecule-card).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [[process.env.CI ? "github" : "list"], ["./site/e2e/round-robin-shards.ts"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", testIgnore: /tutor\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    // The dev-only Tutor (docs/dev/tutor.md) exists only on the dev server, answered by the stand-in `claude`.
    {
      name: "tutor",
      testMatch: /tutor\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${devPort}` },
    },
  ],
  webServer: [
    {
      command: `pnpm run build && pnpm --filter @astratron/site run preview --port ${port} --ignore-lock`,
      url: `http://localhost:${port}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `pnpm --filter @astratron/site run dev --port ${devPort} --ignore-lock`,
      url: `http://localhost:${devPort}`,
      env: { ASTRATRON_TUTOR_CLAUDE: tutorClaude },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
