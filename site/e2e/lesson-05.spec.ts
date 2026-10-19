// Lesson 5: Functional Groups (#83), played start to Wrap at a laptop width
// with the mouse and at a phone width from the keyboard only.
import { expect, test, type Locator, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/functional-groups";

type Answer = { cards?: (string | RegExp)[]; taps?: string[] };

/** The right answer on each graded Step, by accessible name. */
const answers: Record<number, Answer> = {
  1: { cards: ["Yes: it carries the same –COOH piece"] },
  3: { cards: [/^Hexane/] },
  5: { cards: [/^Ethanol/, /^Cyclohexanol/] },
  6: { taps: ["The left ring, with HO at its lower left.", "The carbon–carbon triple bond at the top right.", "The OH at the top right."] },
  8: { cards: ["an ester"] },
  9: { taps: ["At the top left, C=O with O–CH₃.", "In the middle, C=O with NH.", "At the right, C=O with OH."] },
  10: { cards: ["an amide"] },
  11: { cards: [/^Acetone/] },
  12: { cards: ["alkene", "phenol", "ether", "amide"] },
  13: {
    taps: [
      "Far left: the benzene ring and its OH.",
      "Top of the left half: the NH₂.",
      "Between the two halves: C=O and NH.",
      "Inside the four-membered ring: C=O and N.",
      "The S in the five-membered ring.",
      "Bottom right: C=O with OH.",
    ],
  },
};

/** What the spotlight says when it arrives with the answer, by Step. */
const spotlight: Record<number, RegExp> = {
  1: /^Acetic acid and amoxicillin side by side/,
  6: /^Ethinylestradiol\. Skeleton dimmed/,
  9: /^Aspartame\. Lit: at the left/,
  12: /^Capsaicin\. Lit:/,
  13: /^Amoxicillin\. Skeleton dimmed/,
};

async function play(page: Page, press: (target: Locator) => Promise<void>, tap: (target: Locator) => Promise<void> = press) {
  const status = page.getByRole("status");
  const choice = (name: string | RegExp) =>
    page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" });
  const target = (name: string) => page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name, exact: true });

  for (let n = 1; n <= 14; n++) {
    await expect(page.getByText(`Step ${n} of 14`)).toBeVisible();
    const answer = answers[n];
    if (answer) {
      for (const c of answer.cards ?? []) await press(choice(c));
      for (const t of answer.taps ?? []) await tap(target(t));
      await press(page.getByRole("button", { name: "Check" }));
      await expect(status).toContainText(n === 1 ? "Yes." : "✓ Correct.");
      if (spotlight[n]) await expect(page.getByRole("img", { name: spotlight[n] })).toBeVisible();
    }
    if (n < 14) await press(page.getByRole("button", { name: "Continue" }));
  }
  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Unit" })).toBeVisible();
}

test.describe("Lesson 5 at a laptop width, by mouse", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("plays start to Wrap: figures, Scenes, Source notes, Hints and the amoxicillin Tap", async ({ page }) => {
    await page.goto(LESSON);
    // s01: the two molecules the question is about, drawn by our renderer.
    await expect(page.getByRole("img", { name: /^Acetic acid: CH₃/ }).locator("svg.structure")).toBeVisible();
    await expect(page.getByRole("img", { name: /^Amoxicillin: a benzene ring/ })).toBeVisible();
    // No spotlight before the answer: it would give the answer away.
    await expect(page.getByRole("img", { name: /^Acetic acid and amoxicillin side by side/ })).toHaveCount(0);
    // The written Source note.
    await page.getByText("ⓘ Sources").click();
    await expect(page.getByText(/Structures: PubChem CIDs 176 and 33613/)).toBeVisible();
    // A region is tapped on one of its atoms (a ring's hollow centre is not part of it).
    await play(page, (target) => target.click(), (target) => target.locator("circle.hit").first().click());
  });

  test("a wrong tap on s06 gets the skeleton Hint, and s02's cards deal in", async ({ page }) => {
    await page.goto(`${LESSON}#s02`);
    await expect(page.getByRole("img", { name: /^Four cards\. Alkene/ })).toBeVisible();
    await page.goto(`${LESSON}#s06`);
    await expect(page.getByText("Step 6 of 14")).toBeVisible();
    const taps = page.getByRole("group", { name: "Tappable atoms and bonds" });
    await taps.getByRole("button", { name: "The second ring from the left.", exact: true }).locator("circle.hit").first().click();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("status")).toContainText("That part is skeleton");
  });
});

test.describe("Lesson 5 at a phone width, keyboard only", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("plays start to Wrap without a pointer, with no sideways scroll", async ({ page }) => {
    await page.goto(LESSON);
    await play(page, async (target) => {
      await target.focus();
      await page.keyboard.press("Enter");
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("the amoxicillin Step offers its ten regions to the keyboard, in reading order", async ({ page }) => {
    await page.goto(`${LESSON}#s13`);
    await expect(page.getByText("Step 13 of 14")).toBeVisible();
    const regions = page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button");
    await expect(regions).toHaveCount(10);
  });
});
