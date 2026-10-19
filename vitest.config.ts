import { defineConfig } from "vitest/config";

// One Vitest run covers every module's unit tests. Browser tests live in
// site/e2e and run under Playwright (playwright.config.ts), not here.
export default defineConfig({
  test: {
    include: ["{content,site,scenes,video}/{src,test}/**/*.test.ts"],
  },
});
