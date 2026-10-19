import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/sample-scenes";

const scene = (page: Page) => page.getByRole("img", { name: /Two carbons joined/ });
const playButton = (page: Page) => page.getByRole("button", { name: "Play", exact: true });
const pauseButton = (page: Page) => page.getByRole("button", { name: "Pause", exact: true });
const scrubber = (page: Page) => page.getByRole("slider", { name: "Scrub" });

test("a Scene in an Explain Step autoplays once, with replay and a scrubber", async ({ page }) => {
  await page.goto(`${LESSON}#s02`);
  await expect(page.getByText("Step 2 of 10")).toBeVisible();
  await expect(scene(page)).toBeVisible();

  // Autoplays on entry, then stops on its last frame (it does not loop).
  await expect(pauseButton(page)).toBeVisible();
  await expect(playButton(page)).toBeVisible({ timeout: 8_000 });
  await expect(scrubber(page)).toHaveValue("4");

  // Replay starts it again.
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(pauseButton(page)).toBeVisible();

  // The scrubber pauses and moves to any moment.
  await scrubber(page).fill("1.5");
  await expect(playButton(page)).toBeVisible();
  await expect(scrubber(page)).toHaveValue("1.5");
});

test("Manipulate a Scene by keyboard: the slider drives the live Scene and Check grades its value", async ({ page }) => {
  await page.goto(`${LESSON}#s03`);
  await expect(page.getByText("Step 3 of 10")).toBeVisible();
  const twist = page.getByRole("slider", { name: "Twist" });
  await expect(twist).toHaveAttribute("aria-valuetext", "0°");

  await twist.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(twist).toHaveAttribute("aria-valuetext", "45°");
  await expect(scene(page)).toHaveAttribute("aria-label", /tilted: partial overlap/);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("✗ Not quite. Still overlapping a little. Keep twisting.");

  await twist.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(twist).toHaveAttribute("aria-valuetext", "90°");
  await expect(scene(page)).toHaveAttribute("aria-label", /perpendicular: no side-on overlap/);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("✓ Correct. A quarter turn");

  // The Scene's cited element colour gets a Source note.
  await expect(page.getByText("ⓘ Where these numbers come from")).toBeVisible();
});

test("Manipulate a Scene by pointer, and the Scene loops", async ({ page }) => {
  await page.goto(`${LESSON}#s03`);
  const twist = page.getByRole("slider", { name: "Twist" });
  const box = (await twist.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(twist).toHaveAttribute("aria-valuetext", "90°");

  // Still playing after more than one run (4 s): Manipulate Steps loop.
  await page.waitForTimeout(4_500);
  await expect(pauseButton(page)).toBeVisible();

  // Two wrong tries reveal the answer, and the slider jumps to it.
  await page.mouse.click(box.x + 2, box.y + box.height / 2);
  await expect(twist).toHaveAttribute("aria-valuetext", "0°");
  await page.getByRole("button", { name: "Check" }).click();
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(twist).toHaveAttribute("aria-valuetext", "180°");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("→ Answer:");
  await expect(twist).toHaveAttribute("aria-valuetext", "90°");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a Scene opens paused on its poster frame with Play", async ({ page }) => {
    await page.goto(`${LESSON}#s02`);
    await expect(scene(page)).toBeVisible();
    await expect(playButton(page)).toBeVisible();
    await expect(scrubber(page)).toHaveValue("0");
    await page.waitForTimeout(500);
    await expect(scrubber(page)).toHaveValue("0");

    await playButton(page).click();
    await expect(pauseButton(page)).toBeVisible();
  });

  test("a Manipulate Step opens paused too, and the slider still works", async ({ page }) => {
    await page.goto(`${LESSON}#s03`);
    await expect(playButton(page)).toBeVisible();
    const twist = page.getByRole("slider", { name: "Twist" });
    await twist.focus();
    await page.keyboard.press("End");
    await expect(twist).toHaveAttribute("aria-valuetext", "180°");
  });
});
