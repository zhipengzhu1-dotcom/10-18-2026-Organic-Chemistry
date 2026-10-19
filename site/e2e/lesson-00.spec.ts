// Lesson 0, Why Carbon? (#78): the On-ramp plays start to Wrap by keyboard alone, on a
// laptop and on a phone: the star-forge Hook and its crust-vs-body reveal, the give-or-take
// slider, the build-by-sharing goal (drops, refusals, idle Hints and the nudge), the steroid
// Tap Step and both Check Problems.
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/why-carbon";
const PHONE = { width: 390, height: 844 };

const status = (page: Page) => page.getByRole("status");
const press = async (page: Page, name: string | RegExp) => {
  await page.getByRole("button", { name, exact: typeof name === "string" }).focus();
  await page.keyboard.press("Enter");
};
const next = (page: Page) => press(page, "Continue");
const check = (page: Page) => press(page, "Check");
const goal = (page: Page) => page.locator(".scene-goal");
/** Pick up a handle and drop it on a target, by keyboard (Tab-reachable buttons in the Scene). */
async function move(page: Page, handle: string, target: string) {
  await goal(page).locator(`[data-handle="${handle}"]`).focus();
  await page.keyboard.press("Enter");
  await goal(page).locator(`[data-target="${target}"], [data-handle="${target}"]`).first().focus();
  await page.keyboard.press("Enter");
}

async function playLesson0(page: Page, phone = false) {
  await page.goto(LESSON);
  await expect(page.getByText("Step 1 of 9")).toBeVisible();

  // s01: the star-forge video, then a prediction; any choice reveals crust-vs-body.
  await expect(page.getByRole("img", { name: /^A star's core\./ })).toBeVisible();
  await expect(page.locator(".player-prompt")).toContainText("Carbon is only 0.02% of Earth's crust.");
  await press(page, "about 20%");
  await check(page);
  await expect(status(page)).toContainText("About 23% of you is carbon");
  await expect(page.getByRole("img", { name: "Two bars. Carbon is 0.02% of Earth's crust and 23% of the human body." })).toBeVisible();
  await next(page);

  // s02: the outer electrons, H to F, then neon.
  await expect(page.getByRole("img", { name: /^Hydrogen has 1 outer electron, carbon 4/ })).toBeVisible();
  await next(page);

  // s03 (signature): slide Li → B, a Hint; on to C, Correct.
  const atom = page.getByRole("slider", { name: "Atom" });
  await atom.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("img", { name: /^Boron: 3 outer electrons\./ })).toBeVisible();
  await check(page);
  await expect(status(page)).toContainText("Close. B gives 3 and N takes 3.");
  await atom.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("img", { name: /^Carbon: 4 outer electrons\. Give 4, costing 148\.0 electron-volts/ })).toBeVisible();
  await check(page);
  await expect(status(page)).toContainText("Carbon has to move 4 either way");
  await next(page);

  // s04: the water push.
  await expect(page.getByRole("img", { name: /^Hydroxide, an oxygen with three lone pairs/ })).toBeVisible();
  await next(page);

  // s05: build by sharing. Continue before the goal gives the stage's Hint.
  await expect(page.locator(".player-prompt")).toHaveText("Give carbon a full shell. Drag H atoms onto it.");
  await next(page);
  await expect(status(page)).toContainText("Count the dots around carbon.");
  await move(page, "tray-1", "dot-n");
  await expect(goal(page)).toHaveAttribute("aria-label", /1 hydrogen bonded.*Carbon holds 5 electrons\./);
  await move(page, "tray-2", "h-n");
  await expect(page.locator(".scene-say")).toHaveText("That H holds 2 already. It's full.");
  for (const [i, side] of ["e", "s", "w"].entries()) await move(page, `tray-${i + 2}`, `dot-${side}`);
  await expect(status(page)).toContainText("CH₄, methane: 8 around carbon, 2 around each H.");
  await expect(page.locator(".player-prompt")).toHaveText("Carbon can share with carbon too. Join these two pieces.");
  await move(page, "piece-left", "dot-right");
  await expect(status(page)).toContainText("C₂H₆, ethane: a carbon–carbon bond.");
  await expect(goal(page)).toHaveAttribute("aria-label", /^Ethane, two carbons sharing a pair, each with three hydrogens\./);
  await next(page);

  // s06: tap the two parts of testosterone that differ from estradiol.
  await expect(page.getByRole("img", { name: /^Estradiol: four fused rings/ })).toBeAttached();
  const taps = page.getByRole("group", { name: "Tappable atoms and bonds" });
  await taps.getByRole("button", { name: "The left-hand ring, with its C=O" }).focus();
  await page.keyboard.press("Enter");
  await check(page);
  await expect(status(page)).toContainText("That's one. There's a small CH₃ that only testosterone has.");
  for (const name of ["The left-hand ring, with its C=O", "The CH₃ on the left-hand ring junction"]) {
    await taps.getByRole("button", { name }).focus();
    await page.keyboard.press("Enter");
  }
  await check(page);
  await expect(status(page)).toContainText("Two small changes, the left ring and one extra CH₃");
  await next(page);

  // s07, s08: the Check Problems.
  await press(page, /^Gaining or losing 4 electrons is too hard/);
  await check(page);
  await expect(status(page)).toContainText("Right: 4 is the most electrons");
  await next(page);
  await expect(page.getByRole("img", { name: /^Methane, CH₄: a carbon sharing a pair/ })).toBeVisible();
  await page.getByRole("textbox", { name: "Answer" }).focus();
  await page.keyboard.type("8");
  await page.keyboard.press("Enter");
  await expect(status(page)).toContainText("4 shared pairs × 2 = 8. A full shell.");
  await expect(page.getByRole("img", { name: /Counting the shared pairs: 2, 4, 6, 8\./ })).toBeVisible();
  await next(page);

  // s09: the Wrap, then Lesson 1.
  await expect(page.getByText("Step 9 of 9")).toBeVisible();
  // (On a phone the Lesson-end screen leaves the Wrap's picture out, for the Key idea.)
  if (!phone) await expect(page.getByRole("img", { name: "Ethane, two carbons sharing a pair, each with three hydrogens." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Next Lesson" })).toHaveAttribute("href", /bonds-polarity-formal-charge$/);
}

test("Lesson 0 plays start to Wrap by keyboard on a laptop", async ({ page }) => {
  test.setTimeout(90_000);
  await playLesson0(page);
});

test.describe("on a phone", () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test("Lesson 0 plays start to Wrap by keyboard on a phone", async ({ page }) => {
    test.setTimeout(90_000);
    await playLesson0(page, true);
  });

  test("build-by-sharing works by drag: an H onto a single dot bonds; onto empty space it slides back", async ({ page }) => {
    await page.goto(`${LESSON}#s05`);
    const frame = goal(page);
    await expect(frame).toBeVisible();
    const box = async (sel: string) => (await frame.locator(sel).boundingBox())!;
    const drag = async (from: string, to: { x: number; y: number }) => {
      const a = await box(from);
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 6 });
      await page.mouse.up();
    };
    const empty = await box('[data-target="dot-w"]');
    await drag('[data-handle="tray-1"]', { x: empty.x - 30, y: empty.y + empty.height + 30 });
    await expect(frame).toHaveAttribute("aria-label", /Carbon holds 4 electrons\./);
    const dot = await box('[data-target="dot-e"]');
    await drag('[data-handle="tray-1"]', { x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 });
    await expect(frame).toHaveAttribute("aria-label", /1 hydrogen bonded.*Carbon holds 5 electrons\./);
  });
});

test("build-by-sharing: idle shows the Hint after 30 s, and a second idle ghosts the next move", async ({ page }) => {
  await page.clock.install();
  await page.goto(`${LESSON}#s05`);
  await expect(goal(page)).toBeVisible();
  await page.clock.fastForward(31_000);
  await expect(status(page)).toContainText("Drop each H on one of carbon's single dots.");
  await page.clock.fastForward(31_000);
  await expect(goal(page).locator("g[opacity='0.6'] line")).toHaveCount(1);
});
