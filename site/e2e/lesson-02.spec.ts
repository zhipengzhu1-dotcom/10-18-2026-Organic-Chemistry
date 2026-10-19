// Lesson 2: Drawing Molecules, played start to Wrap: keyboard only at laptop
// width, and by touch-sized clicks at phone width with a wrong answer, its
// Hint, the drawings under the prompt and the Reveal Scenes.
import { expect, test, type Locator, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/drawing-molecules";

/** Moves focus with Tab only, until `target` has it. */
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 80; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached ${target}`);
}

const choice = (page: Page, name: string) =>
  page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: true });

test("keyboard only, laptop width: every Step answered right, start to Wrap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(LESSON);
  const status = page.getByRole("status");
  const at = (n: number) => expect(page.getByText(`Step ${n} of 15`)).toBeVisible();
  const press = async (name: "Check" | "Continue") => {
    const button = page.getByRole("button", { name });
    await expect(button).toBeEnabled();
    await tabTo(page, button);
    await page.keyboard.press("Enter");
  };
  const pick = async (name: string) => {
    await tabTo(page, choice(page, name));
    await page.keyboard.press("Enter");
  };
  const type = async (value: string) => {
    await tabTo(page, page.getByRole("textbox", { name: "Answer" }));
    await page.keyboard.type(value);
    await page.keyboard.press("Enter");
  };
  const correct = () => expect(status).toContainText("Correct.");

  // s01 Hook: a prediction; the reveal plays h-fill and says 24.
  await at(1);
  await expect(page.getByRole("img", { name: /^Estradiol, line-angle drawing/ })).toBeVisible();
  await pick("about 25");
  await press("Check");
  await expect(status).toContainText("24.");
  await expect(page.getByRole("img", { name: /The counter ends at 24 hydrogens/ })).toBeVisible();
  await press("Continue");

  // s02 Explain with ethanol-three-ways, stage 1.
  await at(2);
  await expect(page.getByRole("img", { name: /Ethanol drawn with dots/ })).toBeVisible();
  await press("Continue");

  // s03 structure cards under a Lewis drawing.
  await at(3);
  await expect(page.getByRole("img", { name: /^Formaldehyde as a Lewis structure/ })).toBeVisible();
  await pick("C double-bonded to O; O has two lone pairs");
  await press("Check");
  await correct();
  await press("Continue");

  await at(4);
  await press("Continue");

  // s05 Tap every carbon of cyclohexanone (every target but the oxygen), by Tab and Enter.
  await at(5);
  const taps = page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button");
  await expect(taps).toHaveCount(7);
  for (const target of await taps.all()) {
    if ((await target.getAttribute("aria-label"))?.startsWith("Oxygen")) continue;
    await tabTo(page, target);
    await page.keyboard.press("Enter");
  }
  await press("Check");
  await correct();
  await press("Continue");

  // s06 Numeric: 10 H atoms; the h-fill Reveal Scene appears with the answer.
  await at(6);
  await expect(page.getByText("H atoms", { exact: true })).toBeVisible();
  await type("10");
  await correct();
  await expect(page.getByRole("img", { name: /Total: 10 hydrogens/ })).toBeVisible();
  await press("Continue");

  await at(7);
  await expect(page.getByRole("img", { name: /ethanol, ethylamine and chloroethane/ })).toBeVisible();
  await press("Continue");

  await at(8);
  await pick("three carbons in a V; oxygen double-bonded to the middle carbon");
  await press("Check");
  await correct();
  await press("Continue");

  await at(9);
  await pick("HO, then a letter C with no hydrogens, then CH₃");
  await press("Check");
  await correct();
  await press("Continue");

  // s10: lone pairs hidden, with the chip.
  await at(10);
  await expect(page.locator(".structure-figure .chip", { hasText: "Lone pairs hidden" })).toBeVisible();
  await type("3");
  await correct();
  await press("Continue");

  // s11–s14: the Check Problems.
  await at(11);
  await pick("N triple-bonded to N; one lone pair on each N");
  await press("Check");
  await correct();
  await press("Continue");

  await at(12);
  await pick("CH₂ double-bonded to CH, single-bonded to C, triple-bonded to N; one lone pair on N");
  await press("Check");
  await correct();
  await press("Continue");

  await at(13);
  await type("5");
  await correct();
  await press("Continue");

  await at(14);
  await type("16");
  await correct();
  await press("Continue");

  // s15 Wrap: estradiol's final drawing, then the Lesson-end screen.
  await at(15);
  await expect(page.getByRole("img", { name: /all 24 hydrogens drawn/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Unit" }).or(page.getByRole("link", { name: "Next Lesson" })).first()).toBeVisible();
});

test("phone width: drawings fit, a wrong answer gets its Hint, Reveal Scenes wait for the answer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${LESSON}#s06`);
  const status = page.getByRole("status");
  const check = () => page.getByRole("button", { name: "Check" }).click();
  const box = page.getByRole("textbox", { name: "Answer" });
  const noSideScroll = async () =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  // s06: the drawing is on screen, the Reveal Scene is not, until the answer.
  await expect(page.getByText("Step 6 of 15")).toBeVisible();
  await expect(page.getByRole("img", { name: /^Cyclohexanone, line-angle drawing/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Total: 10 hydrogens/ })).toHaveCount(0);
  await noSideScroll();
  await box.fill("12");
  await expect(page.getByRole("button", { name: "Check" })).toBeEnabled();
  await check();
  await expect(status).toContainText("Check the carbon under the =O");
  await expect(page.getByRole("img", { name: /Total: 10 hydrogens/ })).toHaveCount(0);
  await box.fill("10");
  await check();
  await expect(status).toContainText("Five CH₂ corners give 10");
  await expect(page.getByRole("img", { name: /Total: 10 hydrogens/ })).toBeVisible();
  await noSideScroll();

  // The Source note names the formula, from PubChem.
  await page.getByText(/Where these numbers come from|Sources/).click();
  await expect(page.locator(".source-note")).toContainText("PubChem CID 7967");

  // s08 (the signature Step): four line-angle cards fit side by side.
  await page.goto(`${LESSON}#s08`);
  await expect(page.getByText("Step 8 of 15")).toBeVisible();
  await expect(page.getByRole("img", { name: /^Acetone as a Kekulé structure/ })).toBeVisible();
  const cards = page.getByRole("group", { name: "Choices" }).getByRole("button");
  await expect(cards).toHaveCount(4);
  for (const card of await cards.all()) expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await noSideScroll();
  await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
  await choice(page, "three carbons in a zigzag; oxygen double-bonded to the end carbon").click();
  await check();
  await expect(status).toContainText("The middle one, not an end.");

  // s13 Check Problem: lone pairs hidden, then the lone-pair-fill Reveal Scene.
  await page.goto(`${LESSON}#s13`);
  await expect(page.getByText("Step 13 of 15")).toBeVisible();
  await expect(page.locator(".structure-figure .chip", { hasText: "Lone pairs hidden" })).toBeVisible();
  await expect(page.locator(".structure-figure .lone-pair-dot")).toHaveCount(0);
  await box.fill("5");
  await expect(page.getByRole("button", { name: "Check" })).toBeEnabled();
  await check();
  await expect(page.getByRole("img", { name: /Five in all/ })).toBeVisible();
  await noSideScroll();
});
