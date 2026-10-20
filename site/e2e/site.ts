// Shared helpers for browser tests: every page of the built site, themes,
// and a walk through a Lesson that answers each Step.
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { buildContent, contentRoot } from "@astratron/content";

/** Lesson 0 (the On-ramp, 9 Steps, a watch-only Scene first) and Lesson 1 (no video Scenes). */
export const LESSON_0 = "/organic/orgo-1/structure-bonding/why-carbon";
export const LESSON_1 = "/organic/orgo-1/structure-bonding/bonds-polarity-formal-charge";
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

const units = buildContent(contentRoot).model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units));

/**
 * `lessonPaths`, with each Practice Set page replaced by pinned Sets (`?problems=…`, ten at a time) that
 * between them hold every Problem its Unit can draw, so the gates see the whole Bank, not a random draw (#87).
 */
export function lessonAndBankPaths(paths: string[]): string[] {
  return lessonPaths(paths).flatMap((path) => {
    const unit = units.find((u) => `${u.url}/practice` === path);
    if (!unit) return [path];
    const core = unit.lessons.filter((l) => !l.onRamp).map((l) => l.id);
    const ids = unit.bank.filter((p) => p.status === "approved" && !p.onRamp && core.includes(p.lesson)).map((p) => p.id);
    return Array.from({ length: Math.ceil(ids.length / 10) }, (_, i) => `${path}?problems=${ids.slice(i * 10, (i + 1) * 10).join(",")}`);
  });
}

/** Every Lesson page and pinned Practice Set (see lessonAndBankPaths) of the available Units, from the content model. */
export const playablePaths = () =>
  lessonAndBankPaths(units.filter((u) => u.status === "available").flatMap((u) => [...u.lessons.map((l) => l.url), `${u.url}/practice`]));

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
    // A goal-state Manipulate Step has no Check: work its Scene from the keyboard (pick up the
    // first handle, try each target in turn) until its last goal opens Continue.
    const goal = page.locator(".scene-goal");
    const blocked = page.locator(".player-foot button[aria-disabled='true']", { hasText: "Continue" });
    for (let i = 0; i < 40 && (await goal.isVisible()) && (await blocked.isVisible()); i++) {
      const before = await goal.getAttribute("aria-label");
      const spots = goal.locator("[data-target], [data-handle]");
      for (let t = 0; t < (await spots.count()); t++) {
        await goal.locator("[data-handle]").first().focus();
        await page.keyboard.press("Enter");
        await spots.nth(t).focus();
        await page.keyboard.press("Enter");
        if ((await goal.getAttribute("aria-label")) !== before) break;
      }
      if (!(await blocked.isVisible())) await each(`${label} feedback`);
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
