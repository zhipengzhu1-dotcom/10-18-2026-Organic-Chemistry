// Numeric input and Rank / order Steps (#63), on the real Lessons that use them.
import { expect, test, type Page } from "@playwright/test";

const UNIT = "/organic/orgo-1/structure-bonding";

const status = (page: Page) => page.getByRole("status");
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();
const order = (page: Page) => page.getByRole("list", { name: "Order" });
const cards = (page: Page) => order(page).getByRole("button").allTextContents();
const box = (page: Page) => page.getByRole("textbox", { name: "Answer" });

test("Rank by keyboard: arrow keys move the focused card, and focus stays on it (Lesson 1 s04)", async ({ page }) => {
  await page.goto(`${UNIT}/bonds-polarity-formal-charge#s04`);
  await expect(page.getByText("Step 4 of 14")).toBeVisible();
  expect(await cards(page)).toEqual(["O–H", "C–F", "C–H", "N–H"]);
  const card = (name: string) => order(page).getByRole("button", { name, exact: true });
  await card("C–H").focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(card("C–H")).toBeFocused();
  expect(await cards(page)).toEqual(["C–H", "O–H", "C–F", "N–H"]);
  await card("C–F").focus();
  await page.keyboard.press("ArrowDown");
  expect(await cards(page)).toEqual(["C–H", "O–H", "N–H", "C–F"]);
  await check(page);
  await expect(status(page)).toContainText("✗ Not quite. Oxygen sits right of nitrogen, so it pulls harder on hydrogen's electrons.");
  await card("N–H").focus();
  await page.keyboard.press("ArrowUp");
  expect(await cards(page)).toEqual(["C–H", "N–H", "O–H", "C–F"]);
  await check(page);
  await expect(status(page)).toContainText("✓ Correct. C–H is nearly even, and C–F is the most lopsided.");
});

test("Numeric: the unit is shown beside the box, never typed; numbers in JetBrains Mono (Lesson 2 s06)", async ({ page }) => {
  await page.goto(`${UNIT}/drawing-molecules#s06`);
  await expect(page.getByText("Step 6 of 15")).toBeVisible();
  await expect(page.getByText("H atoms", { exact: true })).toBeVisible();
  await expect(box(page)).toHaveCSS("font-family", /JetBrains Mono/);
  await box(page).fill("12");
  await check(page);
  await expect(status(page)).toContainText("✗ Not quite. Check the carbon under the =O.");
  await box(page).fill("10");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct. Five CH₂ corners give 10.");
  // Answered: no more tries.
  await expect(page.getByRole("button", { name: "Check" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});

test("Numeric: wrong twice → the reveal (Lesson 2 s10)", async ({ page }) => {
  await page.goto(`${UNIT}/drawing-molecules#s10`);
  await expect(page.getByText("Step 10 of 15")).toBeVisible();
  await expect(page.getByText("lone pairs", { exact: true })).toBeVisible();
  await box(page).fill("2");
  await check(page);
  await expect(status(page)).toContainText("That's the oxygen. The nitrogen has a lone pair too");
  await box(page).fill("5");
  await check(page);
  await expect(status(page)).toContainText("→ Answer: 3 lone pairs: 2 on the O, 1 on the N.");
});

test("a Rank Check Problem is answered by dragging a card (Lesson 8 s12)", async ({ page }) => {
  await page.goto(`${UNIT}/molecular-orbitals#s12`);
  await expect(page.getByText("Step 12 of 15")).toBeVisible();
  expect(await cards(page)).toEqual(["He₂ (4 e⁻)", "H₂ (2 e⁻)", "He₂⁺ (3 e⁻)"]);
  await order(page).getByRole("button", { name: /^He₂ \(4/ }).dragTo(order(page).getByRole("button", { name: /^He₂⁺/ }));
  expect(await cards(page)).toEqual(["H₂ (2 e⁻)", "He₂⁺ (3 e⁻)", "He₂ (4 e⁻)"]);
  await check(page);
  await expect(status(page)).toContainText("✓ Correct. Bond orders 1, ½, 0.");
});
