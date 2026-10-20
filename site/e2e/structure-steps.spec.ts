// Structure cards and Tap-to-identify (#62) in real Lessons: Lesson 1's can't-exist cards (s09)
// and glycine (s08), Lesson 6's tap-only nitromethane (s03) and Lesson 4's sp² Check Problem (s12).
import { expect, test, type Page } from "@playwright/test";

const UNIT = "/organic/orgo-1/structure-bonding";
const L1 = `${UNIT}/bonds-polarity-formal-charge`;

const status = (page: Page) => page.getByRole("status");
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();
const card = (page: Page, name: RegExp) => page.getByRole("group", { name: "Choices" }).getByRole("button", { name });
const target = (page: Page, name: string) =>
  page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name, exact: true });

test("structure cards, several correct: wrong gets its Hint, then right", async ({ page }) => {
  await page.goto(`${L1}#s09`);
  await expect(page.getByText("Step 9 of 14")).toBeVisible();
  await expect(card(page, /^CH₃⁺/).locator("svg.structure")).toBeVisible();
  await card(page, /^CH₃⁺/).click();
  await card(page, /^CH₅/).click();
  await check(page);
  await expect(status(page)).toContainText("CH₃⁺ has only 6 electrons around carbon.");
  for (const name of [/^CH₅/, /^CH₂²⁻/]) {
    if ((await card(page, name).getAttribute("aria-pressed")) !== "true") await card(page, name).click();
  }
  if ((await card(page, /^CH₃⁺/).getAttribute("aria-pressed")) === "true") await card(page, /^CH₃⁺/).click();
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
});

test("Tap glycine by keyboard: charges hidden, every lone pair drawn", async ({ page }) => {
  await page.goto(`${L1}#s08`);
  await expect(page.getByText("Step 8 of 14")).toBeVisible();
  const drawing = page.locator(".tap-structure svg.structure");
  await expect(drawing.locator(".lone-pair-dot")).toHaveCount(10);
  await expect(drawing.locator(".charge")).toHaveCount(0);
  const nitrogen = target(page, "Nitrogen: single bonds to C, H, H and H.");
  await nitrogen.focus();
  await page.keyboard.press("Enter");
  await expect(nitrogen).toHaveAttribute("aria-pressed", "true");
  await check(page);
  await expect(status(page)).toContainText("One more. Find the oxygen with only one bond.");

  await nitrogen.focus();
  await page.keyboard.press("Enter");
  const oxide = target(page, "Oxygen: single bond to C; 3 lone pairs.");
  await oxide.focus();
  await page.keyboard.press("Enter");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct. N has 4 bonds (+1)");
});

test("Tap among Draw-arrows Steps: the tap-only cue, a drag gets the no-pushing line, two wrong tries ring the answer", async ({ page }) => {
  await page.goto(`${UNIT}/resonance-pushing-electrons#s03`);
  await expect(page.getByText("Step 3 of 15")).toBeVisible();
  await expect(page.getByText("Just tap, no pushing on this Step.")).toBeVisible();
  const box = (await page.locator(".tap-structure").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText(/^No pushing yet/)).toBeVisible();

  await target(page, "Nitrogen: double bond to O, single bonds to C and O; charge +1.").click();
  await check(page);
  await expect(status(page)).toContainText("N⁺ here has four bonds and no lone pair");
  await target(page, "Single bond, C to N.").click();
  await check(page);
  await expect(status(page)).toContainText("→ Answer: The three sources: lone pairs on O, lone pairs on O⁻, the N=O π bond.");
  await expect(page.locator(".answer-ring")).toHaveCount(3);
});

test("a Check Step's Tap Problem (Lesson 4 s12)", async ({ page }) => {
  await page.goto(`${UNIT}/hybridization-orbitals#s12`);
  await expect(page.getByText("Step 12 of 15")).toBeVisible();
  for (const atom of ["C1", "C2"]) await target(page, atom).click();
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
});

test("every tappable atom and bond is reachable with Tab", async ({ page }) => {
  await page.goto(`${L1}#s08`);
  const targets = page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button");
  await expect(targets).toHaveCount(10);
  await targets.first().focus();
  // Each one is announced by its own name: same-sounding atoms are numbered.
  const reached = new Set<string>();
  for (let i = 0; i < 10; i++) {
    reached.add((await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) ?? "");
    await page.keyboard.press("Tab");
  }
  expect(reached.size).toBe(10);
  expect(reached).toContain("Hydrogen: single bond to N (1 of 3).");
});
