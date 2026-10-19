// The Practice Set at the end of Unit 1: drawn from the Bank, played with the
// Lessons' two-try feedback, then the summary, Retry missed and Next Unit.
// The Bank holds the 8 approved sample Problems and Lesson 2's 4 Check Problems,
// so the draw is 10 of the 12 (at least one per core Lesson; which ones is random).
// Each drawn Problem is recognised by its "Report a mistake" target and played
// by plan: right first try, right on the second try, or missed (two wrong tries),
// and the summary and Retry missed are checked against that plan.
import { expect, test, type Page } from "@playwright/test";

const UNIT = "/organic/orgo-1/structure-bonding";
const PRACTICE = `${UNIT}/practice`;
const SET_SIZE = 10;

const choose = (page: Page, name: string | RegExp) =>
  page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" }).click();
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();
const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();
const at = (page: Page, n: number, of: number) => expect(page.getByText(`Problem ${n} of ${of}`)).toBeVisible();
const status = (page: Page) => page.getByRole("status");
const type = (page: Page, value: string) => page.getByRole("textbox", { name: "Answer" }).fill(value);

/** Draw-arrows: pick a source, then where it lands, by keyboard. */
async function push(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: from, exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: `Push to ${to}`, exact: true }).focus();
  await page.keyboard.press("Enter");
}

type Outcome = "first" | "second" | "missed";
interface Plan {
  outcome: Outcome;
  play: (page: Page) => Promise<void>;
  /** Missed Problems: the right answer, played in Retry missed. */
  retry?: (page: Page) => Promise<void>;
}

const right = async (page: Page) => expect(status(page)).toContainText("✓ Correct.");

const plans: Record<string, Plan> = {
  "u1-sample-p1": { outcome: "first", play: async (p) => (await choose(p, "2"), await check(p), await right(p)) },
  "u1-sample-p2": {
    outcome: "missed",
    play: async (p) => {
      await choose(p, "CH₄");
      await check(p);
      await expect(status(p)).toContainText("Methane has four C–H bonds");
      await choose(p, "CH₂O");
      await check(p);
      await expect(status(p)).toContainText("→ Answer:");
    },
    retry: async (p) => (await choose(p, "CH₅"), await check(p), await right(p)),
  },
  "u1-sample-p3": { outcome: "first", play: async (p) => (await type(p, "6"), await check(p), await right(p)) },
  "u1-sample-p4": {
    outcome: "missed",
    play: async (p) => {
      await check(p);
      await check(p);
      await expect(status(p)).toContainText("→ Answer:");
    },
    retry: async (p) => {
      const methane = p.getByRole("list", { name: "Order" }).getByRole("button", { name: "methane, CH₄" });
      await methane.focus();
      await p.keyboard.press("ArrowDown");
      await p.keyboard.press("ArrowDown");
      await check(p);
      await right(p);
    },
  },
  "u1-sample-p5": {
    outcome: "first",
    play: async (p) => {
      await p.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name: /^Carbon/ }).click();
      await check(p);
      await right(p);
    },
  },
  "u1-sample-p6": { outcome: "first", play: async (p) => (await choose(p, /^CH₃⁺/), await check(p), await right(p)) },
  // Draw arrows, graded push by push. Ozone: one wrong push (its Hint), then both right.
  "u1-sample-arrows-p1": {
    outcome: "second",
    play: async (p) => {
      await push(p, "π bond O1=O2", "O2");
      await expect(status(p)).toContainText("That leaves the end oxygen with only 6 electrons.");
      await push(p, "lone pair on O3", "O2–O3 bond");
      await push(p, "π bond O1=O2", "O1");
      await right(p);
    },
  },
  "u1-sample-arrows-p2": {
    outcome: "first",
    play: async (p) => (await push(p, "lone pair on C4", "C4–C5 bond"), await push(p, "π bond C5=O6", "O6"), await right(p)),
  },
  // Lesson 2's Check Problems.
  "u1-draw-n2-kekule": {
    outcome: "first",
    play: async (p) => (await choose(p, "N triple-bonded to N; one lone pair on each N"), await check(p), await right(p)),
  },
  "u1-draw-acrylonitrile": {
    outcome: "first",
    play: async (p) => {
      await choose(p, "CH₂ double-bonded to CH, single-bonded to C, triple-bonded to N; one lone pair on N");
      await check(p);
      await right(p);
    },
  },
  "u1-draw-acetaminophen-lone-pairs": { outcome: "first", play: async (p) => (await type(p, "5"), await check(p), await right(p)) },
  "u1-draw-limonene-h": { outcome: "first", play: async (p) => (await type(p, "16"), await check(p), await right(p)) },
};

/** The Problem on screen, from its "Report a mistake" link. */
async function problemOnScreen(page: Page): Promise<string> {
  const href = (await page.getByRole("link", { name: "Report a mistake" }).getAttribute("href")) ?? "";
  return new URL(href, "http://x").searchParams.get("target") ?? "";
}

test("the Unit page's Practice Set row opens the Practice Set", async ({ page }) => {
  await page.goto(UNIT);
  const row = page.getByRole("listitem").filter({ hasText: "Unit review" });
  await expect(row).toContainText("Not started");
  await row.getByRole("link", { name: "Practice Set" }).click();
  await expect(page).toHaveURL(PRACTICE);
  await at(page, 1, SET_SIZE);
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

  const played: string[] = [];
  for (let n = 1; n <= SET_SIZE; n++) {
    await at(page, n, SET_SIZE);
    const id = await problemOnScreen(page);
    expect(Object.keys(plans), `Problem ${n} is ${id}`).toContain(id);
    await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute(
      "href",
      `/submit?kind=mistake&unit=u1&target=${id}`,
    );
    await plans[id].play(page);
    played.push(id);
    if (n < SET_SIZE) await next(page);
  }
  // Every core Lesson is covered: Lesson 2 has at least one Problem in the Set.
  expect(played.some((id) => id.startsWith("u1-draw-"))).toBe(true);
  await page.getByRole("button", { name: "See results" }).click();

  // Summary: first-try %, eventually correct, n/N, as planned.
  const first = played.filter((id) => plans[id].outcome === "first").length;
  const eventually = played.filter((id) => plans[id].outcome !== "missed").length;
  const missed = played.filter((id) => plans[id].outcome === "missed");
  const summary = page.getByRole("region", { name: "Practice Set results" });
  await expect(summary).toContainText(`First try: ${first}/${SET_SIZE} (${Math.round((100 * first) / SET_SIZE)}%)`);
  await expect(summary).toContainText(`Eventually correct: ${eventually}/${SET_SIZE}`);
  await expect(summary.getByRole("link", { name: "Suggest a Problem" })).toHaveAttribute("href", "/submit?kind=problem&unit=u1");
  // Unit 2 is coming soon, so Next Unit goes to the Course map.
  await expect(summary.getByRole("link", { name: "Next Unit" })).toHaveAttribute("href", "/organic");

  // Retry missed: exactly the missed Problems, in Set order.
  if (missed.length) {
    await summary.getByRole("button", { name: `Retry missed (${missed.length})` }).click();
    for (const [i, id] of missed.entries()) {
      await at(page, i + 1, missed.length);
      expect(await problemOnScreen(page)).toBe(id);
      await plans[id].retry!(page);
      if (i < missed.length - 1) await next(page);
    }
    await page.getByRole("button", { name: "See results" }).click();
    await expect(summary).toContainText(`First try: ${missed.length}/${missed.length} (100%)`);
    await expect(summary.getByRole("button", { name: /Retry missed/ })).toHaveCount(0);
  }

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
