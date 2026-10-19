import { expect, test } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/sample-charges-you-can-tap";

test("a Student picks structure cards and taps atoms and bonds, by mouse and by keyboard", async ({ page }) => {
  await page.goto(LESSON);
  const status = page.getByRole("status");
  const check = () => page.getByRole("button", { name: "Check" }).click();
  const next = () => page.getByRole("button", { name: "Continue" }).click();
  const at = (n: number) => expect(page.getByText(`Step ${n} of 10`)).toBeVisible();
  const card = (name: RegExp) => page.getByRole("group", { name: "Choices" }).getByRole("button", { name });
  const target = (name: string) => page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name, exact: true });

  // s01 Hook, s02 Explain
  await page.getByRole("button", { name: "No: it can carry charges that cancel" }).click();
  await check();
  await next();
  await next();

  // s03 structure cards, several correct: wrong then right.
  await at(3);
  await expect(card(/^CH₃⁺/).locator("svg.structure")).toBeVisible();
  await card(/^CH₃⁺/).click();
  await card(/^CH₄/).click();
  await check();
  await expect(status).toContainText("Methane's carbon has 4 bonds");
  await card(/^CH₃⁺/).click();
  await card(/^CH₃⁻/).click();
  await check();
  await expect(status).toContainText("✓ Correct.");
  await next();
  await next();

  // s05 Tap glycine by keyboard: charges hidden, every lone pair drawn.
  await at(5);
  const drawing = page.locator(".tap-structure svg.structure");
  await expect(drawing.locator(".lone-pair-dot")).toHaveCount(10);
  await expect(drawing.locator(".charge")).toHaveCount(0);
  const nitrogen = target("Nitrogen: single bonds to C, H, H and H.");
  await nitrogen.focus();
  await page.keyboard.press("Enter");
  await expect(nitrogen).toHaveAttribute("aria-pressed", "true");
  await check();
  await expect(status).toContainText("One more. Find the oxygen with only one bond.");

  await nitrogen.focus();
  await page.keyboard.press("Enter");
  const oxide = target("Oxygen: single bond to C; 3 lone pairs.");
  await oxide.focus();
  await page.keyboard.press("Enter");
  await check();
  await expect(status).toContainText("✓ Correct. N has 4 bonds (+1)");
  await next();
  await next();

  // s07 Tap among (future) Draw-arrows Steps: the tap-only cue, and a drag gets the "no pushing" line.
  await at(7);
  await expect(page.getByText("Just tap, no pushing on this Step.")).toBeVisible();
  const box = (await page.locator(".tap-structure").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText(/^No pushing yet/)).toBeVisible();

  // Wrong twice → the reveal rings the answer.
  await target("Nitrogen: double bond to O, single bonds to C and O; charge +1.").click();
  await check();
  await expect(status).toContainText("N⁺ here has four bonds and no lone pair");
  await target("Single bond, C to N.").click();
  await check();
  await expect(status).toContainText("→ Answer: The lone pairs on both oxygens and the N=O π bond.");
  await expect(page.locator(".answer-ring")).toHaveCount(3);
  await next();

  // s08 Check: a Tap Problem; s09 Check: a structure-card Problem.
  await at(8);
  await target("Carbon: single bonds to H, H and H; 1 lone pair; charge −1.").click();
  await check();
  await expect(status).toContainText("✓ Correct.");
  await next();
  await at(9);
  await card(/^CH₃⁺/).click();
  await check();
  await expect(status).toContainText("✓ Correct.");
  await next();

  await at(10);
  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
});

test("every tappable atom and bond is reachable with Tab", async ({ page }) => {
  await page.goto(LESSON);
  for (const pick of ["No: it can carry charges that cancel"]) await page.getByRole("button", { name: pick }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /^CH₃⁺/ }).click();
  await page.getByRole("button", { name: /^CH₃⁻/ }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

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
