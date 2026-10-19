// Lesson 7, Resonance: Which Contributor Wins, played start to Wrap from the
// keyboard alone on a phone and on a laptop: the Hook's lengths appear only on
// reveal, both Draw-arrows Steps, the Rank of structure cards (one wrong order
// first, for its Hint), the δ+ Tap, the three Check Problems and the Wrap.
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/which-contributor-wins";
const status = (page: Page) => page.getByRole("status");
const count = (page: Page) => page.locator(".player-count");

/** Focus a control and press a key: the Student never touches the mouse. */
async function press(page: Page, target: ReturnType<Page["getByRole"]>, key = "Enter") {
  await target.focus();
  await page.keyboard.press(key);
}
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const check = (page: Page) => press(page, button(page, "Check"));
async function next(page: Page, step: number) {
  await press(page, button(page, "Continue"));
  await expect(count(page)).toHaveText(`Step ${step} of 15`);
}
const choose = (page: Page, name: string | RegExp) =>
  press(page, page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" }));
async function push(page: Page, from: string, to: string) {
  await press(page, button(page, from));
  await press(page, button(page, `Push to ${to}`));
}
const card = (page: Page, letter: string) => page.getByRole("list", { name: "Order" }).getByRole("button", { name: new RegExp(`^Card ${letter}:`) });
const tap = (page: Page, name: string) => press(page, page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name, exact: true }));

async function playLesson(page: Page, phone: boolean) {
  await page.goto(LESSON);
  await expect(count(page)).toHaveText("Step 1 of 15");

  // s01 Hook: the three C–N bonds show without lengths; any choice reveals the computed lengths.
  const scene = () => page.getByRole("img", { name: /C–N bond/ });
  await expect(scene()).toHaveAccessibleName("Methylamine, acetamide and methanimine side by side, the C–N bond highlighted in each.");
  await expect(page.locator(".scene-frame")).not.toContainText("Å");
  await choose(page, "Shorter: between single and double");
  await check(page);
  await expect(status(page)).toContainText("Acetamide's C–N is 1.36 Å (computed)");
  await expect(page.getByRole("img", { name: /^Three C–N bonds, computed\./ })).toBeVisible();
  await expect(page.locator(".scene-frame")).toContainText("C–N 1.36 Å");
  await next(page, 2);

  // s02 Draw arrows: N's lone pair in, the C=O π pair out to O.
  await push(page, "lone pair on N4", "C2–N4 bond");
  await expect(page.locator(".arrow-flags")).toContainText("C2 has 10 e⁻: something has to leave. Both arrows happen at once");
  await push(page, "π bond C2=O3", "O3");
  await expect(status(page)).toContainText("✓ Correct. C=N with N⁺ and O⁻");
  await next(page, 3);

  // s03 Explain with amide-hybrid.
  await expect(page.getByRole("img", { name: /^Acetamide's neutral drawing is tagged major/ })).toBeVisible();
  await next(page, 4);

  // s04: the neutral card.
  await choose(page, /^CH₃–C\(=O\)–NH₂, no charges/);
  await check(page);
  await expect(status(page)).toContainText("No charges beats two.");
  await next(page, 5);

  // s05 Explain: the four rules as a list, and the ladder.
  await expect(page.locator(".explain-text ol li")).toHaveCount(4);
  await expect(page.getByRole("img", { name: /^Rule one, full octets\./ })).toBeVisible();
  await next(page, 6);

  // s06: a wrong pick first (its Hint), then O⁺=CH₂.
  await choose(page, /^CH₃–O–CH₂⁺/);
  await check(page);
  await expect(status(page)).toContainText("Count the electrons around the CH₂ carbon in each drawing.");
  await choose(page, /^CH₃–O⁺=CH₂/);
  await check(page);
  await expect(status(page)).toContainText("Rule 1 first.");
  await next(page, 7);

  // s07 Draw arrows: the enolate's charge onto carbon.
  await push(page, "lone pair on O4", "C2–O4 bond");
  await push(page, "π bond C1=C2", "C1");
  await expect(status(page)).toContainText("Now the − sits on the CH₂ carbon");
  await next(page, 8);

  // s08: − on oxygen.
  await choose(page, /^CH₂=C\(CH₃\)–O⁻/);
  await check(page);
  await expect(status(page)).toContainText("rule 3 decides");
  await next(page, 9);

  // s09 Rank (signature): the start order puts c above a, which gets the rule 1 Hint; then a, b, c.
  await expect(page.getByRole("list", { name: "Order" }).getByRole("button")).toHaveCount(3);
  await check(page);
  await expect(status(page)).toContainText("gives every atom an octet and has no charges");
  await press(page, card(page, "a"), "ArrowUp");
  await press(page, card(page, "b"), "ArrowUp");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct. Neutral on top");
  // Each card now says which rule placed it.
  await expect(card(page, "c")).toHaveAccessibleName(/rule 4: charges far apart$/);
  await expect(page.locator(".rank-tag")).toHaveText(["rule 1: octets", "rule 4: charges adjacent", "rule 4: charges far apart"]);
  await next(page, 10);

  // s10 Explain: carbonyl-sites.
  await expect(page.getByRole("img", { name: /^Acetone's C=O and C⁺–O⁻ drawings merge/ })).toBeVisible();
  await next(page, 11);

  // s11 Tap (tap-only): C1 and C3.
  await expect(page.locator(".tap-only-cue")).toHaveText("Just tap, no pushing on this Step.");
  await tap(page, "Carbon: double bond to C.");
  await tap(page, "Carbon: double bond to O, single bond to C.");
  await check(page);
  await expect(status(page)).toContainText("Two δ+ carbons");
  await next(page, 12);

  // s12 Check: N,N-dimethylaniline, the neutral card.
  await choose(page, /^The neutral drawing/);
  await check(page);
  await expect(status(page)).toContainText("rule 2 decides");
  await next(page, 13);

  // s13 Check: the enamine's δ− carbon; the reveal replays the two pushes.
  await tap(page, "Carbon: double bond to C.");
  await check(page);
  await expect(status(page)).toContainText("C1 is the electron-rich carbon.");
  await expect(page.getByRole("img", { name: /^Arrows: lone pair on N3/ })).toBeVisible();
  await next(page, 14);

  // s14 Check: four structure cards, c a d b → a b c d.
  await expect(page.getByRole("list", { name: "Order" }).getByRole("button")).toHaveCount(4);
  await press(page, card(page, "a"), "ArrowUp");
  await press(page, card(page, "b"), "ArrowUp");
  await press(page, card(page, "b"), "ArrowUp");
  await check(page);
  await expect(status(page)).toContainText("✓ Correct. Every card has two charges");
  await next(page, 15);

  // s15 Wrap: the hybrid's final frame, paused (on a phone the key idea card stands in for it); the key idea and Back to Unit.
  const wrapScene = page.getByRole("img", { name: /^Acetamide's hybrid: the neutral drawing is major/ });
  if (phone) await expect(wrapScene).toBeHidden();
  else {
    await expect(wrapScene).toBeVisible();
    await expect(button(page, "Play")).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Unit" })).toBeVisible();
}

test("a Student plays Lesson 7 from the keyboard on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await playLesson(page, true);
});

test("a Student plays Lesson 7 from the keyboard on a laptop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await playLesson(page, false);
});

test("Lesson 7's page carries no answers, and its Source notes credit MIT OCW", async ({ page, request }) => {
  const html = await (await request.get(LESSON)).text();
  for (const secret of ["No charges beats two.", "Neutral on top (rules 1 and 2)", '"answer"', "dimethylvinylamine-polar"]) expect(html).not.toContain(secret);
  await page.goto(`${LESSON}#s05`);
  await page.getByText("ⓘ Source").click();
  await expect(page.locator(".source-note")).toContainText("Lecture 2 p. 4, 'Predicting Energies of Resonance Structures', Berkowski, Spring 2005, CC BY-NC-SA 4.0.");
});
