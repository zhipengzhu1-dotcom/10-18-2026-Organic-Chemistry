// The Practice Set at the end of Unit 1: drawn from the Bank, played with the
// Lessons' two-try feedback, then the summary, Retry missed and Next Unit.
// The Bank holds more Problems than a Set (10), and the draw is random, so the
// walk-through reads which Problem is on screen (its Report a mistake link names
// it) and answers it with that Problem's solver; the expected summary follows
// from what was drawn.
import { expect, test, type Page } from "@playwright/test";

const UNIT = "/organic/orgo-1/structure-bonding";
const PRACTICE = `${UNIT}/practice`;
const SET = 10;

const choose = (page: Page, name: string | RegExp) =>
  page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" }).click();
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();
const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();
const at = (page: Page, n: number, of: number) => expect(page.getByText(`Problem ${n} of ${of}`)).toBeVisible();
const status = (page: Page) => page.getByRole("status");
const correct = (page: Page) => expect(status(page)).toContainText("✓ Correct.");

/** The Problem on screen, from its Report a mistake link. */
async function problemOnScreen(page: Page): Promise<string> {
  const href = await page.getByRole("link", { name: "Report a mistake" }).getAttribute("href");
  return new URL(href!, "http://site").searchParams.get("target")!;
}

/** Draw-arrows: push from a source to a drop spot, by keyboard. */
async function push(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: from, exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: `Push to ${to}`, exact: true }).focus();
  await page.keyboard.press("Enter");
}

/** Moves a Rank card by keyboard. */
async function move(page: Page, card: string, key: "ArrowUp" | "ArrowDown", times: number) {
  await page.getByRole("list", { name: "Order" }).getByRole("button", { name: card, exact: true }).focus();
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

type Outcome = "first" | "eventually" | "missed";
/** How the walk-through answers each Bank Problem, and how that Problem ends. */
const solvers: Record<string, { outcome: Outcome; play: (page: Page) => Promise<void> }> = {
  "u1-sample-p1": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "2");
      await check(page);
      await correct(page);
    },
  },
  // Wrong twice: the Hint, then the reveal.
  "u1-sample-p2": {
    outcome: "missed",
    play: async (page) => {
      await choose(page, "CH₄");
      await check(page);
      await expect(status(page)).toContainText("Methane has four C–H bonds");
      await choose(page, "CH₂O");
      await check(page);
      await expect(status(page)).toContainText("→ Answer:");
    },
  },
  "u1-sample-p3": {
    outcome: "first",
    play: async (page) => {
      await page.getByRole("textbox", { name: "Answer" }).fill("6");
      await check(page);
      await correct(page);
    },
  },
  // Rank: the start order, twice, is wrong.
  "u1-sample-p4": {
    outcome: "missed",
    play: async (page) => {
      await check(page);
      await check(page);
      await expect(status(page)).toContainText("→ Answer:");
    },
  },
  "u1-sample-p5": {
    outcome: "first",
    play: async (page) => {
      await page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name: /^Carbon/ }).click();
      await check(page);
      await correct(page);
    },
  },
  "u1-sample-p6": {
    outcome: "first",
    play: async (page) => {
      await choose(page, /^CH₃⁺/);
      await check(page);
      await correct(page);
    },
  },
  // Rotate-and-identify 3D (#68), graded like Multiple choice: formaldehyde is flat, ammonia a pyramid.
  "u1-sample-p7": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "Flat");
      await check(page);
      await correct(page);
    },
  },
  "u1-sample-p8": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "A pyramid");
      await check(page);
      await correct(page);
    },
  },
  // Draw arrows, graded push by push. Ozone: one wrong push (its Hint), then both right.
  "u1-sample-arrows-p1": {
    outcome: "eventually",
    play: async (page) => {
      await push(page, "π bond O1=O2", "O2");
      await expect(status(page)).toContainText("That leaves the end oxygen with only 6 electrons.");
      await push(page, "lone pair on O3", "O2–O3 bond");
      await push(page, "π bond O1=O2", "O1");
      await correct(page);
    },
  },
  // Acetylacetonate (open): right first try.
  "u1-sample-arrows-p2": {
    outcome: "first",
    play: async (page) => {
      await push(page, "lone pair on C4", "C4–C5 bond");
      await push(page, "π bond C5=O6", "O6");
      await correct(page);
    },
  },
  // Lesson 1's Check Problems.
  "u1-bond-polarity-rank": {
    outcome: "first",
    play: async (page) => {
      await move(page, "C–H", "ArrowUp", 1);
      await move(page, "C–Cl", "ArrowUp", 2);
      await check(page);
      await correct(page);
    },
  },
  "u1-fc-oxygen-three-bonds": {
    outcome: "first",
    play: async (page) => {
      await page.getByRole("textbox", { name: "Answer" }).fill("+1");
      await check(page);
      await correct(page);
    },
  },
  "u1-fc-unreasonable": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "Nitrogen with three single bonds and one double bond.");
      await check(page);
      await correct(page);
    },
  },
  // Lesson 5's Check Problems; capsaicin and amoxicillin show their reveal Scene with the answer.
  "u1-fg-ketone": {
    outcome: "first",
    play: async (page) => {
      await choose(page, /^Acetone/);
      await check(page);
      await correct(page);
    },
  },
  "u1-fg-capsaicin": {
    outcome: "first",
    play: async (page) => {
      for (const group of ["alkene", "phenol", "ether", "amide"]) await choose(page, group);
      await check(page);
      await correct(page);
      await expect(page.getByRole("img", { name: /^Capsaicin\. Lit:/ })).toBeVisible();
    },
  },
  "u1-fg-amoxicillin": {
    outcome: "first",
    play: async (page) => {
      const taps = page.getByRole("group", { name: "Tappable atoms and bonds" });
      for (const region of [/^Far left/, /^Top of the left half/, /^Between the two halves/, /^Inside the four-membered/, /^The S in/, /^Bottom right/])
        await taps.getByRole("button", { name: region }).locator("circle.hit").first().click();
      await check(page);
      await correct(page);
    },
  },
  // Lesson 2's Check Problems.
  "u1-draw-n2-kekule": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "N triple-bonded to N; one lone pair on each N");
      await check(page);
      await correct(page);
    },
  },
  "u1-draw-acrylonitrile": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "CH₂ double-bonded to CH, single-bonded to C, triple-bonded to N; one lone pair on N");
      await check(page);
      await correct(page);
    },
  },
  "u1-draw-acetaminophen-lone-pairs": {
    outcome: "first",
    play: async (page) => {
      await page.getByRole("textbox", { name: "Answer" }).fill("5");
      await check(page);
      await correct(page);
    },
  },
  "u1-draw-limonene-h": {
    outcome: "first",
    play: async (page) => {
      await page.getByRole("textbox", { name: "Answer" }).fill("16");
      await check(page);
      await correct(page);
    },
  },
  // Lesson 3's Check Problems (#81).
  "u1-3d-flat-or-pyramid": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "BF₃ only");
      await check(page);
      await correct(page);
    },
  },
  "u1-3d-perspective": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "CH₃ on the dash, CH₂CH₃ on the wedge");
      await check(page);
      await correct(page);
    },
  },
  "u1-3d-polar-molecules": {
    outcome: "first",
    play: async (page) => {
      for (const name of ["H₂O: bent, two lines.", "CH₂Cl₂: two Cl lines, an H wedge and an H dash.", "NH₃: lone pair up; one H line, one wedge, one dash."])
        await choose(page, name);
      await check(page);
      await correct(page);
    },
  },
  // Lesson 6's Check Problems: Draw arrows (ozone open), structure-card pairs.
  "u1-res-ozone": {
    outcome: "first",
    play: async (page) => {
      await push(page, "lone pair on O3", "O2–O3 bond");
      await push(page, "π bond O1=O2", "O1");
      await correct(page);
    },
  },
  "u1-res-not-resonance": {
    outcome: "first",
    play: async (page) => {
      await choose(page, /^Allene/);
      await choose(page, /^Acetone/);
      await check(page);
      await correct(page);
    },
  },
  "u1-res-oxocarbenium": {
    outcome: "first",
    play: async (page) => {
      await push(page, "π bond C4=C5", "C3–C4 bond");
      await push(page, "lone pair on O6", "C5–O6 bond");
      await correct(page);
    },
  },
  "u1-res-thiodienyl": {
    outcome: "first",
    play: async (page) => {
      await push(page, "lone pair on C6", "C5–C6 bond");
      await push(page, "π bond C4=C5", "C2–C4 bond");
      await push(page, "π bond C2=S3", "S3");
      await correct(page);
    },
  },
  // Lesson 7's Check Problems; the enamine's reveal replays the two pushes in place of the drawing.
  "u1-res-major-dimethylaniline": {
    outcome: "first",
    play: async (page) => {
      await choose(page, /^The neutral drawing/);
      await check(page);
      await correct(page);
    },
  },
  "u1-res-enamine-site": {
    outcome: "first",
    play: async (page) => {
      await page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name: "Carbon with 2 H: double bond to C.", exact: true }).click();
      await check(page);
      await correct(page);
      await expect(page.getByRole("img", { name: /^Arrows: lone pair on N3/ })).toBeVisible();
    },
  },
  // Wrong order first (the Hint for a 6-electron card on top), then a, b, c, d.
  "u1-res-rank-methoxyacrylonitrile": {
    outcome: "eventually",
    play: async (page) => {
      await check(page);
      await expect(status(page)).toContainText("each have a carbon with only 6 electrons");
      await move(page, "Card a: CH₃–O⁺=CH–CH=C=N⁻. + on oxygen, − on N.", "ArrowUp", 1);
      await move(page, "Card b: CH₃–O⁺=CH–CH⁻–C≡N. + on oxygen, − on the middle carbon.", "ArrowUp", 2);
      await check(page);
      await correct(page);
    },
  },
};

test("the Unit page's Practice Set row opens the Practice Set", async ({ page }) => {
  await page.goto(UNIT);
  const row = page.getByRole("listitem").filter({ hasText: "Unit review" });
  await expect(row).toContainText("Not started");
  await row.getByRole("link", { name: "Practice Set" }).click();
  await expect(page).toHaveURL(PRACTICE);
  await at(page, 1, SET);
});

test("the Practice Set page's HTML carries no answers", async ({ request }) => {
  const html = await (await request.get(PRACTICE)).text();
  expect(html).toContain("How many of carbon");
  for (const secret of ["Two C–H bonds plus a double bond make four.", "Three is the number of bonds.", '"answer"']) {
    expect(html).not.toContain(secret);
  }
});

test("a Student plays the Set, sees the summary, retries exactly the missed Problems and earns the Streak", async ({ page }) => {
  test.setTimeout(90_000);
  // Pin the draw: with 30+ Problems a random Set often holds none of the missed-outcome samples, and the
  // Retry missed half of this test then has nothing to do. At 0.5 the Set holds u1-sample-p2 and -p4.
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto(PRACTICE);

  const drawn: string[] = [];
  for (let n = 1; n <= SET; n++) {
    await at(page, n, SET);
    const id = await problemOnScreen(page);
    expect(solvers[id], `a solver for ${id}`).toBeDefined();
    // Each Problem has its own Report a mistake link.
    await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute(
      "href",
      `/submit?kind=mistake&unit=u1&target=${id}`,
    );
    drawn.push(id);
    await solvers[id].play(page);
    if (n < SET) await next(page);
  }
  expect(new Set(drawn).size).toBe(SET);
  await page.getByRole("button", { name: "See results" }).click();

  // Summary: first-try %, eventually correct, n/N.
  const count = (o: Outcome[]) => drawn.filter((id) => o.includes(solvers[id].outcome)).length;
  const first = count(["first"]);
  const eventually = count(["first", "eventually"]);
  const summary = page.getByRole("region", { name: "Practice Set results" });
  await expect(summary).toContainText(`First try: ${first}/${SET} (${Math.round((100 * first) / SET)}%)`);
  await expect(summary).toContainText(`Eventually correct: ${eventually}/${SET}`);
  await expect(summary.getByRole("link", { name: "Suggest a Problem" })).toHaveAttribute("href", "/submit?kind=problem&unit=u1");
  // Unit 2 is coming soon, so Next Unit goes to the Course map.
  await expect(summary.getByRole("link", { name: "Next Unit" })).toHaveAttribute("href", "/organic");

  // Retry missed: exactly the missed ones, answered right this time.
  const missed = drawn.filter((id) => solvers[id].outcome === "missed");
  expect(missed.length).toBeGreaterThan(0);
  await summary.getByRole("button", { name: `Retry missed (${missed.length})` }).click();
  const retry: Record<string, (page: Page) => Promise<void>> = {
    "u1-sample-p2": async (p) => {
      await choose(p, "CH₅");
      await check(p);
    },
    "u1-sample-p4": async (p) => {
      await move(p, "methane, CH₄", "ArrowDown", 2);
      await check(p);
    },
  };
  for (let n = 1; n <= missed.length; n++) {
    await at(page, n, missed.length);
    const id = await problemOnScreen(page);
    expect(missed).toContain(id);
    await retry[id](page);
    await correct(page);
    if (n < missed.length) await next(page);
  }
  await page.getByRole("button", { name: "See results" }).click();
  await expect(summary).toContainText(`First try: ${missed.length}/${missed.length} (100%)`);
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
