import { expect, test } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/sample-carbons-four-bonds";

test("a Student clicks through the sample Lesson from the home page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sample: Carbon's Four Bonds" }).click();
  await expect(page).toHaveURL(LESSON);
  await expect(page).toHaveTitle("Sample: Carbon's Four Bonds · Structure & Bonding · AstraTron");

  const status = page.getByRole("status");
  const choose = (name: string) => page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: true }).click();
  const check = () => page.getByRole("button", { name: "Check" }).click();
  const next = () => page.getByRole("button", { name: "Continue" }).click();
  const at = (n: number) => expect(page.getByText(`Step ${n} of 10`)).toBeVisible();

  // s01 Hook prediction: any guess is accepted and the reveal follows at once.
  await at(1);
  await choose("2");
  await check();
  await expect(status).toContainText("→ Answer: Four.");
  await next();

  // s02 Explain
  await at(2);
  await next();

  // s03: wrong once → the Hint for that wrong answer, then right → Correct line.
  await at(3);
  await choose("3");
  await check();
  await expect(status).toContainText("✗ Not quite. Count again from the formula.");
  await choose("4");
  await check();
  await expect(status).toContainText("✓ Correct. Four C–H bonds");
  await next();

  // s04, s05 Explain
  await next();
  await next();

  // s06: wrong twice → the reveal.
  await at(6);
  await choose("3");
  await check();
  await expect(status).toContainText("Don't forget the bond joining the two carbons.");
  await choose("5");
  await check();
  await expect(status).toContainText("→ Answer: Four: each carbon has three C–H bonds");
  await next();

  // s07 Explain
  await next();

  // s08, s09: Check Problems from the Bank.
  await at(8);
  await choose("2");
  await check();
  await expect(status).toContainText("✓ Correct.");
  await next();
  await at(9);
  await choose("CH₅");
  await check();
  await expect(status).toContainText("✓ Correct.");
  await next();

  // s10 Wrap: the Lesson is done and shows its key idea.
  await at(10);
  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
  await page.getByRole("link", { name: "Finish" }).click();
  await expect(page).toHaveURL("/");
});
