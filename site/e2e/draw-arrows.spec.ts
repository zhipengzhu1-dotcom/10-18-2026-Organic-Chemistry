// Draw arrows (#72) in a browser: pointer drag, touch taps and the keyboard
// path, live grading with the structure redrawn, in-between flags, the shown
// push, undo, and the Scene playing in place on success.
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/sample-push-the-electrons";

const sources = (page: Page) => page.getByRole("group", { name: "Electron sources: lone pairs and bonds" });
const status = (page: Page) => page.getByRole("status");
const drawing = (page: Page) => page.locator(".arrows-structure svg.structure");
const pushLine = (page: Page) => page.locator(".push-line");

async function center(page: Page, selector: string) {
  const box = (await page.locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags from a source to a drop spot with the mouse, checking the line above the card on the way. */
async function drag(page: Page, from: string, to: string, line?: string) {
  const a = await center(page, `[data-source="${from}"] .hit`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 30, a.y + 30, { steps: 4 });
  await expect(page.locator(".drop-spot").first()).toBeVisible();
  const b = await center(page, `[data-spot="${to}"] circle`);
  await page.mouse.move(b.x, b.y, { steps: 6 });
  if (line) await expect(pushLine(page)).toHaveText(line);
  await page.mouse.up();
}

/** Opens the Lesson at a Step (a Step link) with fresh progress, once its answer key has loaded. */
async function open(page: Page, step: string) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await Promise.all([page.waitForResponse((r) => r.url().includes("/answers/")), page.goto(`${LESSON}#${step}`)]);
  await expect(sources(page)).toBeVisible();
  // The island opens the linked Step once hydrated.
  await expect(page.locator(`#${step}`)).toBeVisible();
}

test("drag a bond with the pointer: wrong push gets its Hint, the right one redraws the structure and plays the Scene", async ({ page }) => {
  await open(page, "s04");
  await expect(page.getByText("Each arrow is checked as you draw it.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check" })).toHaveCount(0);

  // Starting on carbon, which has no lone pair, tells the Student where arrows start.
  const c = await center(page, `[data-source="b1"] .hit`);
  const cx = (await page.locator(".arrows-structure svg.structure text.atom").first().boundingBox())!;
  await page.mouse.move(cx.x + cx.width / 2, cx.y + cx.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(pushLine(page)).toHaveText("Start at a lone pair or a bond.");
  expect(c).toBeTruthy();

  await drag(page, "b1", "a1", "π bond C1=O2 → C1");
  await expect(status(page)).toContainText("Electrons flow to the sink.");
  await expect(drawing(page).locator(".charge")).toHaveCount(0);

  await drag(page, "b1", "a2", "π bond C1=O2 → O2");
  await expect(status(page)).toContainText("✓ Correct. The π pair is now a lone pair on O");
  // The Step's own Scene plays in place of the card.
  await expect(page.locator(".scene-frame")).toBeVisible();
  await expect(sources(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});

test("keyboard: Tab to a source, Enter, Tab to a target, Enter; Esc cancels; Delete undoes; flags are read", async ({ page }) => {
  await open(page, "s06");
  const lonePair = page.getByRole("button", { name: "lone pair on O4" });
  await lonePair.focus();
  await page.keyboard.press("Enter");
  // Focus moves to the first target; Esc cancels back to the source.
  await expect(page.getByRole("button", { name: "Push to C2–O4 bond" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(lonePair).toBeFocused();
  await expect(page.locator(".drop-spot")).toHaveCount(0);

  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  // Accepted: C2 has 10 e⁻ now, flagged in plain words, ringed, and read aloud.
  await expect(page.locator(".arrow-flags")).toContainText("C2 has 10 e⁻: something has to leave.");
  await expect(page.locator(".flag-ring")).toHaveCount(1);
  await expect(page.locator("[aria-live=polite]").filter({ hasText: "Pushed: lone pair on O4 → C2–O4 bond." })).toHaveCount(1);

  // Delete undoes the last arrow.
  await page.keyboard.press("Delete");
  await expect(page.locator(".arrow-flags")).toHaveCount(0);
  await expect(page.locator(".push-arrow")).toHaveCount(0);

  // π bond first this time: C2 falls to 6 e⁻; then the lone pair finishes it.
  await page.getByRole("button", { name: "π bond C2=O3" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Push to/ })).toHaveCount(4);
  const toO3 = page.getByRole("button", { name: "Push to O3" });
  for (let i = 0; i < 4 && !(await toO3.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(toO3).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".arrow-flags")).toContainText("C2 has only 6 e⁻");
  // The structure is redrawn live: C2⁺ and O3⁻ next to the start's O4⁻, one arrow drawn.
  await expect(drawing(page).locator(".charge")).toHaveCount(3);
  await expect(page.locator(".push-arrow")).toHaveCount(1);

  await page.getByRole("button", { name: "lone pair on O4" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(status(page)).toContainText("✓ Correct. The charge moved from one O to the other");
  // No Scene on this Step: push-replay plays the two arrows in place of the card.
  await expect(page.getByRole("img", { name: /^Arrows: π bond C2=O3 → O3; lone pair on O4 → C2–O4 bond\./ })).toBeVisible();
});

test("two wrong tries on one push of a multi-push Step: that push is shown, and the Step goes on", async ({ page }) => {
  await open(page, "s06");
  const push = async (from: string, to: string) => {
    await page.getByRole("button", { name: from, exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: `Push to ${to}`, exact: true }).focus();
    await page.keyboard.press("Enter");
  };
  await push("π bond C2=O3", "C2");
  await expect(status(page)).toContainText("✗ Not quite. Oxygen is the electronegative sink.");
  await push("lone pair on O3", "C2=O3 bond");
  await expect(status(page)).toContainText("Here is that push: lone pair on O4 → C2–O4 bond.");
  await expect(page.locator(".push-arrow.shown")).toHaveCount(1);
  // Fresh tries for the next push; it finishes the Step, which then ends on the reveal.
  await push("π bond C2=O3", "O3");
  await expect(status(page)).toContainText("→ Answer:");
});

test.describe("touch", () => {
  test.use({ hasTouch: true });

  test("tap a source, then tap a dashed spot; two wrong tries show that push", async ({ page }) => {
    await open(page, "s07");
    const tap = async (selector: string) => {
      const p = await center(page, selector);
      await page.touchscreen.tap(p.x, p.y);
    };
    // Wrong: the π pair parked on C2.
    await tap(`[data-source="b1"] .hit`);
    await expect(page.locator(".drop-spot")).not.toHaveCount(0);
    await tap(`[data-spot="a2"] circle`);
    await expect(status(page)).toContainText("That parks the pair on one carbon");
    // Wrong again: that push is shown (and this one-push Step ends on the reveal, with the replay).
    await tap(`[data-source="b1"] .hit`);
    await tap(`[data-spot="a1"] circle`);
    await expect(status(page)).toContainText("→ Answer: The C1=C2 π pair slides into the C2–C3 bond.");
    await expect(page.getByRole("img", { name: /^Arrow: π bond C1=C2 → C2–C3 bond\./ })).toBeVisible();
  });
});

test("a lone pair pushed across the gap makes a new bond to another molecule (NH₃ → BF₃)", async ({ page }) => {
  await open(page, "s08");
  await drag(page, "a1", "a2", "lone pair on N1 → B2");
  await expect(status(page)).toContainText("✓ Correct. A new N–B bond");
  await expect(page.getByRole("img", { name: /^Arrow: lone pair on N1 → B2\./ })).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("on success the replay waits for a tap", async ({ page }) => {
    await open(page, "s07");
    await drag(page, "b1", "b2", "π bond C1=C2 → C2–C3 bond");
    await expect(status(page)).toContainText("✓ Correct.");
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  });
});

test("an open Check Problem shows no target and accepts either oxygen", async ({ page }) => {
  await open(page, "s10");
  await expect(page.locator(".arrows-target")).toHaveCount(0);
  await drag(page, "a4", "b4");
  await drag(page, "b5", "a6");
  await expect(status(page)).toContainText("✓ Correct. The charge moved from C4 onto an oxygen");
});
