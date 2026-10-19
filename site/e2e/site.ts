// Shared helpers for browser tests: every page of the built site, themes,
// and a walk through a Lesson that answers each Step.
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const SAMPLE_LESSON = "/organic/orgo-1/structure-bonding/sample-carbons-four-bonds";
export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

/** Every same-origin page reachable by links from the home page. */
export async function allPages(page: Page): Promise<string[]> {
  const seen = new Set<string>(["/"]);
  const queue = ["/"];
  while (queue.length) {
    await page.goto(queue.shift()!);
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== new URL(page.url()).origin) continue;
      const path = url.pathname;
      if (!seen.has(path)) {
        seen.add(path);
        queue.push(path);
      }
    }
  }
  return [...seen].sort();
}

/** Pick a theme the way a Student does: the site's switch, stored in the browser. */
export async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => localStorage.setItem("at-theme", t), theme);
}

/**
 * Plays a Lesson from the current Step to the Wrap: picks the first option,
 * Checks until resolved, then Continues. Calls `each` on every screen state
 * worth inspecting (each new Step and each feedback panel).
 */
export async function playThrough(page: Page, each: (label: string) => Promise<void>) {
  const count = page.locator(".player-count");
  for (let guard = 0; guard < 40; guard++) {
    const label = (await count.textContent()) ?? "";
    await each(label);
    if (await page.getByRole("link", { name: "Finish" }).isVisible()) return;
    const checkBtn = page.getByRole("button", { name: "Check" });
    while (await checkBtn.isVisible()) {
      await page.getByRole("group", { name: "Choices" }).getByRole("button").first().click();
      await checkBtn.click();
      await expect(page.getByRole("status")).not.toBeEmpty();
      await each(`${label} feedback`);
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(count).not.toHaveText(label);
  }
  throw new Error("Lesson never reached the Wrap");
}
