// The Practice Set at the end of Unit 1: drawn from the Bank, played with the
// Lessons' two-try feedback, then the summary, Retry missed and Next Unit.
// Nothing here rests on random luck (#87):
// - the walk-through seeds the browser's random source, so its draw is the same every run;
// - the whole drawable Bank is played in pinned Sets (`?problems=<id>,…`, ten at a time), so every
//   Problem plays in the browser, each new Practice Problem with a Hint, its reveal, and then its
//   right answer from Retry missed.
// Each Problem on screen is read from its Report a mistake link and answered with its solver.
import { expect, test, type Page } from "@playwright/test";
import { buildContent, contentRoot } from "@astratron/content";

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
const hinted = (page: Page, text: string) => expect(status(page)).toContainText(text);
const revealed = (page: Page) => expect(status(page)).toContainText("→ Answer:");
const type = (page: Page, value: string) => page.getByRole("textbox", { name: "Answer" }).fill(value);

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

/** Taps atoms of a Tap Problem by keyboard. */
async function tapAtoms(page: Page, names: string[]) {
  const taps = page.getByRole("group", { name: "Tappable atoms and bonds" });
  for (const name of names) {
    await taps.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
  }
}

/** Taps named regions of a Tap Problem (their hit circles). */
async function tapRegions(page: Page, names: (string | RegExp)[]) {
  const taps = page.getByRole("group", { name: "Tappable atoms and bonds" });
  for (const name of names) await taps.getByRole("button", { name }).locator("circle.hit").first().click();
}

/** Moves a Rank card by keyboard. */
async function move(page: Page, card: string, key: "ArrowUp" | "ArrowDown", times: number) {
  await page.getByRole("list", { name: "Order" }).getByRole("button", { name: card, exact: true }).focus();
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

type Outcome = "first" | "eventually" | "missed";
type Play = (page: Page) => Promise<void>;
/** How the browser tests answer each Bank Problem, how that Problem ends, and (if missed) its right answer for Retry missed. */
interface Solver {
  outcome: Outcome;
  play: Play;
  retry?: Play;
}

/**
 * A Practice Problem played wrong twice: the first try shows `hint` (its spec Hint), the second
 * (`again`, else the same wrong answer again: a Hint clears the answer) the reveal; Retry missed then answers it right.
 */
function hintThenReveal(wrong: Play, hint: string, right: Play, again?: Play): Solver {
  return {
    outcome: "missed",
    play: async (page) => {
      await wrong(page);
      await check(page);
      await hinted(page, hint);
      await (again ?? wrong)(page);
      await check(page);
      await revealed(page);
    },
    retry: async (page) => {
      await right(page);
      await check(page);
    },
  };
}

const solvers: Record<string, Solver> = {
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
      await type(page, "+1");
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
      await tapRegions(page, [/^Far left/, /^Top of the left half/, /^Between the two halves/, /^Inside the four-membered/, /^The S in/, /^Bottom right/]);
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
      await type(page, "5");
      await check(page);
      await correct(page);
    },
  },
  "u1-draw-limonene-h": {
    outcome: "first",
    play: async (page) => {
      await type(page, "16");
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
  // Lesson 4's Check Problems (#82): each answered wrong twice, then right on Retry missed.
  "u1-hyb-pi-count": {
    outcome: "missed",
    play: async (page) => {
      for (const wrong of ["2", "6"]) {
        await type(page, wrong);
        await check(page);
      }
    },
    retry: async (p) => {
      await type(p, "3");
      await check(p);
    },
  },
  "u1-hyb-tap-sp2": {
    outcome: "missed",
    play: async (page) => {
      for (let i = 0; i < 2; i++) {
        await tapAtoms(page, [i === 0 ? "C3" : "C4"]);
        await check(page);
      }
    },
    retry: async (p) => {
      await tapAtoms(p, ["C1", "C2"]);
      await check(p);
    },
  },
  "u1-hyb-becl2": {
    outcome: "missed",
    play: async (page) => {
      for (const wrong of ["sp², bent, with one empty p orbital", "sp³, tetrahedral, with two lone pairs"]) {
        await choose(page, wrong);
        await check(page);
      }
    },
    retry: async (p) => {
      await choose(p, "sp, linear (model: 180°), with two empty p orbitals");
      await check(p);
    },
  },
  "u1-hyb-ketene-pi": {
    outcome: "missed",
    play: async (page) => {
      for (const wrong of ["both π bonds above and below the H–C–H plane", "both π bonds lying in the H–C–H plane"]) {
        await choose(page, wrong);
        await check(page);
      }
    },
    retry: async (p) => {
      await choose(p, "the C=C π above and below the H–C–H plane; the C=O π lying in that plane");
      await check(p);
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
  // Lesson 8's Check Problems (#86). Bond orders start He₂, H₂, He₂⁺.
  "u1-mo-bond-order-rank": {
    outcome: "first",
    play: async (page) => {
      await move(page, "H₂ (2 e⁻)", "ArrowUp", 1);
      await move(page, "He₂⁺ (3 e⁻)", "ArrowUp", 1);
      await check(page);
      await correct(page);
    },
  },
  "u1-mo-ethylene-lumo": {
    outcome: "first",
    play: async (page) => {
      await choose(page, "A: its sign flips between the two carbons, an extra node, so it's antibonding and empty");
      await check(page);
      await correct(page);
    },
  },
  "u1-mo-ether-bf3": {
    outcome: "first",
    play: async (page) => {
      await push(page, "lone pair on O2", "B4");
      await correct(page);
    },
  },

  // ── Unit 1 Practice Problems (#87): each with a spec Hint, then its reveal; right on Retry missed. ──
  // Lesson 1
  "u1-fc-bromine-two-bonds": hintThenReveal(
    (p) => type(p, "0"),
    "Bromine's usual pattern is 1 bond + 3 lone pairs.",
    (p) => type(p, "+1"),
  ),
  "u1-polarity-tap-dminus": hintThenReveal(
    (p) => tapAtoms(p, ["Borane: the B of the outlined B–H bond."]),
    "Boron sits left of carbon, and it pulls even less than hydrogen.",
    (p) =>
      tapAtoms(p, [
        "Ammonia: the N of the outlined N–H bond.",
        "Hydrogen cyanide: the N of the outlined C≡N bond.",
        "Borane: the H of the outlined B–H bond.",
        "Hydroxylamine: the O of the outlined N–O bond.",
      ]),
  ),
  "u1-fc-boron-four-bonds": hintThenReveal(
    (p) => type(p, "0"),
    "Boron's usual is 3 bonds. Here the double bond counts as 2, so it has 4.",
    (p) => type(p, "-1"),
  ),
  // Lesson 2
  "u1-draw-furan-h": hintThenReveal((p) => type(p, "8"), "Each carbon is in a double bond.", (p) => type(p, "4")),
  "u1-draw-ibuprofen-bare-carbons": hintThenReveal(
    (p) => tapAtoms(p, ["Ring corner, upper right: a double bond and a single bond in the ring."]),
    "That ring corner has two ring bonds, one of them double: 3 bonds, so 1 H.",
    (p) =>
      tapAtoms(p, [
        "Ring carbon carrying the right-hand branch: a ring double bond, a ring single bond and the branch.",
        "Ring carbon carrying the left-hand branch: a ring double bond, a ring single bond and the branch.",
        "Acid carbon: a double bond to O, a bond to OH and a bond to the chain.",
      ]),
  ),
  "u1-draw-caffeine-lone-pairs": hintThenReveal(
    (p) => type(p, "4"),
    "That's only the oxygens, or only the nitrogens. Count both kinds.",
    (p) => type(p, "8"),
  ),
  // Lesson 3
  "u1-3d-hydronium-shape": hintThenReveal(
    (p) => choose(p, "trigonal planar"),
    "Count the lone pair too: 3 bonds + 1 lone pair is 4 domains.",
    (p) => choose(p, "trigonal pyramidal"),
  ),
  "u1-3d-polar-hcn": hintThenReveal(
    async (p) => {
      for (const card of [/^CHCl₃, chloroform/, /^BF₃: a flat triangle/, /^HCN, hydrogen cyanide/]) await choose(p, card);
    },
    "BF₃ is a flat triangle with three equal B–F pulls spread evenly.",
    async (p) => {
      for (const card of [/^CHCl₃, chloroform/, /^HCN, hydrogen cyanide/]) await choose(p, card);
    },
  ),
  "u1-3d-perspective-b": hintThenReveal(
    (p) => choose(p, "CH₃ on the dash, F on the wedge"),
    "Turn the model so H points lower left and CH₂CH₃ lower right",
    (p) => choose(p, "F on the dash, CH₃ on the wedge"),
  ),
  // Lesson 4
  "u1-hyb-co2-carbon": hintThenReveal((p) => choose(p, "sp³"), "sp³ needs four groups.", (p) => choose(p, "sp")),
  "u1-hyb-carbonyl-oxygen": hintThenReveal(
    (p) => choose(p, "sp³: two bonds and two lone pairs make four"),
    "A double bond counts as one group, however many lines it has.",
    (p) => choose(p, "sp²: one bonded atom and two lone pairs make three"),
  ),
  // Allene: both plane sheets switch on, each with its own button, before the right answer.
  "u1-hyb-allene-planes": hintThenReveal(
    (p) => choose(p, "both CH₂ groups lie in the same plane"),
    "Look down the C=C=C line. Do the two H pairs line up, or cross?",
    async (p) => {
      for (const plane of ["left CH₂ plane", "right CH₂ plane"]) {
        const button = p.getByRole("button", { name: plane, exact: true });
        await expect(button).toHaveAttribute("aria-pressed", "false");
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
      }
      await choose(p, "the two CH₂ planes are at right angles");
    },
  ),
  // Lesson 5
  "u1-fg-ether": hintThenReveal((p) => choose(p, /^Ethanol/), "That O carries an H.", (p) => choose(p, /^Diethyl ether/)),
  "u1-fg-aspirin": hintThenReveal(
    (p) => choose(p, "phenol"),
    "A phenol is OH on the ring.",
    async (p) => {
      for (const group of ["carboxylic acid", "ester", "arene"]) await choose(p, group);
    },
  ),
  // Too wide for the column, so it keeps its natural size (every region ≥ 48 px) and scrolls sideways.
  "u1-fg-metenkephalin-amides": hintThenReveal(
    async (p) => {
      const box = await p.getByRole("button", { name: "Right: the S." }).boundingBox();
      expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(48);
      await tapRegions(p, ["Left end: the NH₂."]);
    },
    "That NH₂ sits on a carbon with no C=O, so it's an amine.",
    (p) =>
      tapRegions(p, [
        "The first C=O along the backbone and the NH after it.",
        "The second C=O and its NH.",
        "The third C=O and its NH.",
        "The fourth C=O and its NH.",
      ]),
  ),
  // Lesson 6: one wrong push (its Hint), then the right ones.
  "u1-res-pentadienyl-cation": {
    outcome: "eventually",
    play: async (page) => {
      await push(page, "π bond C3=C4", "C3");
      await hinted(page, "That parks the pair on one carbon and leaves two C⁺.");
      await push(page, "π bond C3=C4", "C4–C5 bond");
      await correct(page);
    },
  },
  "u1-res-acac-enolate": {
    outcome: "eventually",
    play: async (page) => {
      await push(page, "π bond C2=O3", "C2");
      await hinted(page, "Oxygen is the electronegative sink.");
      await push(page, "lone pair on C4", "C2–C4 bond");
      await push(page, "π bond C2=O3", "O3");
      await correct(page);
    },
  },
  "u1-res-phenoxide-para": {
    outcome: "eventually",
    play: async (page) => {
      await push(page, "π bond C2=C3", "C3");
      await hinted(page, "That puts − on the carbon next to C2.");
      await push(page, "lone pair on O1", "O1–C2 bond");
      await push(page, "π bond C2=C3", "C3–C4 bond");
      await push(page, "π bond C4=C5", "C5");
      await correct(page);
    },
  },
  // Lesson 7
  "u1-res-nitromethane-equal": hintThenReveal(
    (p) => choose(p, /^The one with the upper O double-bonded/),
    "Go rule by rule: octets, number of charges, where − sits, how close the charges are.",
    (p) => choose(p, "They count equally"),
  ),
  // Cards start c, b, a: Check as they stand for the rule-1 Hint.
  "u1-res-rank-fulminic": hintThenReveal(
    async () => {},
    "Rule 1 puts both full-octet cards above it.",
    async (p) => {
      await move(p, "Card a: H–C≡N⁺–O⁻. + on nitrogen, − on oxygen.", "ArrowUp", 2);
      await move(p, "Card b: H–C⁻=N⁺=O. − on carbon, + on nitrogen.", "ArrowUp", 1);
    },
  ),
  "u1-res-iminium-sites": hintThenReveal(
    (p) => tapAtoms(p, ["C5, in the ring C=C next to C4."]),
    "No reasonable contributor puts + on C5.",
    (p) => tapAtoms(p, ["C4, the ring carbon double-bonded to N.", "C6, the far end of the ring C=C."]),
  ),
  // Lesson 8
  "u1-mo-h2-cation": hintThenReveal((p) => choose(p, "0"), "The one electron goes into the lowest level, σ", (p) => choose(p, "½")),
  "u1-mo-alcl3-chloromethane": {
    outcome: "eventually",
    play: async (page) => {
      await push(page, "lone pair on Cl4", "Al3–Cl4 bond");
      await hinted(page, "Those chlorines already belong to AlCl₃.");
      await push(page, "lone pair on Cl2", "Al3");
      await correct(page);
    },
  },
  "u1-mo-empty-orbital": hintThenReveal(
    async (p) => {
      for (const card of [/^NH₃: nitrogen/, /^BBr₃/, /^The tert-butyl cation/]) await choose(p, card);
    },
    "Count the electrons around N (or O): eight, with a lone pair.",
    async (p) => {
      for (const card of [/^BBr₃/, /^The tert-butyl cation/]) await choose(p, card);
    },
  ),
};

/** The Problems a Unit 1 Practice Set can draw: approved, from a core (not On-ramp) Lesson. */
const unit1 = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.courses[0].units[0];
const core = unit1.lessons.filter((l) => !l.onRamp).map((l) => l.id);
const drawable = unit1.bank.filter((p) => p.status === "approved" && !p.onRamp && core.includes(p.lesson)).map((p) => p.id);

/** Plays a round of `n` Problems with their solvers; returns the ids in play order. */
async function playRound(page: Page, n: number, expected?: string[]): Promise<string[]> {
  const played: string[] = [];
  for (let i = 1; i <= n; i++) {
    await at(page, i, n);
    const id = await problemOnScreen(page);
    expect(solvers[id], `a solver for ${id}`).toBeDefined();
    if (expected) expect(id).toBe(expected[i - 1]);
    // Each Problem has its own Report a mistake link.
    await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute("href", `/submit?kind=mistake&unit=u1&target=${id}`);
    played.push(id);
    await solvers[id].play(page);
    if (i < n) await next(page);
  }
  return played;
}

/** The summary after a round, worked out from each Problem's outcome. */
async function expectSummary(page: Page, played: string[]) {
  const count = (o: Outcome[]) => played.filter((id) => o.includes(solvers[id].outcome)).length;
  const first = count(["first"]);
  const summary = page.getByRole("region", { name: "Practice Set results" });
  await expect(summary).toContainText(`First try: ${first}/${played.length} (${Math.round((100 * first) / played.length)}%)`);
  await expect(summary).toContainText(`Eventually correct: ${count(["first", "eventually"])}/${played.length}`);
  return summary;
}

/** Retry missed: exactly the missed Problems, each answered right this time, then a clean summary. */
async function retryMissed(page: Page, played: string[]) {
  const summary = page.getByRole("region", { name: "Practice Set results" });
  const missed = played.filter((id) => solvers[id].outcome === "missed");
  if (!missed.length) {
    await expect(summary.getByRole("button", { name: /Retry missed/ })).toHaveCount(0);
    return;
  }
  await summary.getByRole("button", { name: `Retry missed (${missed.length})` }).click();
  for (let n = 1; n <= missed.length; n++) {
    await at(page, n, missed.length);
    const id = await problemOnScreen(page);
    expect(missed).toContain(id);
    await solvers[id].retry!(page);
    await correct(page);
    if (n < missed.length) await next(page);
  }
  await page.getByRole("button", { name: "See results" }).click();
  await expect(summary).toContainText(`First try: ${missed.length}/${missed.length} (100%)`);
  await expect(summary.getByRole("button", { name: /Retry missed/ })).toHaveCount(0);
}

test("every Problem a Unit 1 Practice Set can draw has a solver here, and every missed one a right answer", () => {
  expect(drawable.length).toBeGreaterThanOrEqual(24);
  expect(drawable.filter((id) => !solvers[id])).toEqual([]);
  expect(Object.keys(solvers).filter((id) => solvers[id].outcome === "missed" && !solvers[id].retry)).toEqual([]);
});

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
  expect(html).toContain("What is the formal charge on this boron?");
  for (const secret of ["3 − 0 − 4 = −1. Boron usually makes 3 bonds", "Two groups, the two O's, and no lone pair", "Four amides: every C=O along the backbone", '"answer"']) {
    expect(html).not.toContain(secret);
  }
});

test("a Student plays the Set, sees the summary, retries exactly the missed Problems and earns the Streak", async ({ page }) => {
  test.setTimeout(120_000);
  // Seed the draw (mulberry32), so this Set is the same on every run; it still goes through the real draw.
  await page.addInitScript(() => {
    let a = 87;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.goto(PRACTICE);

  const drawn = await playRound(page, SET);
  expect(new Set(drawn).size).toBe(SET);
  await page.getByRole("button", { name: "See results" }).click();

  const summary = await expectSummary(page, drawn);
  await expect(summary.getByRole("link", { name: "Suggest a Problem" })).toHaveAttribute("href", "/submit?kind=problem&unit=u1");
  // Unit 2 is coming soon, so Next Unit goes to the Course map.
  await expect(summary.getByRole("link", { name: "Next Unit" })).toHaveAttribute("href", "/organic");
  expect(drawn.filter((id) => solvers[id].outcome === "missed").length).toBeGreaterThan(0);
  await retryMissed(page, drawn);

  // Back on the Unit page: the Practice Set counts, and 3+ Problems today earned the Streak.
  await summary.getByRole("link", { name: "Back to Unit" }).click();
  await expect(page).toHaveURL(UNIT);
  await expect(page.getByRole("listitem").filter({ hasText: "Unit review" })).toContainText("Done");
  await expect(page.getByText("Practice Set done")).toBeVisible();
  await expect(page.getByRole("img", { name: "Streak: 1 day" })).toBeVisible();
});

// The whole drawable Bank, ten pinned Problems at a time.
const chunks = Array.from({ length: Math.ceil(drawable.length / SET) }, (_, i) => drawable.slice(i * SET, (i + 1) * SET));
for (const [i, ids] of chunks.entries())
  test(`pinned Set ${i + 1} of ${chunks.length} plays each of its Problems, then Retry missed answers them right`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`${PRACTICE}?problems=${ids.join(",")}`);
    const played = await playRound(page, ids.length, ids);
    await page.getByRole("button", { name: "See results" }).click();
    await expectSummary(page, played);
    await retryMissed(page, played);
  });

test("the Practice Set never locks anything: every Lesson stays open without it", async ({ page }) => {
  await page.goto(UNIT);
  const lessons = page.locator("[data-lesson-id] .level-title a");
  for (const href of await lessons.evaluateAll((links) => links.map((a) => a.getAttribute("href")!))) {
    await page.goto(href);
    await expect(page.getByText(/^Step 1 of/)).toBeVisible();
  }
});
