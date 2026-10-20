// The v1 definition of done (#88, spec #56), checked on every Lesson of the built site:
// - the static HTML of every Lesson has its Step text and no answers, and every page says noindex;
// - every interactive Step's answer controls and Check button are reachable with Tab;
// - with reduced motion, every Scene a Step opens on rests paused on its poster frame.
// The walk through every Lesson and a Practice Set with axe in both themes is design.spec.ts and
// practice-set.spec.ts; the no-answers scan is course-map.spec.ts; the JS budget is `pnpm budget:js`.
import { expect, test, type Page } from "@playwright/test";
import { buildContent, contentRoot } from "@astratron/content";
import { sceneManifests } from "@astratron/scenes/manifests";
import { watchSceneManifests } from "@astratron/scenes/watch";
import { allPages } from "./site.ts";

const lessons = buildContent(contentRoot).model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)));

/** Visible text of an HTML page: no scripts, styles, tags or entities. */
function pageText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** The longest run of a Step's Markdown that renders as plain text (no marks, cited numbers or breaks). */
function plainRun(markdown: string): string {
  return markdown
    .split(/[*_`\\]+|\{\{[^}]*\}\}|<br>|\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .reduce((a, b) => (b.length > a.length ? b : a), "");
}

test("every page of the site carries noindex until the owner goes public", async ({ page, request }) => {
  const pages = await allPages(page);
  expect(pages.length).toBeGreaterThan(lessons.length);
  for (const path of pages) {
    const html = await (await request.get(path)).text();
    expect(html, path).toMatch(/<meta name="robots" content="noindex"/);
  }
});

test("the static HTML of every Lesson carries every Step's text", async ({ request }) => {
  expect(lessons.map((l) => l.id)).toEqual(["u1-l00", "u1-l01", "u1-l02", "u1-l03", "u1-l04", "u1-l05", "u1-l06", "u1-l07", "u1-l08"]);
  const missing: string[] = [];
  for (const lesson of lessons) {
    const text = pageText(await (await request.get(lesson.url)).text());
    for (const step of lesson.steps) {
      const words = (step as { prompt?: string; text?: string }).prompt ?? (step as { text?: string }).text;
      expect(words, `${lesson.id}#${step.id} has words`).toBeTruthy();
      const run = plainRun(words!);
      // Tags split text at inline marks, so compare with all whitespace removed.
      if (!text.replace(/\s/g, "").includes(run.replace(/\s/g, ""))) missing.push(`${lesson.url}#${step.id}: "${run}"`);
    }
  }
  expect(missing).toEqual([]);
});

/** Answer controls of the Step on screen, one selector per kind (a kind counts when one of its controls is reached). */
const CONTROLS: Record<string, string> = {
  choices: "[role=group][aria-label='Choices'] button",
  answer: "input[aria-label='Answer']",
  order: "[aria-label='Order'] button",
  taps: "[role=group][aria-label='Tappable atoms and bonds'] [role=button], [role=group][aria-label='Tappable atoms and bonds'] button",
  arrows: "[role=group][aria-label='Electron sources: lone pairs and bonds'] [data-source]",
  slider: ".player-body input[type=range]:not([aria-label='Scrub'])",
  stepper: ".scene-control button",
  handles: ".scene-goal [data-handle]",
};

/** What one keypress does to give an answer once Tab lands on a control of this kind. */
const ANSWER_KEY: Record<string, string> = { choices: "Enter", taps: "Enter", stepper: "Enter", slider: "ArrowRight", answer: "1" };

/** Opens a Step by its link in a fresh page load. */
async function openStep(page: Page, url: string, id: string, n: number, of: number) {
  await page.goto("about:blank");
  await page.goto(`${url}#${id}`);
  await expect(page.locator(".player-count")).toHaveText(`Step ${n} of ${of}`);
}

test("every interactive Step of every Lesson can be answered from the keyboard: Tab reaches each kind of control, then Check", async ({ page }) => {
  test.setTimeout(600_000);
  const unreached: string[] = [];
  let steps = 0;
  for (const lesson of lessons) {
    for (const [i, step] of lesson.steps.entries()) {
      if (step.type === "explain") continue;
      steps++;
      await openStep(page, lesson.url, step.id, i + 1, lesson.steps.length);
      // Let the island hydrate (its bottom button is drawn) before walking it.
      await expect(page.locator(".player-foot button").first()).toBeVisible();
      const kinds = await page.evaluate(
        (controls) =>
          Object.entries(controls)
            .filter(([, selector]) => [...document.querySelectorAll(selector)].some((el) => (el as HTMLElement).getClientRects().length > 0))
            .map(([kind]) => kind),
        CONTROLS,
      );
      expect(kinds, `${lesson.id}#${step.id} shows an answer control`).not.toEqual([]);
      // Draw arrows grades each push as it lands, and a goal-state Manipulate Step opens Continue
      // when its goal is met: neither has a Check button. Every other Step does.
      const wantCheck = step.type !== "draw-arrows" && step.type !== "manipulate-goal";
      const want = wantCheck ? [...kinds, "check"] : kinds;
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const reached = new Set<string>();
      let answered = false;
      for (let n = 0; n < 150 && reached.size < want.length; n++) {
        await page.keyboard.press("Tab");
        const kind = await page.evaluate((controls) => {
          const el = document.activeElement;
          if (!el) return null;
          for (const [k, selector] of Object.entries(controls)) if (el.matches(selector)) return k;
          return el.matches(".player-foot button") && /^check$/i.test(el.textContent?.trim() ?? "") ? "check" : null;
        }, CONTROLS);
        if (!kind) continue;
        reached.add(kind);
        // The first control that takes a one-key answer gets one, so Check is live when Tab reaches it.
        if (!answered && ANSWER_KEY[kind]) {
          answered = true;
          await page.keyboard.press(ANSWER_KEY[kind]);
        }
      }
      const missed = want.filter((k) => !reached.has(k));
      if (missed.length) unreached.push(`${lesson.url}#${step.id} (${step.type}): Tab never reaches ${missed.join(", ")}`);
    }
  }
  expect(steps).toBeGreaterThan(80);
  expect(unreached).toEqual([]);
});

const posters = new Map<string, number>([
  ...sceneManifests.map((m) => [m.id, m.poster.t] as [string, number]),
  ...watchSceneManifests.map((m) => [m.id, m.poster] as [string, number]),
]);

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("every Scene a Step opens on rests paused on its poster frame, with Play", async ({ page }) => {
    test.setTimeout(600_000);
    const moving: string[] = [];
    let scenes = 0;
    for (const lesson of lessons) {
      for (const [i, step] of lesson.steps.entries()) {
        const use = (step as { scene?: { id: string; still?: boolean } }).scene;
        if (!use) continue;
        await openStep(page, lesson.url, step.id, i + 1, lesson.steps.length);
        const label = `${lesson.url}#${step.id} (${use.id})`;
        const frame = page.locator(".player-body figure.scene").first();
        await expect(frame, label).toBeVisible();
        scenes++;
        await page.waitForTimeout(600);
        if (await page.locator(".player-body").getByRole("button", { name: "Pause", exact: true }).count()) moving.push(`${label}: playing`);
        const scrub = page.locator(".player-body").getByRole("slider", { name: "Scrub" }).first();
        if (use.still || !(await scrub.count())) continue;
        await expect(page.locator(".player-body").getByRole("button", { name: "Play", exact: true }).first(), label).toBeVisible();
        const at = Number(await scrub.inputValue());
        expect(posters.has(use.id), `${use.id} is a registered Scene`).toBe(true);
        if (Math.abs(at - posters.get(use.id)!) > 0.05) moving.push(`${label}: at ${at} s, poster is ${posters.get(use.id)} s`);
      }
    }
    expect(scenes).toBeGreaterThan(20);
    expect(moving).toEqual([]);
  });
});
