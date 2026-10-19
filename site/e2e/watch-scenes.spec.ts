// A watch-only Scene (#66) plays in a Step like any Scene: the committed
// Manim video, named for screen readers, with Play/Pause, Replay and a
// scrubber; under reduced motion it opens paused on its poster frame.
import { expect, test, type Page } from "@playwright/test";

const STEP = "/organic/orgo-1/structure-bonding/sample-scenes#s01";

const scene = (page: Page) => page.getByRole("img", { name: /^A star's core\. Three helium nuclei fuse into one carbon nucleus: three helium-4 make carbon-12\./ });
const video = (page: Page) => page.locator("figure.scene video");
const playButton = (page: Page) => page.getByRole("button", { name: "Play", exact: true });
const pauseButton = (page: Page) => page.getByRole("button", { name: "Pause", exact: true });
const scrubber = (page: Page) => page.getByRole("slider", { name: "Scrub" });
const currentTime = (page: Page) => video(page).evaluate((v: HTMLVideoElement) => v.currentTime);

test("star-forge plays in a Step: silent video, autoplay once, replay and scrub", async ({ page }) => {
  await page.goto(STEP);
  await expect(page.getByText("Step 1 of 10")).toBeVisible();
  await expect(scene(page)).toBeVisible();
  await expect(scene(page)).toHaveAttribute("aria-label", /Text: Every carbon atom in you was forged in a star\./);
  await expect(video(page)).toHaveAttribute("src", /\/scenes\/star-forge\/star-forge-16x9\.mp4$/);
  await expect(video(page)).toHaveAttribute("poster", /\/scenes\/star-forge\/star-forge-16x9\.poster\.jpg$/);
  expect(await video(page).evaluate((v: HTMLVideoElement) => v.muted && !v.controls && !v.loop)).toBe(true);

  // Autoplays on entry: the video's own clock runs.
  await expect(pauseButton(page)).toBeVisible();
  await expect.poll(() => currentTime(page)).toBeGreaterThan(0.5);

  // The scrubber pauses and moves the video.
  await scrubber(page).fill("6");
  await expect(playButton(page)).toBeVisible();
  await expect.poll(() => currentTime(page)).toBeCloseTo(6, 1);

  // Replay starts it from the top.
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(pauseButton(page)).toBeVisible();
  await expect.poll(() => currentTime(page)).toBeLessThan(6);

  // The shipped files are served.
  for (const file of ["star-forge-16x9.mp4", "star-forge-16x9.poster.jpg", "star-forge-16x9.sources.json"]) {
    expect((await page.request.get(`/scenes/star-forge/${file}`)).status()).toBe(200);
  }
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("star-forge opens paused on its poster frame with Play", async ({ page }) => {
    await page.goto(STEP);
    await expect(scene(page)).toBeVisible();
    await expect(playButton(page)).toBeVisible();
    await expect(scrubber(page)).toHaveValue("13");
    await page.waitForTimeout(500);
    await expect(playButton(page)).toBeVisible();

    // Play from the poster (the last frame) starts the video from the top.
    await playButton(page).click();
    await expect(pauseButton(page)).toBeVisible();
    await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
    expect(await currentTime(page)).toBeLessThan(12);
  });
});
