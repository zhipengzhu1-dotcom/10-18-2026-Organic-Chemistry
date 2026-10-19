// The Practice Set at the end of Unit 1: drawn from the Bank, played with the
// Lessons' two-try feedback, then the summary, Retry missed and Next Unit.
// The Bank has 9 approved Problems, so the draw is all nine, easy to hard, in Lesson
// order: u1-bond-polarity-rank (Lesson 1, difficulty 1), p1, p2 (u1-sample), p3, p4
// (step types), p5, p6 (structures), then Lesson 1's u1-fc-oxygen-three-bonds and
// u1-fc-unreasonable (difficulty 2).
import { expect, test, type Page } from "@playwright/test";

const UNIT = "/organic/orgo-1/structure-bonding";
const PRACTICE = `${UNIT}/practice`;

const choose = (page: Page, name: string | RegExp) =>
  page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" }).click();
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();
const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();
const at = (page: Page, n: number, of: number) => expect(page.getByText(`Problem ${n} of ${of}`)).toBeVisible();
const status = (page: Page) => page.getByRole("status");

test("the Unit page's Practice Set row opens the Practice Set", async ({ page }) => {
  await page.goto(UNIT);
  const row = page.getByRole("listitem").filter({ hasText: "Unit review" });
  await expect(row).toContainText("Not started");
  await row.getByRole("link", { name: "Practice Set" }).click();
  await expect(page).toHaveURL(PRACTICE);
  await at(page, 1, 9);
});

test("the Practice Set page's HTML carries no answers", async ({ request }) => {
  const html = await (await request.get(PRACTICE)).text();
  expect(html).toContain("How many of carbon");
  for (const secret of ["Two C–H bonds plus a double bond make four.", "Three is the number of bonds.", '"answer"']) {
    expect(html).not.toContain(secret);
  }
});

test("a Student plays the Set, sees the summary, retries exactly the missed Problems and earns the Streak", async ({ page }) => {
  await page.goto(PRACTICE);

  // Lesson 1's bond-polarity Rank, right first try (by keyboard).
  await at(page, 1, 9);
  const order = page.getByRole("list", { name: "Order" });
  await order.getByRole("button", { name: "C–H", exact: true }).focus();
  await page.keyboard.press("ArrowUp");
  await order.getByRole("button", { name: "C–Cl", exact: true }).focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // p1 right first try; each Problem has its own Report a mistake link.
  await at(page, 2, 9);
  await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute(
    "href",
    "/submit?kind=mistake&unit=u1&target=u1-sample-p1",
  );
  await choose(page, "2");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // p2 wrong twice: the Hint, then the reveal.
  await at(page, 3, 9);
  await choose(page, "CH₄");
  await check(page);
  await expect(status(page)).toContainText("Methane has four C–H bonds");
  await choose(page, "CH₂O");
  await check(page);
  await expect(status(page)).toContainText("→ Answer:");
  await next(page);

  // p3 numeric, right first try.
  await at(page, 4, 9);
  await page.getByRole("textbox", { name: "Answer" }).fill("6");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // p4 rank: the start order, twice, is wrong.
  await at(page, 5, 9);
  await check(page);
  await check(page);
  await expect(status(page)).toContainText("→ Answer:");
  await next(page);

  // p5 tap the carbon; p6 the CH₃⁺ card.
  await at(page, 6, 9);
  await page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name: /^Carbon/ }).click();
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);
  await at(page, 7, 9);
  await choose(page, /^CH₃⁺/);
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // Lesson 1's formal-charge Problems, right first try.
  await at(page, 8, 9);
  await page.getByRole("textbox", { name: "Answer" }).fill("+1");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);
  await at(page, 9, 9);
  await choose(page, "Nitrogen with three single bonds and one double bond.");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await page.getByRole("button", { name: "See results" }).click();

  // Summary: first-try %, eventually correct, n/N.
  const summary = page.getByRole("region", { name: "Practice Set results" });
  await expect(summary).toContainText("First try: 7/9 (78%)");
  await expect(summary).toContainText("Eventually correct: 7/9");
  await expect(summary.getByRole("link", { name: "Suggest a Problem" })).toHaveAttribute("href", "/submit?kind=problem&unit=u1");
  // Unit 2 is coming soon, so Next Unit goes to the Course map.
  await expect(summary.getByRole("link", { name: "Next Unit" })).toHaveAttribute("href", "/organic");

  // Retry missed: exactly p2 and p4.
  await summary.getByRole("button", { name: "Retry missed (2)" }).click();
  await at(page, 1, 2);
  await choose(page, "CH₅");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);
  await at(page, 2, 2);
  const methane = page.getByRole("list", { name: "Order" }).getByRole("button", { name: "methane, CH₄" });
  await methane.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await page.getByRole("button", { name: "See results" }).click();
  await expect(summary).toContainText("First try: 2/2 (100%)");
  await expect(summary.getByRole("button", { name: /Retry missed/ })).toHaveCount(0);

  // Back on the Unit page: the Practice Set counts, and 3+ Problems today earned the Streak.
  await summary.getByRole("link", { name: "Back to Unit" }).click();
  await expect(page).toHaveURL(UNIT);
  await expect(page.getByRole("listitem").filter({ hasText: "Unit review" })).toContainText("Done");
  await expect(page.getByText("Practice Set done")).toBeVisible();
  await expect(page.getByRole("img", { name: "Streak: 1 day" })).toBeVisible();
});

test("the Practice Set never locks anything: every Lesson stays open without it", async ({ page }) => {
  await page.goto(UNIT);
  const lessons = page.locator("[data-lesson-id] .level-title a");
  for (const href of await lessons.evaluateAll((links) => links.map((a) => a.getAttribute("href")!))) {
    await page.goto(href);
    await expect(page.getByText(/^Step 1 of/)).toBeVisible();
  }
});
