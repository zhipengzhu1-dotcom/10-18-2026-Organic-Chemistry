// The Practice Set at the end of Unit 1: drawn from the Bank, played with the
// Lessons' two-try feedback, then the summary, Retry missed and Next Unit.
// The Bank has 12 approved Problems (8 samples + Lesson 6's four Check Problems), so a Set
// draws 10. Math.random is pinned (the shuffle keeps Bank order), so the draw is fixed: every
// sample, easy to hard, then in Lesson order: p1, p2 (u1-sample), p3, p4 (step types), p5, p6
// (structures), u1-sample-arrows-p1 (ozone); then difficulty 2: u1-sample-arrows-p2,
// u1-res-not-resonance and u1-res-oxocarbenium (Lesson 6).
import { expect, test, type Page } from "@playwright/test";

const UNIT = "/organic/orgo-1/structure-bonding";
const PRACTICE = `${UNIT}/practice`;

const choose = (page: Page, name: string | RegExp) =>
  page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" }).click();
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();
const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();
const at = (page: Page, n: number, of: number) => expect(page.getByText(`Problem ${n} of ${of}`)).toBeVisible();
const status = (page: Page) => page.getByRole("status");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.9999;
  });
});

test("the Unit page's Practice Set row opens the Practice Set", async ({ page }) => {
  await page.goto(UNIT);
  const row = page.getByRole("listitem").filter({ hasText: "Unit review" });
  await expect(row).toContainText("Not started");
  await row.getByRole("link", { name: "Practice Set" }).click();
  await expect(page).toHaveURL(PRACTICE);
  await at(page, 1, 10);
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

  // p1 right first try; each Problem has its own Report a mistake link.
  await at(page, 1, 10);
  await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute(
    "href",
    "/submit?kind=mistake&unit=u1&target=u1-sample-p1",
  );
  await choose(page, "2");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // p2 wrong twice: the Hint, then the reveal.
  await at(page, 2, 10);
  await choose(page, "CH₄");
  await check(page);
  await expect(status(page)).toContainText("Methane has four C–H bonds");
  await choose(page, "CH₂O");
  await check(page);
  await expect(status(page)).toContainText("→ Answer:");
  await next(page);

  // p3 numeric, right first try.
  await at(page, 3, 10);
  await page.getByRole("textbox", { name: "Answer" }).fill("6");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // p4 rank: the start order, twice, is wrong.
  await at(page, 4, 10);
  await check(page);
  await check(page);
  await expect(status(page)).toContainText("→ Answer:");
  await next(page);

  // p5 tap the carbon; p6 the CH₃⁺ card.
  await at(page, 5, 10);
  await page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name: /^Carbon/ }).click();
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);
  await at(page, 6, 10);
  await choose(page, /^CH₃⁺/);
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // Draw-arrows Problems are graded push by push. Ozone: one wrong push (its Hint), then both
  // right: eventually correct, but not first try. Acetylacetonate (open): right first try.
  const push = async (from: string, to: string) => {
    await page.getByRole("button", { name: from, exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: `Push to ${to}`, exact: true }).focus();
    await page.keyboard.press("Enter");
  };
  await at(page, 7, 10);
  await push("π bond O1=O2", "O2");
  await expect(status(page)).toContainText("That leaves the end oxygen with only 6 electrons.");
  await push("lone pair on O3", "O2–O3 bond");
  await push("π bond O1=O2", "O1");
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);
  await at(page, 8, 10);
  await push("lone pair on C4", "C4–C5 bond");
  await push("π bond C5=O6", "O6");
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);

  // Lesson 6's Check Problems, right first try: two structure cards, then the oxocarbenium.
  await at(page, 9, 10);
  await choose(page, /^Allene/);
  await choose(page, /^Acetone/);
  await check(page);
  await expect(status(page)).toContainText("✓ Correct.");
  await next(page);
  await at(page, 10, 10);
  await push("lone pair on O6", "C5–O6 bond");
  await push("π bond C4=C5", "C3–C4 bond");
  await expect(status(page)).toContainText("✓ Correct.");
  await page.getByRole("button", { name: "See results" }).click();

  // Summary: first-try %, eventually correct, n/N.
  const summary = page.getByRole("region", { name: "Practice Set results" });
  await expect(summary).toContainText("First try: 7/10 (70%)");
  await expect(summary).toContainText("Eventually correct: 8/10");
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
