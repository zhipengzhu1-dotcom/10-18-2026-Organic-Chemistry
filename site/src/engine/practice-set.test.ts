import { describe, expect, it } from "vitest";
import type { MultipleChoiceStep } from "@astratron/content";
import { act, start, type Action } from "./player.ts";
import { drawSet, pinnedSet, roundOf, summarize, type BankEntry } from "./practice-set.ts";

/** A small seeded random source (mulberry32), so every draw in these tests can be replayed. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

/** Unit 1's core Lessons; l0 is the On-ramp. */
const CORE = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"];

const entry = (id: string, lesson: string, difficulty: 1 | 2 | 3, extra: Partial<BankEntry> = {}): BankEntry => ({
  id,
  lesson,
  difficulty,
  status: "approved",
  check: false,
  onRamp: false,
  ...extra,
});

/** Unit 1's shape: 3 Practice Problems per core Lesson (difficulty 1, 2, 3) and 3 Check Problems per core Lesson. */
function unitBank(): BankEntry[] {
  return CORE.flatMap((l) => [
    entry(`${l}-p1`, l, 1),
    entry(`${l}-p2`, l, 2),
    entry(`${l}-p3`, l, 3),
    entry(`${l}-c1`, l, 1, { check: true }),
    entry(`${l}-c2`, l, 2, { check: true }),
    entry(`${l}-c3`, l, 2, { check: true }),
  ]);
}

const byId = (bank: BankEntry[]) => new Map(bank.map((p) => [p.id, p]));

describe("Practice Set draw", () => {
  it("draws 10 Problems, only approved ones, never an On-ramp's", () => {
    const bank = [
      ...unitBank(),
      entry("l0-c1", "l0", 1, { onRamp: true, check: true }),
      entry("l0-x1", "l0", 1, { onRamp: true }),
      entry("l1-draft", "l1", 1, { status: "draft" }),
      entry("l2-draft", "l2", 1, { status: "draft" }),
    ];
    for (const seed of SEEDS) {
      const drawn = drawSet(bank, CORE, { random: seeded(seed) });
      expect(drawn).toHaveLength(10);
      expect(new Set(drawn).size).toBe(10);
      for (const id of drawn) expect(byId(bank).get(id)).toMatchObject({ status: "approved", onRamp: false });
    }
  });

  it("never draws an On-ramp or draft Problem, even when the Bank is short", () => {
    const bank = [
      entry("a", "l1", 1),
      entry("b", "l2", 2),
      entry("c", "l0", 1, { onRamp: true }),
      entry("d", "l1", 1, { status: "draft" }),
    ];
    expect(drawSet(bank, ["l1", "l2"], { random: seeded(1) })).toEqual(["a", "b"]);
  });

  it("covers every core Lesson at least once", () => {
    for (const seed of SEEDS) {
      const bank = byId(unitBank());
      const lessons = new Set(drawSet(unitBank(), CORE, { random: seeded(seed) }).map((id) => bank.get(id)!.lesson));
      expect([...lessons].sort()).toEqual(CORE);
    }
  });

  it("covers a Lesson even when its only Problem is a Check Problem from the last draw", () => {
    const bank = [...unitBank().filter((p) => p.lesson !== "l5"), entry("l5-only", "l5", 2, { check: true })];
    for (const seed of SEEDS) {
      expect(drawSet(bank, CORE, { random: seeded(seed), previous: ["l5-only"] })).toContain("l5-only");
    }
  });

  it("prefers Problems that aren't any Lesson's Check Step", () => {
    for (const seed of SEEDS) {
      const drawn = drawSet(unitBank(), CORE, { random: seeded(seed) });
      expect(drawn.filter((id) => id.includes("-c"))).toEqual([]);
    }
  });

  it("uses a Check Problem only where no other Problem will do", () => {
    // Only l1 and l2 have Practice Problems: l3–l8 need one Check Problem each, the other 4 slots go to Practice Problems.
    const bank = unitBank().filter((p) => p.check || ["l1", "l2"].includes(p.lesson));
    const lessonOf = byId(bank);
    for (const seed of SEEDS) {
      const drawn = drawSet(bank, CORE, { random: seeded(seed) }).map((id) => lessonOf.get(id)!);
      expect(drawn).toHaveLength(10);
      expect(drawn.filter((p) => !p.check)).toHaveLength(4);
      expect(drawn.filter((p) => p.check).map((p) => p.lesson).sort()).toEqual(["l3", "l4", "l5", "l6", "l7", "l8"]);
    }
  });

  it("orders the Set easy → hard, then in Lesson order", () => {
    const bank = byId(unitBank());
    for (const seed of SEEDS) {
      const drawn = drawSet(unitBank(), CORE, { random: seeded(seed) }).map((id) => bank.get(id)!);
      const keys = drawn.map((p) => [p.difficulty, CORE.indexOf(p.lesson)]);
      const sorted = [...keys].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      expect(keys).toEqual(sorted);
    }
  });

  it("a retake avoids the previous draw when the Bank allows", () => {
    for (const seed of SEEDS) {
      const first = drawSet(unitBank(), CORE, { random: seeded(seed) });
      const retake = drawSet(unitBank(), CORE, { random: seeded(seed + 100), previous: first });
      expect(retake.filter((id) => first.includes(id))).toEqual([]);
    }
  });

  it("a retake repeats only as many previous Problems as the Bank forces", () => {
    // 12 eligible Problems: a retake of 10 can avoid at most 2 of the last 10, so it repeats exactly 8.
    const bank = unitBank().filter((p) => !p.check && (p.difficulty < 3 || p.lesson === "l1" || p.lesson === "l2")).slice(0, 12);
    expect(bank).toHaveLength(12);
    const lessons = [...new Set(bank.map((p) => p.lesson))];
    for (const seed of SEEDS) {
      const first = drawSet(bank, lessons, { random: seeded(seed) });
      const retake = drawSet(bank, lessons, { random: seeded(seed + 100), previous: first });
      expect(retake).toHaveLength(10);
      expect(retake.filter((id) => first.includes(id))).toHaveLength(8);
    }
  });

  it("a retake prefers a fresh Check Problem to repeating the last draw", () => {
    const bank = unitBank().filter((p) => p.lesson === "l1");
    const first = drawSet(bank, ["l1"], { random: seeded(1), size: 3 });
    expect(first.sort()).toEqual(["l1-p1", "l1-p2", "l1-p3"]);
    expect(drawSet(bank, ["l1"], { random: seeded(2), size: 3, previous: first }).sort()).toEqual(["l1-c1", "l1-c2", "l1-c3"]);
  });
});

const mc = (id: string): MultipleChoiceStep => ({
  id,
  phase: "check",
  problemId: id,
  type: "multiple-choice",
  prompt: `Problem ${id}`,
  options: [
    { id: "a", text: "Right" },
    { id: "b", text: "Wrong" },
  ],
  answer: ["a"],
  correct: "Right.",
  hints: [{ text: "Try again." }],
  reveal: "It is a.",
});

describe("Practice Set round, summary and Retry missed", () => {
  const steps = ["p1", "p2", "p3", "p4"].map(mc);
  const answer = (choice: string): Action => ({ type: "answer", choice: [choice] });
  const next: Action = { type: "continue" };

  /** p1 right first try, p2 right on the second, p3 revealed, p4 right first try. */
  function playRound(round = roundOf(steps, ["p1", "p2", "p3", "p4"])) {
    const actions = [answer("a"), next, answer("b"), answer("a"), next, answer("b"), answer("b"), next, answer("a")];
    return { round, screen: actions.reduce((s, a) => act(round, s, a), start(round)) };
  }

  it("a round plays the drawn Problems in order with the Lesson's two-try feedback", () => {
    const round = roundOf(steps, ["p3", "p1"]);
    expect(round.steps.map((s) => s.id)).toEqual(["p3", "p1"]);
    let screen = act(round, start(round), answer("b"));
    expect(screen.feedback).toEqual({ kind: "hint", text: "Try again." });
    screen = act(round, screen, answer("b"));
    expect(screen.feedback).toMatchObject({ kind: "reveal", text: "It is a." });
  });

  it("the summary shows first-try %, eventually correct and n/N", () => {
    const { round, screen } = playRound();
    expect(summarize(round, screen.progress)).toEqual({
      total: 4,
      firstTry: 2,
      firstTryPercent: 50,
      eventuallyCorrect: 3,
      missed: ["p3"],
      results: [
        { id: "p1", tries: 1, correct: true },
        { id: "p2", tries: 2, correct: true },
        { id: "p3", tries: 2, correct: false },
        { id: "p4", tries: 1, correct: true },
      ],
    });
  });

  it("Retry missed replays exactly the missed Problems, with fresh tries", () => {
    const { round, screen } = playRound();
    const retry = roundOf(round.steps, summarize(round, screen.progress).missed);
    expect(retry.steps.map((s) => s.id)).toEqual(["p3"]);
    const again = act(retry, start(retry), answer("a"));
    expect(summarize(retry, again.progress)).toMatchObject({ total: 1, firstTry: 1, firstTryPercent: 100, missed: [] });
  });

  it("a Problem left unanswered counts as missed", () => {
    const round = roundOf(steps, ["p1", "p2"]);
    const screen = act(round, start(round), answer("a"));
    expect(summarize(round, screen.progress)).toMatchObject({ firstTry: 1, eventuallyCorrect: 1, missed: ["p2"] });
  });

  it("first-try % rounds to a whole number", () => {
    const round = roundOf(steps, ["p1", "p2", "p3"]);
    const screen = act(round, start(round), answer("a"));
    expect(summarize(round, screen.progress).firstTryPercent).toBe(33);
  });
});

describe("a pinned Set: ?problems=<id>,<id>… plays exactly those Problems (to replay one, and for the browser tests)", () => {
  const bank = ["p1", "p2", "p3"];

  it("reads the ids in the order given", () => {
    expect(pinnedSet("?problems=p3,p1", bank)).toEqual(["p3", "p1"]);
  });

  it("is no pin when the query names none, or names a Problem that cannot be drawn", () => {
    expect(pinnedSet("", bank)).toBeUndefined();
    expect(pinnedSet("?problems=", bank)).toBeUndefined();
    expect(pinnedSet("?problems=p1,draft-one", bank)).toBeUndefined();
  });

  it("drops repeats and keeps at most a Set's worth", () => {
    const many = Array.from({ length: 12 }, (_, i) => `q${i}`);
    expect(pinnedSet("?problems=p1,p1,p2", bank)).toEqual(["p1", "p2"]);
    expect(pinnedSet(`?problems=${many.join(",")}`, many)).toHaveLength(10);
  });
});
