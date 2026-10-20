import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// The preview server's port: E2E_PORT if set, else a free port picked once by the runner.
// Workers load this config again but inherit the runner's env, so they see the same port.
if (!process.env.E2E_PORT) {
  process.env.E2E_PORT = execFileSync(process.execPath, [
    "-e",
    "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})",
  ])
    .toString()
    .trim();
}
const port = Number(process.env.E2E_PORT);

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm run build && pnpm --filter @astratron/site run preview --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
