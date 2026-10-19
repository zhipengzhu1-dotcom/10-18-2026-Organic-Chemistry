import { expect, test } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/sample-numbers-and-order";

test("a Student answers Numeric input and Rank / order Steps", async ({ page }) => {
  await page.goto(LESSON);

  const status = page.getByRole("status");
  const check = () => page.getByRole("button", { name: "Check" }).click();
  const next = () => page.getByRole("button", { name: "Continue" }).click();
  const at = (n: number) => expect(page.getByText(`Step ${n} of 10`)).toBeVisible();
  const order = page.getByRole("list", { name: "Order" });
  const cards = () => order.getByRole("button").allTextContents();
  const box = page.getByRole("textbox", { name: "Answer" });

  // s01 Hook, s02 Explain
  await page.getByRole("group", { name: "Choices" }).getByRole("button").first().click();
  await check();
  await next();
  await next();

  // s03 Rank by keyboard: arrow keys move the focused card, and focus stays on it.
  await at(3);
  expect(await cards()).toEqual(["C=C", "C–C", "C≡C"]);
  await order.getByRole("button", { name: "C≡C" }).focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  expect(await cards()).toEqual(["C≡C", "C=C", "C–C"]);
  await order.getByRole("button", { name: "C–C" }).focus();
  await page.keyboard.press("ArrowUp");
  expect(await cards()).toEqual(["C≡C", "C–C", "C=C"]);
  await check();
  await expect(status).toContainText("✗ Not quite. Count the shared pairs.");
  await order.getByRole("button", { name: "C–C" }).focus();
  await page.keyboard.press("ArrowDown");
  expect(await cards()).toEqual(["C≡C", "C=C", "C–C"]);
  await check();
  await expect(status).toContainText("✓ Correct. Three shared pairs");
  await next();
  await next();

  // s05 Numeric: the unit is shown beside the box, never typed; numbers in JetBrains Mono.
  await at(5);
  await expect(page.getByText("°", { exact: true })).toBeVisible();
  await expect(box).toHaveCSS("font-family", /JetBrains Mono/);
  await box.fill("120");
  await check();
  await expect(status).toContainText("✗ Not quite. 120° is three bonds in a flat triangle.");
  await box.fill("109.4");
  await check();
  await expect(status).toContainText("✓ Correct. The tetrahedral angle");
  await expect(box).toBeDisabled();
  await next();
  await next();

  // s07 Numeric: wrong twice → the reveal.
  await at(7);
  await expect(page.getByText("electrons", { exact: true })).toBeVisible();
  await box.fill("2");
  await check();
  await expect(status).toContainText("Two is the number of bonds.");
  await box.fill("8");
  await check();
  await expect(status).toContainText("→ Answer: 4: a double bond is two shared pairs.");
  await next();

  // s08 Check: a Numeric Problem.
  await at(8);
  await box.fill("6");
  await check();
  await expect(status).toContainText("✓ Correct.");
  await next();

  // s09 Check: a Rank Problem, answered by dragging a card.
  await at(9);
  expect(await cards()).toEqual(["methane, CH₄", "ethyne, HC≡CH", "ethene, H₂C=CH₂"]);
  await order.getByRole("button", { name: /methane/ }).dragTo(order.getByRole("button", { name: /ethene/ }));
  expect(await cards()).toEqual(["ethyne, HC≡CH", "ethene, H₂C=CH₂", "methane, CH₄"]);
  await check();
  await expect(status).toContainText("✓ Correct. Ethyne is straight");
  await next();

  await at(10);
  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
});
