// The Paper Notebook design system in the browser (#117): one theme (paper) and the motion
// preference, type rules, tap targets, the Step player chrome and feedback
// panel, motion rules, and the axe gate on every page.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { allPages, LESSON_0, LESSON_1, playablePaths, playThrough } from "./site.ts";
import { typeViolations } from "./type-rules.ts";

const PHONE = { width: 390, height: 844 };

/** A token's computed colour, e.g. token(page, "pink") → "rgb(189, 18, 120)". */
const token = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement("i");
    probe.style.color = `var(--at-${n})`;
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  }, name);

/** Controls smaller than 48 × 48 px. */
const smallTargets = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a[href], button, [role=button], [role=switch], input, select, summary")]
      // A checkbox or radio is tapped through its label, so the label is the target.
      .map((el) => ({ el, box: (el.matches("input") && el.closest("label")) || el }))
      .map(({ el, box }) => ({ el, box: box.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.width < 48 || box.height < 48))
      // TODO(#62 follow-up): a Tap bond between two tappable atoms can't be 48 px: the bond is 60 px and
      // each atom keeps a 48 px circle, so the band is trimmed. Exempt only that case, down to WCAG 2.5.8's
      // 24 px floor. Fix by drawing Tap structures with longer bonds (BOND_PX) or merging bond+atom targets.
      .filter(({ el, box }) => !(el.matches(".tap-layer .target.bond") && Math.min(box.width, box.height) >= 24))
      .map(({ el, box }) => `${el.outerHTML.slice(0, 80)} is ${Math.round(box.width)}×${Math.round(box.height)}`),
  );

/** Every animation or transition with a non-zero duration: [what, property, seconds, iterations, easing]. */
const motion = (page: Page) =>
  page.evaluate(() => {
    const out: [string, string, number, string, string][] = [];
    const secs = (s: string) => s.split(",").map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 0.001 : 1));
    // Easing lists split on top-level commas only: `linear(…)` carries its own.
    const easings = (s: string) => s.split(/,(?![^(]*\))/).map((e) => e.trim());
    for (const el of document.querySelectorAll("*"))
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        const what = `${el.tagName.toLowerCase()}.${el.className}${pseudo ?? ""}`;
        const props = cs.transitionProperty.split(",").map((p) => p.trim());
        const ease = easings(cs.transitionTimingFunction);
        secs(cs.transitionDuration).forEach(
          (d, i) => d > 0 && out.push([what, props[i % props.length], d, "1", ease[i % ease.length]]),
        );
        if (cs.animationName !== "none") {
          const anim = easings(cs.animationTimingFunction);
          secs(cs.animationDuration).forEach((d, i) =>
            out.push([what, `@${cs.animationName}`, d, cs.animationIterationCount, anim[i % anim.length]]),
          );
        }
      }
    return out;
  });

/** The 20 fps frame grid (#119): press, exit, ui and card, each on its stepped `linear()` ease-out. */
const FRAME_GRID = [0.1, 0.15, 0.2, 0.4];
const offGrid = (moves: Awaited<ReturnType<typeof motion>>) =>
  moves.filter(([, , s, , ease]) => !FRAME_GRID.includes(Math.round(s * 1000) / 1000) || !ease.startsWith("linear("));
/** Under reduced motion only opacity fades of 100 ms or less are left. */
const notFades = (moves: Awaited<ReturnType<typeof motion>>) => moves.filter(([, prop, s]) => prop !== "opacity" || s > 0.1);

test.describe("paper and motion preferences", () => {
  test("motion follows the OS by default", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  });

  test("no theme switch; a stored at-theme or a dark OS changes nothing", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("at-theme", "dark"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^(Dark|Light)$/ })).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("body")).toHaveCSS("color", await token(page, "ink"));
  });

  test("the Reduce motion switch overrides the OS and sticks across pages", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.getByRole("switch", { name: "Reduce motion" }).click();
    await expect(page.getByRole("switch", { name: "Reduce motion" })).toHaveAttribute("aria-checked", "true");
    await page.goto(LESSON_1);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  });

  test("the body is ruled paper, with the pink margin line only from 640px up", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    const bg = () => page.locator("body").evaluate((b) => getComputedStyle(b).backgroundImage);
    expect(await bg()).toContain("repeating-linear-gradient");
    expect(await bg()).toContain(await token(page, "margin"));
    await page.setViewportSize(PHONE);
    expect(await bg()).toContain("repeating-linear-gradient");
    expect(await bg()).not.toContain(await token(page, "margin"));
  });
});

test.describe("paper", () => {
  test("every page passes axe, the type rules and 48px tap targets", async ({ page }) => {
    const pages = await allPages(page);
    expect(pages).toContain(LESSON_0);
    for (const path of pages) {
      await page.goto(path);
      const faces = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
      });
      expect(faces, `${path}: self-hosted fonts load`).toEqual(expect.arrayContaining(["Nunito Variable", "Patrick Hand"]));
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(axe.violations.map((v) => `${path}: ${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
      expect(await typeViolations(page), path).toEqual([]);
      expect(await smallTargets(page), path).toEqual([]);
    }
  });

  // One test per Lesson (and pinned Practice Set), so they run in parallel and each has its own time.
  for (const lesson of playablePaths())
    test(`every Step and feedback panel passes axe and the type rules: ${lesson}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto(lesson);
      await playThrough(page, async (step) => {
        const label = `${lesson} ${step}`;
        // Open the Source note (if the Step has one) so its numbers are checked too. The Step is settled
        // (playThrough waits for the answer key), so what is counted here is what gets clicked.
        const note = page.locator("details.source-note:not([open]) summary");
        if (await note.count()) await note.click();
        await page.waitForTimeout(250); // let the panel's entry finish before axe reads colours
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(axe.violations.map((v) => `${label}: ${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
        expect(await typeViolations(page), label).toEqual([]);
        expect(await smallTargets(page), label).toEqual([]);
      });
    });

  test("feedback is icon + words: ✓ solid green, ✗ dashed pink + Hint, → plain pen line + answer", async ({
    page,
  }) => {
    await page.goto(LESSON_0);
    const panel = page.getByRole("status").locator(".fb");
    const choose = (name: string) =>
      page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: true }).click();
    const check = () => page.getByRole("button", { name: "Check" }).click();
    const next = () => page.getByRole("button", { name: "Continue" }).click();
    const looks = async (style: string, colour: string, icon: string, words: string) => {
      await expect(panel).toHaveCSS("border-top-style", style);
      await expect(panel).toHaveCSS("border-top-color", await token(page, colour));
      await expect(panel.locator(".ic")).toHaveText(icon);
      await expect(panel).toContainText(words);
    };

    // Lesson 0 s01 is a Hook prediction: any guess gets the reveal.
    await choose("about 5%");
    await check();
    await looks("solid", "ink-muted", "→", "Answer:");
    // s07 is a Check Problem: a wrong pick gets its Hint, then the right one.
    await page.goto(`${LESSON_0}#s07`);
    await expect(page.getByText("Step 7 of 9")).toBeVisible();
    await choose("Carbon's outer shell is already full.");
    await check();
    await looks("dashed", "pink", "✗", "Not quite. A full shell is 8.");
    await choose("Gaining or losing 4 electrons is too hard, so sharing is the cheaper way to fill its shell.");
    await check();
    await looks("solid", "green", "✓", "4 is the most electrons any atom in the row has to move.");
  });
});

test.describe("Step player on a phone", () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test("single focus: ✕, story bars, Step count and one fixed bottom button; no site chrome", async ({ page }) => {
    await page.goto(LESSON_0);
    await expect(page.getByRole("link", { name: "Leave the Lesson" })).toHaveText("✕");
    await expect(page.locator(".bars li")).toHaveCount(9);
    await expect(page.locator(".bars li.cur")).toHaveCount(1);
    await expect(page.locator(".player-count")).toHaveText("Step 1 of 9");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(page.getByRole("main")).toHaveCount(1);
    // Only the ✕ and "Report a mistake" (spec #56 story 80: on every Step) are links.
    await expect(page.getByRole("link")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Report a mistake" })).toBeVisible();
    await expect(page.locator(".player-foot").locator("button, a")).toHaveCount(1);
  });

  for (const lesson of playablePaths())
    test(`every Step, with its feedback, fits one phone screen with the button in view: ${lesson}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto(lesson);
      await playThrough(page, async (step) => {
        const label = `${lesson} ${step}`;
        const fit = await page.evaluate(() => {
          const body = document.querySelector(".player-body")!;
          return {
            page: document.documentElement.scrollHeight <= innerHeight,
            body: body.scrollHeight <= body.clientHeight,
          };
        });
        expect(fit, label).toEqual({ page: true, body: true });
        // One bottom button on every Step; the Lesson-end screen adds a secondary
        // "Back to Unit" under "Next Lesson" (spec #56 story 35), and the Practice Set
        // summary has Retry missed (when any), Next Unit and Back to Unit (story 69).
        const foot = page.locator(".player-foot").locator("button, a");
        const end = await page.getByRole("link", { name: "Back to Unit" }).isVisible();
        // The Unit's capstone (Lesson 8) ends on "Unit 1 Practice Set" instead of Next Lesson.
        const ends = [page.getByRole("link", { name: "Next Lesson" }), page.getByRole("link", { name: /^Unit \d+ Practice Set$/ }), page.getByRole("link", { name: "Next Unit" }), page.getByRole("button", { name: /^Retry missed/ })];
        let extra = 0;
        for (const e of ends) extra += await e.count();
        await expect(foot).toHaveCount(end ? extra + 1 : 1);
        for (const b of await foot.all()) await expect(b).toBeInViewport({ ratio: 1 });
      });
    });
});

test.describe("motion", () => {
  test("draws on the 20 fps grid: only 100 / 150 / 200 / 400 ms stepped ease-out, nothing loops, no sound", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__sound = false;
      const flag = () => (w.__sound = true);
      w.AudioContext = function () {
        flag();
      };
      HTMLMediaElement.prototype.play = function () {
        flag();
        return Promise.resolve();
      };
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    expect(offGrid(await motion(page)), "/").toEqual([]);
    // Lesson 1: no watch-only (video) Scene, so nothing may play sound or video at all.
    await page.goto(LESSON_1);
    await playThrough(page, async (label) => {
      const moves = await motion(page);
      expect(
        moves.filter(([, , , n]) => n !== "1"),
        `${label}: loops`,
      ).toEqual([]);
      expect(offGrid(moves), label).toEqual([]);
      expect(
        await page.evaluate(
          () => document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity).length,
        ),
      ).toBe(0);
    });
    expect(await page.evaluate(() => (window as unknown as { __sound: boolean }).__sound)).toBe(false);
    await expect(page.locator("audio, video")).toHaveCount(0);
  });

  for (const via of ["OS setting", "site switch"] as const) {
    test(`reduced motion via the ${via} keeps only fades of 100 ms or less`, async ({ page }) => {
      if (via === "OS setting") await page.emulateMedia({ reducedMotion: "reduce" });
      else await page.addInitScript(() => localStorage.setItem("at-motion", "reduced"));
      for (const path of ["/", LESSON_1]) {
        await page.goto(path);
        expect(notFades(await motion(page)), path).toEqual([]);
      }
      await playThrough(page, async (label) => {
        expect(notFades(await motion(page)), label).toEqual([]);
      });
    });
  }
});
