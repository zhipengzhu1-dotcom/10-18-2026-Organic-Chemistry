// The homepage Push hero (#73): one screen with the headline, a live OH⁻ + H⁺
// push made by drag or by keyboard, one "Start Unit 1" button, and the Course
// map right below. Returning visitors get the Hub instead.
import { expect, test, type Page } from "@playwright/test";

const UNIT_1 = "/organic/orgo-1/structure-bonding";
const HEADLINE = "Chemistry is how the universe builds things. Come build.";

const hero = (page: Page) => page.getByRole("region", { name: HEADLINE });
const status = (page: Page) => hero(page).getByRole("status");
const lonePair = (page: Page) => hero(page).getByRole("button", { name: "lone pair on O1" });

async function center(page: Page, selector: string) {
  const box = (await hero(page).locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Fresh visitor, island hydrated. */
async function firstVisit(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(lonePair(page)).toBeVisible();
}

test("a first-time visitor sees the headline, the push, one Start Unit 1 button and the Course map below", async ({ page }) => {
  await firstVisit(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(HEADLINE);
  await expect(hero(page)).toBeInViewport();
  await expect(status(page)).toContainText("Try it: drag an electron pair from O onto H⁺.");

  const start = page.getByRole("link", { name: "Start Unit 1" });
  await expect(start).toHaveCount(1);
  await expect(start).toHaveAttribute("href", UNIT_1);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeHidden();

  // The Course map comes directly after the hero.
  const map = page.getByRole("region", { name: "Organic Chemistry I", exact: true });
  await expect(map).toBeVisible();
  const heroBox = (await hero(page).boundingBox())!;
  expect((await map.boundingBox())!.y).toBeGreaterThan(heroBox.y + heroBox.height - 1);
  // No intro cards between the headline and the push.
  await expect(page.locator(".first-visit > *")).toHaveCount(1);

  await start.click();
  await expect(page).toHaveURL(UNIT_1);
});

test("on a phone the headline, the push and Start Unit 1 fit one screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await firstVisit(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({ ratio: 1 });
  await expect(lonePair(page)).toBeInViewport();
  await expect(page.getByRole("link", { name: "Start Unit 1" })).toBeInViewport({ ratio: 1 });
  if (process.env.HERO_SHOT) await page.screenshot({ path: process.env.HERO_SHOT });
});

test("dragging the OH⁻ lone pair onto H⁺ makes water", async ({ page }) => {
  await firstVisit(page);
  const a = await center(page, '[data-source="a1"] .hit');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x - 30, a.y - 10, { steps: 4 });
  const b = await center(page, '[data-spot="a2"] circle');
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();

  await expect(status(page)).toContainText("✓ You just made water.");
  await expect(hero(page).locator("svg.structure .charge")).toHaveCount(0);
  // Water stays on screen; the push is made, so no more pushes.
  await expect(lonePair(page)).toHaveAttribute("aria-disabled", "true");
});

test("the keyboard makes the push with Tab and Enter", async ({ page }) => {
  await firstVisit(page);
  await lonePair(page).focus();
  await page.keyboard.press("Enter");
  // Focus moves to the targets; Tab along them to H⁺.
  const h = hero(page).getByRole("button", { name: "Push to H2" });
  for (let i = 0; i < 4 && !(await h.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(h).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(status(page)).toContainText("✓ You just made water.");
});

test("a wrong push gets the miss line, not the answer", async ({ page }) => {
  await firstVisit(page);
  await lonePair(page).focus();
  await page.keyboard.press("Enter");
  // The lone pair onto its own O–H bond makes no water.
  const wrong = hero(page).getByRole("button", { name: /^Push to .*O1–H3/ });
  await wrong.focus();
  await page.keyboard.press("Enter");
  await expect(status(page)).toContainText("Almost: let go on top of H⁺, the dashed circle.");
  await expect(lonePair(page)).toBeVisible();
});

test("a returning visitor gets the Hub instead of the hero", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("astratron.progress", JSON.stringify({ version: 1, lessons: {}, problems: {}, last: "u1-sample" })),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText(HEADLINE)).toBeHidden();
  await expect(page.getByRole("link", { name: "Start Unit 1" })).toBeHidden();
});
