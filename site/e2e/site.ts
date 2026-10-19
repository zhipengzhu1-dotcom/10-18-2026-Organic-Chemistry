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

/** The Lesson pages (and each Unit's Practice Set page) among `paths` (/<subject>/<course>/<unit>/<lesson>). */
export const lessonPaths = (paths: string[]) => paths.filter((p) => p.split("/").filter(Boolean).length === 4);

/** Pick a theme the way a Student does: the site's switch, stored in the browser. */
export async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => localStorage.setItem("at-theme", t), theme);
}

/**
 * Plays a Lesson from the current Step to the Wrap (a Practice Set to its summary): picks the first option
 * (or types 1, or keeps the Rank order),
 * Checks until resolved, then Continues. Calls `each` on every screen state
 * worth inspecting (each new Step and each feedback panel).
 */
export async function playThrough(page: Page, each: (label: string) => Promise<void>) {
  const count = page.locator(".player-count");
  for (let guard = 0; guard < 40; guard++) {
    const label = (await count.textContent()) ?? "";
    await each(label);
    if (await page.getByRole("link", { name: "Back to Unit" }).isVisible()) return;
    const checkBtn = page.getByRole("button", { name: "Check" });
    while (await checkBtn.isVisible()) {
      const choices = page.getByRole("group", { name: "Choices" });
      const box = page.getByRole("textbox", { name: "Answer" });
      const taps = page.getByRole("group", { name: "Tappable atoms and bonds" });
      if (await choices.isVisible()) await choices.getByRole("button").first().click();
      else if (await taps.isVisible()) {
        // Tap-to-identify: pick the first target from the keyboard (Enter toggles).
        await taps.getByRole("button").first().focus();
        await page.keyboard.press("Enter");
      }
      else if (await box.isVisible()) await box.fill("1");
      // A Rank / order Step can be checked in its starting order.
      await checkBtn.click();
      await expect(page.getByRole("status")).not.toBeEmpty();
      await each(`${label} feedback`);
    }
    // Draw arrows has no Check button: push the first source onto its first target from the
    // keyboard until the Step is done (two wrong tries on a push show it, so this always ends).
    const arrows = page.getByRole("group", { name: "Electron sources: lone pairs and bonds" });
    let pushed = false;
    for (let i = 0; i < 20 && (await arrows.isVisible()) && !(await page.getByRole("button", { name: "Continue" }).isVisible()); i++) {
      if (await page.getByRole("button", { name: "See results" }).isVisible()) break;
      await arrows.locator("[data-source][tabindex='0']").first().focus();
      await page.keyboard.press("Enter");
      await arrows.locator("[data-spot]").first().focus();
      await page.keyboard.press("Enter");
      if (!pushed && ((await page.getByRole("status").textContent()) ?? "").trim()) {
        pushed = true;
        await each(`${label} feedback`);
      }
    }
    // A Practice Set ends on its summary instead of a Wrap.
    const results = page.getByRole("button", { name: "See results" });
    if (await results.isVisible()) {
      await results.click();
      await expect(page.getByRole("region", { name: "Practice Set results" })).toBeVisible();
      await each("results");
      return;
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(count).not.toHaveText(label);
  }
  throw new Error("Lesson never reached the Wrap");
}
