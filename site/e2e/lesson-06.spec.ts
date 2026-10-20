// Lesson 6: Resonance: Pushing Electrons (#84) in a browser. It plays start to
// Wrap at a phone width and a laptop width, once with the shared walk (first
// choice, first push) and once keyboard-only with the right answers, and checks
// the spec's touches: the prediction's Scene waits for the answer, the tap-only
// cue, Source notes, push-replay on success and the Lesson-end screen.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { playThrough } from "./site.ts";

const LESSON = "/organic/orgo-1/structure-bonding/resonance-pushing-electrons";
const PHONE = { width: 390, height: 844 };
const LAPTOP = { width: 1280, height: 800 };

const status = (page: Page) => page.getByRole("status");
const count = (page: Page) => page.locator(".player-count");

async function open(page: Page, step = "") {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await Promise.all([page.waitForResponse((r) => r.url().includes("/answers/")), page.goto(`${LESSON}${step && `#${step}`}`)]);
  await expect(count(page)).toHaveText(`Step ${step ? Number(step.slice(1)) : 1} of 15`);
}

/** Presses a button from the keyboard: focus it, then Enter. */
async function press(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name, exact: typeof name === "string" });
  await button.focus();
  await page.keyboard.press("Enter");
}

/** One curved arrow from the keyboard: Enter on the source, then Enter on its drop spot. */
async function push(page: Page, source: string, target: string) {
  await press(page, source);
  await expect(page.getByRole("button", { name: `Push to ${target}`, exact: true })).toBeVisible();
  await press(page, `Push to ${target}`);
}

async function next(page: Page) {
  const label = await count(page).textContent();
  await press(page, "Continue");
  await expect(count(page)).not.toHaveText(label!);
}

/** Nothing scrolls sideways, and the one bottom button is on screen. */
async function fits(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator(".player-foot .btn").first()).toBeInViewport();
}

for (const [name, size] of [["phone", PHONE], ["laptop", LAPTOP]] as const) {
  test(`plays start to Wrap on a ${name} with the shared walk`, async ({ page }) => {
    await page.setViewportSize(size);
    await open(page);
    const seen: string[] = [];
    await playThrough(page, async (label) => {
      if (!label.endsWith("feedback")) seen.push(label);
      await fits(page);
    });
    expect(seen).toContain("Step 15 of 15");
    await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
  });
}

test("keyboard only, right answers: every Step, then the Lesson-end screen", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await open(page);

  // s01: the prediction. The drawing shows; the bond-length Scene waits for the answer.
  await expect(page.getByRole("img", { name: /^Acetate, CH₃–C\(=O\)–O⁻, drawn with every lone pair/ })).toBeVisible();
  await expect(page.locator(".scene-frame")).toHaveCount(0);
  await press(page, "They're the same length");
  await press(page, "Check");
  await expect(status(page)).toContainText("Measure them and they're identical.");
  await expect(page.getByRole("img", { name: /Acetate: both C–O bonds are the same length/ })).toBeVisible();
  await page.locator(".source-note summary").click();
  await expect(page.locator(".source-note")).toContainText("Both molecules use the same method so they can be compared fairly.");
  await expect(page.locator(".source-note")).toContainText("Geometry: computed, not measured.");
  await next(page);

  // s02: Explain with formaldehyde-pi-shift and its own Source note line.
  await expect(page.getByRole("img", { name: /A curved arrow starts on the C=O π bond/ })).toBeVisible();
  await expect(page.locator(".source-note summary")).toHaveText("ⓘ Sources");
  await next(page);

  // s03: Tap, tap-only.
  await expect(page.locator(".tap-only-cue")).toHaveText("Just tap, no pushing on this Step.");
  for (const id of ["a3", "a4", "b2"]) {
    await page.locator(`[data-target="${id}"]`).focus();
    await page.keyboard.press("Enter");
  }
  await press(page, "Check");
  await expect(status(page)).toContainText("Lone pairs on both oxygens and the N=O π bond.");
  await next(page);

  // s04: formaldehyde, one push; push-replay plays in place of the card.
  await push(page, "π bond C1=O2", "O2");
  await expect(status(page)).toContainText("The π pair is now a lone pair on O");
  await expect(page.locator(".scene-frame")).toBeVisible();
  await next(page);

  // s05: the three moves.
  await expect(page.getByRole("img", { name: /Move one: the negative oxygen of acetate/ })).toBeVisible();
  await next(page);

  // s06: acetate, lone pair first: C2 is flagged until the second push.
  await push(page, "lone pair on O4", "C2–O4 bond");
  await expect(page.getByText("C has 10 e⁻: something has to leave.").first()).toBeVisible();
  await push(page, "π bond C2=O3", "O3");
  await expect(status(page)).toContainText("Two drawings, one ion.");
  await next(page);

  // s07: the hybrid.
  await expect(page.getByRole("img", { name: /The two acetate drawings merge into one/ })).toBeVisible();
  await next(page);

  // s08: allyl cation, move 3.
  await push(page, "π bond C1=C2", "C2–C3 bond");
  await expect(status(page)).toContainText("The double bond slid one position");
  await next(page);

  // s09: structure cards.
  await press(page, /^Nitromethane, CH₃–N⁺\(=O\)–O⁻, next to CH₃–N⁺\(–O⁻\)=O/);
  await press(page, "Check");
  await expect(status(page)).toContainText("Same atoms, same σ bonds; only electrons differ.");
  await next(page);

  // s10: nitromethane.
  await push(page, "lone pair on O4", "N2–O4 bond");
  await push(page, "π bond N2=O3", "O3");
  await expect(status(page)).toContainText("The real nitromethane is their hybrid.");
  await next(page);

  // s11: ozone, open (no target drawn).
  await expect(page.getByRole("figure", { name: "Target" })).toHaveCount(0);
  await push(page, "lone pair on O3", "O2–O3 bond");
  await push(page, "π bond O1=O2", "O1");
  await expect(status(page)).toContainText("The central O stays +.");
  await next(page);

  // s12: not resonance, two cards.
  await press(page, /^Allene/);
  await press(page, /^Acetone/);
  await press(page, "Check");
  await expect(status(page)).toContainText("In both, a hydrogen moved.");
  await next(page);

  // s13: oxocarbenium.
  await push(page, "π bond C4=C5", "C3–C4 bond");
  await expect(page.getByText("C5⁺, next to O. That's a valid contributor too.").first()).toBeVisible();
  await push(page, "lone pair on O6", "C5–O6 bond");
  await expect(status(page)).toContainText("the + charge ends up on O");
  await next(page);

  // s14: thiodienyl, three arrows.
  await push(page, "lone pair on C6", "C5–C6 bond");
  await push(page, "π bond C4=C5", "C2–C4 bond");
  await push(page, "π bond C2=S3", "S3");
  await expect(status(page)).toContainText("The charge travelled down the chain");
  await next(page);

  // s15: the Wrap, then the Lesson-end screen.
  await expect(page.getByText("Electrons move. Atoms don't.")).toBeVisible();
  // On a phone the Lesson-end screen leaves the Wrap's Scene out (the laptop test below shows it).
  // The Wrap is the Lesson-end screen: key idea, then Back to Unit (no Next Lesson until Lesson 7 lands).
  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
  await expect(page.getByText("The real molecule is the hybrid of its drawings.").last()).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Unit" })).toBeVisible();
});

test("on a laptop the Wrap shows acetate's hybrid as a still frame", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, "s15");
  await expect(page.getByRole("img", { name: "Acetate's hybrid: charge shared by both oxygens." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toHaveCount(0);
});

test("a drag on the tap-only Step shows the no-pushing message", async ({ page }) => {
  await open(page, "s03");
  const box = (await page.locator(".tap-layer").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".tap-only-cue")).toHaveText(
    "No pushing yet: this Step only asks where electrons could come from. Tap each lone pair or bond you think is a source.",
  );
});

test("the Lesson page passes axe on its Draw-arrows and structure-card Steps", async ({ page }) => {
  for (const step of ["s06", "s12"]) {
    await open(page, step);
    const results = await new AxeBuilder({ page }).include(".player").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ") + " " + n.failureSummary).join(" | ")}`), step).toEqual([]);
  }
});
