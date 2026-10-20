// Scenes (#64) in real Lessons: Lesson 1's dots-and-sticks in an Explain Step, and Lesson 4's
// pi-twist in a Manipulate a Scene Step.
import { expect, test, type Page } from "@playwright/test";

const EXPLAIN = "/organic/orgo-1/structure-bonding/bonds-polarity-formal-charge#s06";
const MANIPULATE = "/organic/orgo-1/structure-bonding/hybridization-orbitals#s08";

const scene = (page: Page) => page.locator("figure.scene .scene-frame");
const twistScene = (page: Page) => page.getByRole("img", { name: /^Twist \d+ degrees\./ });
const playButton = (page: Page) => page.getByRole("button", { name: "Play", exact: true });
const pauseButton = (page: Page) => page.getByRole("button", { name: "Pause", exact: true });
const scrubber = (page: Page) => page.getByRole("slider", { name: "Scrub" });

test("a Scene in an Explain Step autoplays once, with replay and a scrubber", async ({ page }) => {
  await page.goto(EXPLAIN);
  await expect(page.getByText("Step 6 of 14")).toBeVisible();
  await expect(scene(page)).toBeVisible();

  // Autoplays on entry, then stops on its last frame (8 s; it does not loop).
  await expect(pauseButton(page)).toBeVisible();
  await expect(playButton(page)).toBeVisible({ timeout: 12_000 });
  await expect(scrubber(page)).toHaveValue("8");

  // Replay starts it again.
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(pauseButton(page)).toBeVisible();

  // The scrubber pauses and moves to any moment.
  await scrubber(page).fill("1.5");
  await expect(playButton(page)).toBeVisible();
  await expect(scrubber(page)).toHaveValue("1.5");
});

test("Manipulate a Scene by keyboard: the slider drives the live Scene and Check grades its value", async ({ page }) => {
  await page.goto(MANIPULATE);
  await expect(page.getByText("Step 8 of 15")).toBeVisible();
  const twist = page.getByRole("slider", { name: "Twist" });
  await expect(twist).toHaveAttribute("aria-valuetext", "0°");

  await twist.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(twist).toHaveAttribute("aria-valuetext", "45°");
  await expect(twistScene(page)).toHaveAttribute("aria-label", /π overlap: partial\./);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("✗ Not quite. Still overlapping a little. Keep twisting.");

  await twist.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(twist).toHaveAttribute("aria-valuetext", "90°");
  await expect(twistScene(page)).toHaveAttribute("aria-label", /at right angles\. π overlap: none\./);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("✓ Correct. At 90° the two p orbitals are at right angles");

  // The Scene's cited ethylene geometry gets a Source note.
  await expect(page.getByText("ⓘ Where these numbers come from")).toBeVisible();
});

test("Manipulate a Scene by pointer at 1280 × 720; the Scene plays once and stops (nothing loops)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(MANIPULATE);
  const twist = page.getByRole("slider", { name: "Twist" });
  const click = async (at: (box: { x: number; y: number; width: number; height: number }) => [number, number]) => {
    await twist.scrollIntoViewIfNeeded();
    const box = (await twist.boundingBox())!;
    await page.mouse.click(...at(box));
  };
  await click((box) => [box.x + box.width / 2, box.y + box.height / 2]);
  await expect(twist).toHaveAttribute("aria-valuetext", "90°");

  // One run (4 s), then it stops on its last frame: nothing loops in the Step player.
  await expect(playButton(page)).toBeVisible({ timeout: 6_000 });
  await page.waitForTimeout(1_000);
  await expect(pauseButton(page)).toHaveCount(0);

  // Two wrong tries reveal the answer, and the slider jumps to it. The feedback panel never covers the slider.
  await click((box) => [box.x + 2, box.y + box.height / 2]);
  await expect(twist).toHaveAttribute("aria-valuetext", "0°");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("✗ Not quite.");
  await click((box) => [box.x + box.width - 2, box.y + box.height / 2]);
  await expect(twist).toHaveAttribute("aria-valuetext", "180°");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("→ Answer:");
  await expect(twist).toHaveAttribute("aria-valuetext", "90°");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a Scene opens paused on its poster frame with Play", async ({ page }) => {
    await page.goto(EXPLAIN);
    await expect(scene(page)).toBeVisible();
    await expect(playButton(page)).toBeVisible();
    await expect(scrubber(page)).toHaveValue("8");
    await page.waitForTimeout(500);
    await expect(scrubber(page)).toHaveValue("8");

    await playButton(page).click();
    await expect(pauseButton(page)).toBeVisible();
  });

  test("a Manipulate Step opens paused too, and the slider still works", async ({ page }) => {
    await page.goto(MANIPULATE);
    await expect(playButton(page)).toBeVisible();
    const twist = page.getByRole("slider", { name: "Twist" });
    await twist.focus();
    await page.keyboard.press("End");
    await expect(twist).toHaveAttribute("aria-valuetext", "180°");
  });
});
