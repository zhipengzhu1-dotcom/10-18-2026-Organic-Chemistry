// Draw arrows in the Step player engine. The reference cases are the Lesson 6
// Draw-arrows Steps and Check Problems (docs/specs/unit-1/lesson-06-resonance.md),
// plus the open and two-molecule cases of Lessons 7–8 and the Practice Problems.
// Starts and results are laid out from the specs' atom-mapped SMILES with
// RDKit (as `pnpm structure` does), so atom ids are the map numbers: a<n> = atom n.
import { beforeAll, describe, expect, it } from "vitest";
import type { DrawArrowsStep, Push, PushHint, Structure } from "@astratron/content";
import { layoutStructure } from "../../../content/src/layout.ts";
import { act, start, type Action, type Screen } from "./player.ts";

interface Case {
  start: string;
  results: string[];
  style?: Structure["style"];
  /** Pushes written with map numbers: "lp4>2" (lone pair on 4 → atom 2), "2-3>3" (bond 2–3 → atom 3), "lp4>2-4", "1-2>2-3". */
  answer: string[];
  hints?: { from?: string[]; to?: string[]; text: string }[];
  inBetween?: DrawArrowsStep["inBetween"];
}

const structures = new Map<string, Structure>();
async function layout(smiles: string, style: Structure["style"]) {
  const key = `${style}:${smiles}`;
  if (!structures.has(key)) structures.set(key, await layoutStructure({ id: "s", smiles, style }));
  return structures.get(key)!;
}

/** "lp4" → a4; "2-3" → the bond between a2 and a3 in the start; "4" → a4; "sigma" stays. */
function ref(token: string, s: Structure): string {
  if (token === "sigma") return token;
  if (token.startsWith("lp")) return `a${token.slice(2)}`;
  const ends = token.split("-");
  if (ends.length === 1) return `a${token}`;
  const [p, q] = ends.map((n) => `a${n}`);
  const bond = s.bonds.find((b) => (b.a === p && b.b === q) || (b.a === q && b.b === p));
  if (!bond) throw new Error(`no bond ${token}`);
  return bond.id;
}
const pushOf = (text: string, s: Structure): Push => {
  const [from, to] = text.split(">");
  return { from: ref(from, s), to: ref(to, s) };
};

async function stepFor(c: Case): Promise<DrawArrowsStep> {
  const style = c.style ?? "full";
  const s = await layout(c.start, style);
  const results = await Promise.all(c.results.map((r) => layout(r, style)));
  const hints: PushHint[] = (c.hints ?? []).map((h) => ({
    ...(h.from && { from: h.from.map((t) => ref(t, s)) }),
    ...(h.to && { to: h.to.map((t) => ref(t, s)) }),
    text: h.text,
  }));
  return {
    id: "s01",
    phase: "build",
    type: "draw-arrows",
    prompt: "Push.",
    start: { structure: s, hide: [] },
    results,
    answer: c.answer.map((p) => pushOf(p, s)),
    inBetween: c.inBetween,
    correct: "Correct line.",
    hints: [...hints, { text: "Generic fallback." }],
    reveal: "Reveal.",
  };
}

const wrap = { id: "s02", phase: "wrap" as const, type: "explain" as const, text: "Wrap." };

/** Plays pushes (map-number notation) and "undo" on a one-Step Lesson. */
function playOn(step: DrawArrowsStep, ...moves: string[]): Screen {
  const lesson = { steps: [step, wrap] };
  const s = step.start.structure;
  return moves.reduce(
    (screen, m) => act(lesson, screen, (m === "undo" ? { type: "answer", undo: true } : { type: "answer", push: pushOf(m, s) }) as Action),
    start(lesson),
  );
}

/** The drawing on screen, as charges and bond orders by map number. */
function drawn(screen: Screen) {
  const s = screen.arrows!.structure;
  const n = (id: string) => id.slice(1);
  return {
    charges: Object.fromEntries(s.atoms.filter((a) => a.charge).map((a) => [n(a.id), a.charge])),
    bonds: Object.fromEntries(s.bonds.map((b) => [[n(b.a), n(b.b)].sort((x, y) => +x - +y).join("-"), b.order])),
    lp: Object.fromEntries(s.atoms.filter((a) => a.lp).map((a) => [n(a.id), a.lp])),
  };
}

// ── Lesson 6, s04: formaldehyde, one push (bond → atom) ────────────────────────
const s04: Case = {
  start: "[CH2:1]=[O:2]",
  results: ["[CH2+:1]-[O-:2]"],
  answer: ["1-2>2"],
  hints: [
    { from: ["1-2"], to: ["1"], text: "Electrons flow to the sink." },
    { from: ["lp2"], to: ["1"], text: "That pushes more electrons onto carbon." },
    { from: ["1-3", "1-4"], text: "σ bonds never move in resonance." },
  ],
};

describe("Draw arrows: one push (Lesson 6 s04, formaldehyde)", () => {
  let step: DrawArrowsStep;
  beforeAll(async () => {
    step = await stepFor(s04);
  });

  it("the right push gives the Correct line, first try, and redraws the structure", () => {
    const screen = playOn(step, "1-2>2");
    expect(screen).toMatchObject({ tries: 1, feedback: { kind: "correct", text: "Correct line." }, canContinue: true });
    expect(drawn(screen)).toMatchObject({ charges: { 1: 1, 2: -1 }, bonds: { "1-2": 1 }, lp: { 2: 3 } });
  });
});

describe("Draw arrows: two tries per push", () => {
  let step: DrawArrowsStep;
  beforeAll(async () => {
    step = await stepFor(s04);
  });

  it("a wrong push gets the Hint written for it, and the drawing is unchanged", () => {
    const screen = playOn(step, "1-2>1");
    expect(screen).toMatchObject({ tries: 1, feedback: { kind: "hint", text: "Electrons flow to the sink." }, canContinue: false });
    expect(drawn(screen)).toMatchObject({ charges: {}, bonds: { "1-2": 2 } });
    expect(playOn(step, "lp2>1")).toMatchObject({ feedback: { kind: "hint", text: "That pushes more electrons onto carbon." } });
  });

  it("a Hint on a σ bond fires for any push from it", () => {
    expect(playOn(step, "1-3>1")).toMatchObject({ feedback: { kind: "hint", text: "σ bonds never move in resonance." } });
    expect(playOn(step, "1-4>4")).toMatchObject({ feedback: { kind: "hint", text: "σ bonds never move in resonance." } });
  });

  it("wrong then right: the Correct line, but not first try", () => {
    expect(playOn(step, "1-2>1", "1-2>2")).toMatchObject({ tries: 2, feedback: { kind: "correct" }, canContinue: true });
  });

  it("wrong twice: that push is shown and placed; a one-push Step then ends on the reveal", () => {
    const screen = playOn(step, "1-2>1", "lp2>1");
    expect(screen).toMatchObject({ tries: 3, feedback: { kind: "reveal", text: "Reveal." }, canContinue: true });
    expect(screen.arrows!.pushes).toEqual([{ push: step.answer[0], shown: true }]);
    expect(drawn(screen)).toMatchObject({ charges: { 1: 1, 2: -1 } });
  });

  it("is locked once done", () => {
    const done = playOn(step, "1-2>2");
    expect(playOn(step, "1-2>2", "undo")).toEqual(done);
  });

  it("a drop that isn't a move is ignored (no try used)", () => {
    // Carbon has no lone pair; a bond can't land on itself.
    expect(playOn(step, "lp1>2")).toMatchObject({ tries: 0, feedback: null });
    expect(playOn(step, "1-2>1-2")).toMatchObject({ tries: 0, feedback: null });
  });

  it("resumes: saved pushes replay to the same Screen", () => {
    const screen = playOn(step, "1-2>1");
    const lesson = { steps: [step, wrap] };
    expect(start(lesson, undefined, screen.progress)).toMatchObject({ tries: 1, feedback: { kind: "hint" } });
  });
});

// ── Lesson 6, s06: acetate, two pushes in any order, with in-between flags ──
const s06: Case = {
  start: "[CH3:1][C:2](=[O:3])[O-:4]",
  results: ["[CH3:1][C:2]([O-:3])=[O:4]"],
  style: "line-angle",
  answer: ["lp4>2-4", "2-3>3"],
  inBetween: {
    over: "{atom} has {electrons} e⁻: something has to leave.",
    short: "{atom} has only {electrons} e⁻. Fill the gap.",
  },
  hints: [
    { from: ["2-3"], to: ["2"], text: "Oxygen is the electronegative sink." },
    { from: ["lp3"], to: ["2"], text: "Start from the oxygen that carries the negative charge." },
    { from: ["sigma"], text: "σ bonds stay put." },
  ],
};

describe("Draw arrows: two pushes, any order (Lesson 6 s06, acetate)", () => {
  let step: DrawArrowsStep;
  beforeAll(async () => {
    step = await stepFor(s06);
  });

  it("lone pair first: accepted, the structure updates, and C2's 10 e⁻ is flagged as not real", () => {
    const screen = playOn(step, "lp4>2");
    expect(screen).toMatchObject({ tries: 0, feedback: null, canContinue: false });
    expect(drawn(screen)).toMatchObject({ bonds: { "2-4": 2, "2-3": 2 } });
    expect(drawn(screen).charges).toEqual({ 2: -1 });
    expect(screen.arrows!.flags).toEqual([{ atom: "a2", kind: "over", electrons: 10, text: "C2 has 10 e⁻: something has to leave." }]);
  });

  it("π bond first: C2 at 6 e⁻ is flagged; the second push finishes, first try", () => {
    const half = playOn(step, "2-3>3");
    expect(half.arrows!.flags).toEqual([{ atom: "a2", kind: "short", electrons: 6, text: "C2 has only 6 e⁻. Fill the gap." }]);
    const done = playOn(step, "2-3>3", "lp4>2-4");
    expect(done).toMatchObject({ tries: 1, feedback: { kind: "correct" }, canContinue: true });
    expect(done.arrows!.flags).toEqual([]);
    expect(drawn(done)).toMatchObject({ charges: { 3: -1 }, bonds: { "2-3": 1, "2-4": 2 } });
  });

  it("dropping the lone pair on the atom or on the bond is the same push", () => {
    expect(playOn(step, "lp4>2", "2-3>3")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
  });

  it("tries count per push: a wrong second arrow gets its Hint, then the push is shown", () => {
    const hinted = playOn(step, "lp4>2", "2-3>2");
    expect(hinted).toMatchObject({ tries: 1, feedback: { kind: "hint", text: "Oxygen is the electronegative sink." } });
    const shown = playOn(step, "lp4>2", "2-3>2", "1-2>1");
    expect(shown).toMatchObject({ tries: 3, feedback: { kind: "reveal" }, canContinue: true });
  });

  it("a shown push mid-Step: 'Here is that push', and the next push gets two fresh tries", () => {
    const shown = playOn(step, "2-3>2", "lp3>2");
    expect(shown).toMatchObject({
      tries: 2,
      feedback: { kind: "shown", text: "Here is that push: lone pair on O4 → C2–O4 bond." },
      canContinue: false,
    });
    expect(playOn(step, "2-3>2", "lp3>2", "lp4>2")).toMatchObject({ tries: 3, feedback: { kind: "hint" } });
    expect(playOn(step, "2-3>2", "lp3>2", "2-3>3")).toMatchObject({ tries: 3, feedback: { kind: "reveal" }, canContinue: true });
  });

  it("the same push dropped on the atom matches a Hint written for the bond it makes", () => {
    expect(playOn(step, "lp3>2-3")).toMatchObject({ feedback: { kind: "hint", text: "Start from the oxygen that carries the negative charge." } });
  });

  it("the generic fallback answers an unanticipated wrong push", () => {
    const bare = { ...step, hints: [{ from: [step.answer[0].from], to: ["a1"], text: "Not this." }, { text: "Generic fallback." }] };
    expect(playOn(bare, "2-3>2")).toMatchObject({ feedback: { kind: "hint", text: "Generic fallback." } });
  });

  it("a lone pair can't jump to an atom it isn't bonded to in the same molecule", () => {
    expect(playOn(step, "lp4>3")).toMatchObject({ tries: 0, feedback: null });
  });

  it("Delete undoes the last arrow without giving back a try", () => {
    const undone = playOn(step, "lp4>2", "undo");
    expect(undone.arrows!.pushes).toEqual([]);
    expect(drawn(undone)).toMatchObject({ charges: { 4: -1 }, bonds: { "2-3": 2, "2-4": 1 } });
    expect(undone.arrows!.flags).toEqual([]);
    expect(playOn(step, "2-3>2", "undo")).toMatchObject({ tries: 1 });
  });
});

describe("Draw arrows: the other Lesson 6 reference cases", () => {
  it("s08 allyl cation: bond → next bond, dropped on the bond or on C3", async () => {
    const step = await stepFor({
      start: "[CH2:1]=[CH:2][CH2+:3]",
      results: ["[CH2+:1][CH:2]=[CH2:3]"],
      style: "line-angle",
      answer: ["1-2>2-3"],
      hints: [{ from: ["1-2"], to: ["1", "2"], text: "That parks the pair on one carbon." }],
    });
    expect(playOn(step, "1-2>2-3")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    expect(drawn(playOn(step, "1-2>3"))).toMatchObject({ charges: { 1: 1 }, bonds: { "1-2": 1, "2-3": 2 } });
    expect(playOn(step, "1-2>2")).toMatchObject({ feedback: { kind: "hint", text: "That parks the pair on one carbon." } });
  });

  it("s10 nitromethane: N would have 10 e⁻ after the lone pair; then the π bond leaves", async () => {
    const step = await stepFor({
      start: "[CH3:1][N+:2](=[O:3])[O-:4]",
      results: ["[CH3:1][N+:2]([O-:3])=[O:4]"],
      answer: ["lp4>2", "2-3>3"],
      hints: [{ from: ["2-3"], to: ["2"], text: "Pull the π pair toward oxygen." }],
    });
    const half = playOn(step, "lp4>2");
    expect(half.arrows!.flags.map((f) => [f.atom, f.kind, f.electrons])).toEqual([["a2", "over", 10]]);
    expect(playOn(step, "2-3>3")!.arrows!.flags.map((f) => [f.atom, f.kind, f.electrons])).toEqual([["a2", "short", 6]]);
    expect(drawn(playOn(step, "2-3>3")).charges).toMatchObject({ 2: 2 });
    expect(playOn(step, "lp4>2", "2-3>3")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
  });

  it("u1-res-ozone: the central O is flagged both ways; a wrong drop on O2 gets its Hint", async () => {
    const step = await stepFor({
      start: "[O:1]=[O+:2][O-:3]",
      results: ["[O-:1][O+:2]=[O:3]"],
      answer: ["lp3>2", "1-2>1"],
      hints: [{ from: ["1-2"], to: ["2"], text: "That leaves the end oxygen with only 6 electrons." }],
    });
    expect(playOn(step, "1-2>2")).toMatchObject({ feedback: { kind: "hint", text: "That leaves the end oxygen with only 6 electrons." } });
    expect(playOn(step, "1-2>1", "lp3>2-3")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
  });

  it("u1-res-oxocarbenium: a ring, with the author's own sextet copy", async () => {
    const step = await stepFor({
      start: "[CH2:1]1[CH2:2][CH+:3][CH:4]=[CH:5][O:6]1",
      results: ["[CH2:1]1[CH2:2][CH:3]=[CH:4][CH:5]=[O+:6]1"],
      style: "line-angle",
      answer: ["lp6>5", "4-5>3-4"],
      inBetween: { short: "{atom}⁺, next to O. That's a valid contributor too. Keep going." },
      hints: [{ from: ["4-5"], to: ["4", "5"], text: "That parks the pair as a lone pair." }],
    });
    const half = playOn(step, "4-5>3");
    expect(half.arrows!.flags.map((f) => f.text)).toEqual(["C5⁺, next to O. That's a valid contributor too. Keep going."]);
    expect(playOn(step, "4-5>3", "lp6>5-6")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    expect(playOn(step, "4-5>4")).toMatchObject({ feedback: { kind: "hint", text: "That parks the pair as a lone pair." } });
  });

  it("u1-res-thiodienyl: three pushes in any order", async () => {
    const step = await stepFor({
      start: "[CH3:1][C:2](=[S:3])[CH:4]=[CH:5][CH2-:6]",
      results: ["[CH3:1][C:2]([S-:3])=[CH:4][CH:5]=[CH2:6]"],
      style: "line-angle",
      answer: ["lp6>5", "4-5>2-4", "2-3>3"],
      hints: [{ from: ["4-5"], to: ["6"], text: "C6 already pushes toward C5." }],
    });
    expect(playOn(step, "2-3>3", "lp6>5-6", "4-5>2")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    expect(playOn(step, "4-5>2-4", "2-3>3", "lp6>5")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    const middle = playOn(step, "4-5>2-4");
    expect(middle.arrows!.flags.map((f) => [f.atom, f.kind])).toEqual([["a2", "over"], ["a5", "short"]]);
    expect(playOn(step, "4-5>6")).toMatchObject({ feedback: { kind: "hint", text: "C6 already pushes toward C5." } });
  });
});

describe("Draw arrows: every valid route counts", () => {
  it("an open Problem accepts either result; once one side starts, the other side's push is wrong", async () => {
    // u1-res-acac-enolate (Practice Problems, Lesson 6).
    const step = await stepFor({
      start: "[CH3:1][C:2](=[O:3])[CH-:4][C:5](=[O:6])[CH3:7]",
      results: ["[CH3:1][C:2]([O-:3])=[CH:4][C:5](=[O:6])[CH3:7]", "[CH3:1][C:2](=[O:3])[CH:4]=[C:5]([O-:6])[CH3:7]"],
      style: "line-angle",
      answer: ["lp4>2-4", "2-3>3"],
      hints: [{ from: ["5-6"], to: ["6"], text: "The pair that came into C2 has to push out the C2=O3 pair." }],
    });
    expect(playOn(step, "lp4>2-4", "2-3>3")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    expect(playOn(step, "lp4>4-5", "5-6>6")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    expect(playOn(step, "5-6>6", "lp4>5")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    expect(playOn(step, "lp4>2-4", "5-6>6")).toMatchObject({
      tries: 1,
      feedback: { kind: "hint", text: "The pair that came into C2 has to push out the C2=O3 pair." },
    });
  });

  it("the push shown after two wrong tries follows the Student's own route", async () => {
    const step = await stepFor({
      start: "[CH3:1][C:2](=[O:3])[CH-:4][C:5](=[O:6])[CH3:7]",
      results: ["[CH3:1][C:2]([O-:3])=[CH:4][C:5](=[O:6])[CH3:7]", "[CH3:1][C:2](=[O:3])[CH:4]=[C:5]([O-:6])[CH3:7]"],
      style: "line-angle",
      answer: ["lp4>2-4", "2-3>3"],
    });
    const shown = playOn(step, "lp4>4-5", "5-6>5", "2-3>2");
    expect(shown).toMatchObject({ feedback: { kind: "reveal" }, canContinue: true });
    expect(drawn(shown).charges).toEqual({ 6: -1 });
  });

  it("Lesson 8 s11: a lone pair makes a new bond to another molecule (NH₃ → BF₃)", async () => {
    const step = await stepFor({
      start: "[NH3:1].[B:2]([F:3])([F:4])[F:5]",
      results: ["[NH3+:1][B-:2]([F:3])([F:4])[F:5]"],
      answer: ["lp1>2"],
      hints: [{ from: ["lp3", "lp4", "lp5"], to: ["2"], text: "F's pairs sit low on the ladder." }],
    });
    const done = playOn(step, "lp1>2");
    expect(done).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
    expect(drawn(done)).toMatchObject({ charges: { 1: 1, 2: -1 }, bonds: { "1-2": 1 } });
    expect(playOn(step, "lp3>2")).toMatchObject({ feedback: { kind: "hint", text: "F's pairs sit low on the ladder." } });
  });

  it("u1-mo-ether-bf3: either lone pair on O gives the same result", async () => {
    const step = await stepFor({
      start: "[CH3:1][O:2][CH3:3].[B:4]([F:5])([F:6])[F:7]",
      results: ["[CH3:1][O+:2]([CH3:3])[B-:4]([F:5])([F:6])[F:7]"],
      answer: ["lp2>4"],
    });
    expect(playOn(step, "lp2>4")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
  });

  it("u1-res-phenoxide-para: a push toward a real contributor that isn't the target is wrong", async () => {
    const step = await stepFor({
      start: "[O-:1][C:2]1=[CH:3][CH:4]=[CH:5][CH:6]=[CH:7]1",
      results: ["[O:1]=[C:2]1[CH:3]=[CH:4][CH-:5][CH:6]=[CH:7]1"],
      style: "line-angle",
      answer: ["lp1>1-2", "2-3>3-4", "4-5>5"],
      hints: [{ from: ["2-3"], to: ["3"], text: "That puts − on the carbon next to C2." }],
    });
    expect(playOn(step, "lp1>1-2", "2-3>3")).toMatchObject({ feedback: { kind: "hint", text: "That puts − on the carbon next to C2." } });
    expect(playOn(step, "4-5>5", "2-3>3-4", "lp1>2")).toMatchObject({ tries: 1, feedback: { kind: "correct" } });
  });
});
