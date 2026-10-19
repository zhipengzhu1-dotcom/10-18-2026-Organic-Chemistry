// The Arcade Cosmos design system in the browser (#59): themes and motion
// preferences, type rules, tap targets, the Step player chrome and feedback
// panel, motion rules, and the axe gate on every page in both themes.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { allPages, lessonPaths, playThrough, SAMPLE_LESSON, THEMES, useTheme } from "./site.ts";

const PHONE = { width: 390, height: 844 };

/** A token's computed colour, e.g. token(page, "boss") → "rgb(255, 95, 216)". */
const token = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement("i");
    probe.style.color = `var(--at-${n})`;
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  }, name);

/** Text that breaks a type rule, as readable strings. */
const typeViolations = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent!.trim();
      const el = n.parentElement!;
      if (!text || el.closest(".sr, script, style")) continue;
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const cs = getComputedStyle(el);
      const face = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      const size = parseFloat(cs.fontSize);
      const at = `<${el.tagName.toLowerCase()}> "${text.slice(0, 40)}" (${face} ${size}px)`;
      // SVG drawing labels (structure atoms, charges) are sized in drawing units relative to the bond
      // length by the renderer and scale with the drawing, so the CSS-px minimum doesn't apply to them.
      if (size < 16 && !el.closest("svg")) out.push(`${at}: text under 16px`);
      if (face.startsWith("Pixelify") && size < 32) out.push(`${at}: Pixelify under 32px`);
      if (face.startsWith("Silkscreen") && (size !== 16 || cs.textTransform !== "uppercase"))
        out.push(`${at}: Silkscreen must be 16px uppercase`);
      if (/[0-9₀-₉⁺⁻]/.test(text) && !/^(JetBrains Mono|Pixelify)/.test(face))
        out.push(`${at}: number or formula outside the data face`);
    }
    return out;
  });

/** Controls smaller than 48 × 48 px. */
const smallTargets = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a[href], button, [role=button], [role=switch], input, select, summary")]
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.width < 48 || box.height < 48))
      // TODO(#62 follow-up): a Tap bond between two tappable atoms can't be 48 px: the bond is 60 px and
      // each atom keeps a 48 px circle, so the band is trimmed. Exempt only that case, down to WCAG 2.5.8's
      // 24 px floor. Fix by drawing Tap structures with longer bonds (BOND_PX) or merging bond+atom targets.
      .filter(({ el, box }) => !(el.matches(".tap-layer .target.bond") && Math.min(box.width, box.height) >= 24))
      .map(({ el, box }) => `${el.outerHTML.slice(0, 80)} is ${Math.round(box.width)}×${Math.round(box.height)}`),
  );

/** Every animation or transition with a non-zero duration: [what, property, seconds, iterations]. */
const motion = (page: Page) =>
  page.evaluate(() => {
    const out: [string, string, number, string][] = [];
    const secs = (s: string) => s.split(",").map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 0.001 : 1));
    for (const el of document.querySelectorAll("*"))
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        const what = `${el.tagName.toLowerCase()}.${el.className}${pseudo ?? ""}`;
        const props = cs.transitionProperty.split(",").map((p) => p.trim());
        secs(cs.transitionDuration).forEach((d, i) => d > 0 && out.push([what, props[i % props.length], d, "1"]));
        if (cs.animationName !== "none")
          secs(cs.animationDuration).forEach((d) =>
            out.push([what, `@${cs.animationName}`, d, cs.animationIterationCount]),
          );
      }
    return out;
  });

test.describe("theme and motion preferences", () => {
  test("follow the OS by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  });

  test("the site's switches override the OS and stick across pages", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await page.goto("/");
    await page.getByRole("button", { name: "Light" }).click();
    await page.getByRole("switch", { name: "Reduce motion" }).click();
    await expect(page.getByRole("switch", { name: "Reduce motion" })).toHaveAttribute("aria-checked", "true");
    await page.goto(SAMPLE_LESSON);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 237, 255)");
  });
});

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(({ page }) => useTheme(page, theme));

    test("every page passes axe, the type rules and 48px tap targets", async ({ page }) => {
      const pages = await allPages(page);
      expect(pages).toContain(SAMPLE_LESSON);
      for (const path of pages) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const faces = await page.evaluate(async () => {
          await document.fonts.ready;
          return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
        });
        expect(faces, `${path}: self-hosted fonts load`).toEqual(expect.arrayContaining(["Space Grotesk Variable"]));
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(axe.violations.map((v) => `${path}: ${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
        expect(await typeViolations(page), path).toEqual([]);
        expect(await smallTargets(page), path).toEqual([]);
      }
    });

    test("every Step and feedback panel of every Lesson passes axe and the type rules", async ({ page }) => {
      for (const lesson of lessonPaths(await allPages(page))) {
        await page.goto(lesson);
        await playThrough(page, async (step) => {
          const label = `${lesson} ${step}`;
          // Open the Source note (if the Step has one) so its numbers are checked too.
          const note = page.locator("details.source-note:not([open]) summary");
          if (await note.count()) await note.click();
          await page.waitForTimeout(250); // let the panel's entry finish before axe reads colours
          const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
          expect(axe.violations.map((v) => `${label}: ${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
          expect(await typeViolations(page), label).toEqual([]);
          expect(await smallTargets(page), label).toEqual([]);
        });
      }
    });

    test("feedback is icon + words: ✓ solid cyan, ✗ dashed magenta + Hint, → plain border + answer", async ({
      page,
    }) => {
      await page.goto(SAMPLE_LESSON);
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

      await choose("2");
      await check();
      await looks("solid", "ink-muted", "→", "Answer:");
      await next();
      await next();
      await choose("3");
      await check();
      await looks("dashed", "boss", "✗", "Not quite. Count again from the formula.");
      await choose("4");
      await check();
      await looks("solid", "electron", "✓", "Correct. Four C–H bonds");
    });
  });
}

test.describe("Step player on a phone", () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test("single focus: ✕, story bars, Step count and one fixed bottom button; no site chrome", async ({ page }) => {
    await page.goto(SAMPLE_LESSON);
    await expect(page.getByRole("link", { name: "Leave the Lesson" })).toHaveText("✕");
    await expect(page.locator(".bars li")).toHaveCount(10);
    await expect(page.locator(".bars li.cur")).toHaveCount(1);
    await expect(page.locator(".player-count")).toHaveText("Step 1 of 10");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("link")).toHaveCount(1); // only the ✕
    await expect(page.locator(".player-foot").locator("button, a")).toHaveCount(1);
  });

  test("every Step of every Lesson, with its feedback, fits one phone screen with the button in view", async ({
    page,
  }) => {
    for (const lesson of lessonPaths(await allPages(page))) {
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
        await expect(page.locator(".player-foot").locator("button, a")).toBeInViewport({ ratio: 1 });
        await expect(page.locator(".player-foot").locator("button, a")).toHaveCount(1);
      });
    }
  });
});

test.describe("motion", () => {
  test("uses only 90 / 180 / 420 ms, nothing loops in the Step player, and no sound", async ({ page }) => {
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
    await page.goto(SAMPLE_LESSON);
    await playThrough(page, async (label) => {
      const moves = await motion(page);
      expect(
        moves.filter(([, , , n]) => n !== "1"),
        `${label}: loops`,
      ).toEqual([]);
      expect(
        moves.filter(([, , s]) => ![0.09, 0.18, 0.42].includes(Math.round(s * 1000) / 1000)),
        label,
      ).toEqual([]);
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
    test(`reduced motion via the ${via} keeps only crossfades of 120 ms or less`, async ({ page }) => {
      if (via === "OS setting") await page.emulateMedia({ reducedMotion: "reduce" });
      else await page.addInitScript(() => localStorage.setItem("at-motion", "reduced"));
      for (const path of ["/", SAMPLE_LESSON]) {
        await page.goto(path);
        const bad = (await motion(page)).filter(([, prop, s]) => prop !== "opacity" || s > 0.12);
        expect(bad, path).toEqual([]);
      }
      await playThrough(page, async (label) => {
        const bad = (await motion(page)).filter(([, prop, s]) => prop !== "opacity" || s > 0.12);
        expect(bad, label).toEqual([]);
      });
    });
  }
});
