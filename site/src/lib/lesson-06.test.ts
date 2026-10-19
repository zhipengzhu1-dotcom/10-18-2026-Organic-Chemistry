// Lesson 6 (#84) against its merged Lesson spec: every Prompt, Correct line,
// Hint and Source note is read from docs/specs/unit-1/lesson-06-resonance.md
// and compared with the built Lesson; the Draw-arrows Steps are played with the
// grading engine (the answer pushes finish; each spec wrong push gets its Hint).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { arrowsAct, arrowsStart, arrowsView, type ArrowsState, type ArrowsTask } from "@astratron/content/arrows";
import { buildContent, contentRoot, type DrawArrowsStep, type GradedStep, type Lesson, type Step } from "@astratron/content";
import { sceneCatalog } from "@astratron/scenes/check";
import { sceneManifests } from "@astratron/scenes/manifests";
import { watchSceneManifests } from "@astratron/scenes/watch";

const spec = readFileSync(new URL("../../../docs/specs/unit-1/lesson-06-resonance.md", import.meta.url), "utf8");
const built = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
const unit = built.model?.subjects.find((s) => s.slug === "organic")?.courses[0].units.find((u) => u.id === "u1");
const lesson = unit?.lessons.find((l) => l.id === "u1-l06") as Lesson;
const step = (n: number) => lesson.steps[n - 1];

/** Markdown emphasis and line breaks (including hard breaks, a line-ending `\`) don't count; the words do. */
const plain = (s: string | undefined) =>
  (s ?? "").replace(/\*\*/g, "").replace(/\\$/gm, "").replace(/\s+/g, " ").trim();

/** The spec section of a Step (`u1-l06-s04`) or a Check Problem (`u1-res-ozone`). */
function section(id: string): string {
  const start = spec.indexOf(`### \`${id}\``);
  if (start < 0) throw new Error(`no spec section ${id}`);
  const next = spec.indexOf("\n### ", start + 4);
  return spec.slice(start, next < 0 ? undefined : next);
}
/** A quoted field: `- **Prompt:** "…"` (it may run over several lines). */
function quoted(text: string, field: string): string | undefined {
  const m = new RegExp(`\\*\\*${field}:\\*\\* "([\\s\\S]*?)"\\s*$`, "m").exec(text);
  return m?.[1];
}
/** The Hint column of a section's Hint table, in order. */
function hintTexts(text: string): string[] {
  return [...text.matchAll(/^\s*\| [^|]+ \| "(.+)" \|\s*$/gm)].map((m) => m[1]);
}
const stepIds = [...spec.matchAll(/^### `u1-l06-(s\d\d)`/gm)].map((m) => m[1]);
const problemIds = [...spec.matchAll(/^### `(u1-res-[a-z-]+)`/gm)].map((m) => m[1]);

describe("Lesson 6: Resonance: Pushing Electrons", () => {
  it("builds with the rest of the content", () => {
    expect(built.errors).toEqual([]);
    expect(lesson).toBeDefined();
  });

  it("has the spec's 15 Steps: Hook 1, Build 9, Check 4, Wrap 1, in the spec's types", () => {
    expect(lesson.steps.map((s) => s.id)).toEqual(Array.from({ length: 15 }, (_, i) => `s${String(i + 1).padStart(2, "0")}`));
    expect(lesson.phases).toEqual({ hook: 1, build: 9, check: 4, wrap: 1 });
    expect(lesson.steps.map((s) => s.type)).toEqual([
      "multiple-choice", "explain", "tap-to-identify", "draw-arrows", "explain", "draw-arrows", "explain", "draw-arrows",
      "multiple-choice", "draw-arrows", "draw-arrows", "multiple-choice", "draw-arrows", "draw-arrows", "explain",
    ]);
  });

  it("carries the spec's title, goal, key idea, slug, act and signature", () => {
    expect(lesson.title).toBe("Resonance: Pushing Electrons");
    expect(lesson.slug).toBe("resonance-pushing-electrons");
    expect(plain(lesson.goal)).toBe(
      "Draw curved arrows from an electron source to a sink to turn one resonance contributor into another, using the three moves, without ever moving an atom or a σ bond.",
    );
    expect(plain(lesson.keyIdea)).toBe(
      "Curved arrows move only lone pairs and π bonds, from source to sink; atoms and σ bonds never move. The real molecule is the hybrid of its drawings.",
    );
    expect(lesson.act).toBe("Moving electrons");
    expect(lesson.signature).toBe("draw-arrows");
  });

  it("its Check Steps play the spec's four Problems, in order, approved and tagged with this Lesson", () => {
    const checks = lesson.steps.filter((s) => s.phase === "check") as GradedStep[];
    expect(checks.map((s) => s.problemId)).toEqual(problemIds);
    for (const id of problemIds) {
      const problem = unit!.bank.find((p) => p.id === id)!;
      expect(problem, id).toMatchObject({ status: "approved", lesson: "u1-l06", check: true });
    }
    expect(unit!.bank.find((p) => p.id === "u1-res-not-resonance")?.difficulty).toBe(2);
    expect(unit!.bank.find((p) => p.id === "u1-res-thiodienyl")?.difficulty).toBe(3);
  });
});

describe("Lesson 6 text matches its spec", () => {
  for (const id of stepIds) {
    if (["s11", "s12", "s13", "s14"].includes(id)) continue;
    it(`${id}: Prompt, Correct line, Hints and Source note`, () => {
      const text = section(`u1-l06-${id}`);
      const s = lesson.steps.find((x) => x.id === id) as Step;
      const prompt = s.type === "explain" ? s.text : s.prompt;
      expect(plain(prompt)).toBe(plain(quoted(text, "Prompt")));
      if (s.type !== "explain") {
        expect(plain(s.correct)).toBe(plain(quoted(text, "Correct line")));
        expect((s.hints ?? []).map((h) => plain(h.text))).toEqual(hintTexts(text).map(plain));
      }
      // s01 and s07 point at the Geometry note; the bond-length test below checks them.
      if (id === "s01" || id === "s07") return;
      const note = quoted(text, "Source note");
      if (note) expect(s.sourceNote).toBe(note);
      else expect(s.sourceNote).toBeUndefined();
    });
  }

  for (const [n, id] of [[11, "u1-res-ozone"], [12, "u1-res-not-resonance"], [13, "u1-res-oxocarbenium"], [14, "u1-res-thiodienyl"]] as const) {
    it(`s${n} (${id}): Prompt, Correct line, Hints and Source note`, () => {
      const text = section(id);
      const s = step(n) as GradedStep;
      expect(plain(s.prompt)).toBe(plain(quoted(text, "Prompt")));
      expect(plain(s.correct)).toBe(plain(quoted(text, "Correct line")));
      expect((s.hints ?? []).map((h) => plain(h.text))).toEqual(hintTexts(text).map(plain));
      const q = /\*\*Source:\*\* PS1 (Q\w+)/.exec(text)![1];
      expect(s.sourceNote).toBe(`Adapted from MIT OCW 5.12, Problem Set 1 ${q}, Berkowski, Spring 2005, CC BY-NC-SA 4.0.`);
    });
  }

  it("s01 is a prediction: every choice is accepted, the reveal and its Scene follow the answer", () => {
    const s = step(1);
    expect(s).toMatchObject({ type: "multiple-choice", prediction: true });
    if (s.type !== "multiple-choice") return;
    expect(s.options.map((o) => plain(o.text))).toEqual(["The C–O single bond", "The C=O double bond", "They're the same length"]);
    expect(s.figures?.map((f) => f.view.structure.id)).toEqual(["acetate"]);
    expect(plain(s.reveal)).toBe(
      "Measure them and they're identical. In acetic acid they really do differ. So the drawing of acetate is hiding something. By the end of this Lesson you'll know what.",
    );
    expect(s.scene).toBeUndefined();
    expect(s.revealScene).toMatchObject({ id: "acetate-bond-lengths", state: { molecule: "both" } });
  });

  it("the Scenes sit where the spec puts them", () => {
    expect(step(2).scene?.id).toBe("formaldehyde-pi-shift");
    expect(step(5).scene).toMatchObject({ id: "three-moves", state: { panel: "all" } });
    expect(step(7).scene?.id).toBe("acetate-hybrid");
    expect(step(15).scene).toMatchObject({ id: "acetate-hybrid", state: { stage: "hybrid" }, still: true });
    // Draw-arrows Steps play push-replay of the Student's arrows: no Scene of their own.
    for (const n of [4, 6, 8, 10, 11, 13, 14]) expect(step(n).scene, `s${n}`).toBeUndefined();
  });

  it("the bond-length Steps cite the computed geometry; their Source note adds the spec's same-method line", () => {
    for (const n of [1, 7]) {
      const refs = (step(n).citations ?? []).map((c) => c.ref);
      expect(refs).toEqual(expect.arrayContaining(["acetate/r.CO.a", "acetate/r.CO.b"]));
      expect(step(n).citations!.every((c) => c.tier === "computed")).toBe(true);
      expect(step(n).sourceNote).toContain(
        "Bond lengths computed with PySCF, B3LYP/cc-pVTZ, gas phase. Both molecules use the same method so they can be compared fairly.",
      );
    }
    expect((step(1).citations ?? []).map((c) => c.ref)).toEqual(expect.arrayContaining(["acetic-acid/r.CO.double", "acetic-acid/r.CO.single"]));
    expect(step(7).sourceNote).toContain("The hybrid idea follows MIT OCW 5.12, Lecture 1 p. 17, CC BY-NC-SA 4.0.");
  });

  it("s03 is tap-only with the spec's cue, and its answer is the two oxygens and the N=O π bond", () => {
    const s = step(3);
    if (s.type !== "tap-to-identify") throw new Error("s03 is not Tap");
    expect(s.tapOnly).toEqual({
      idle: "Just tap, no pushing on this Step.",
      drag: "No pushing yet: this Step only asks where electrons could come from. Tap each lone pair or bond you think is a source.",
    });
    expect([...s.answer].sort()).toEqual(["a3", "a4", "b2"]);
    expect(s.structure.structure.id).toBe("nitromethane");
  });

  it("s09 and u1-res-not-resonance use structure cards; s09 has one answer, not-resonance two", () => {
    for (const n of [9, 12]) {
      const s = step(n);
      if (s.type !== "multiple-choice") throw new Error(`s${n} is not MC`);
      expect(s.options.every((o) => o.structure)).toBe(true);
    }
    expect((step(9) as GradedStep).answer).toEqual(["a"]);
    expect([...((step(12) as GradedStep).answer as string[])].sort()).toEqual(["b", "e"]);
  });
});

// ── The Draw-arrows Steps, played ───────────────────────────────────────────

const task = (s: DrawArrowsStep): ArrowsTask => ({
  start: s.start.structure,
  results: s.results,
  answer: s.answer,
  hints: s.hints,
  inBetween: s.inBetween,
});
function play(s: DrawArrowsStep, pushes: { from: string; to: string }[]): ArrowsState {
  return pushes.reduce((st, push) => arrowsAct(task(s), st, { push }), arrowsStart());
}
const arrows = (n: number) => step(n) as DrawArrowsStep;
/** The spec's Hint table, row by row: the wrong push it names, and its Hint. */
const hintFor = (n: number, id: string, push: { from: string; to: string }) => {
  const s = arrows(n);
  const st = play(s, [push]);
  expect(st.last?.kind, `${id}: ${push.from}→${push.to}`).toBe("wrong");
  return st.last?.kind === "wrong" ? st.last.hint : "";
};

describe("Lesson 6 Draw-arrows Steps play as the spec says", () => {
  const cases: [n: number, id: string, pushes: { from: string; to: string }[]][] = [
    [4, "u1-l06-s04", [{ from: "b1", to: "a2" }]],
    [6, "u1-l06-s06", [{ from: "a4", to: "a2" }, { from: "b2", to: "a3" }]],
    [8, "u1-l06-s08", [{ from: "b1", to: "a3" }]],
    [10, "u1-l06-s10", [{ from: "a4", to: "a2" }, { from: "b2", to: "a3" }]],
    [11, "u1-res-ozone", [{ from: "a3", to: "a2" }, { from: "b1", to: "a1" }]],
    [13, "u1-res-oxocarbenium", [{ from: "a6", to: "a5" }, { from: "b4", to: "a3" }]],
    [14, "u1-res-thiodienyl", [{ from: "a6", to: "a5" }, { from: "b4", to: "a2" }, { from: "b2", to: "a3" }]],
  ];
  for (const [n, id, pushes] of cases) {
    it(`${id}: the spec's pushes reach the target, in order and reversed`, () => {
      expect(play(arrows(n), pushes)).toMatchObject({ done: true, wrong: 0 });
      expect(play(arrows(n), [...pushes].reverse())).toMatchObject({ done: true, wrong: 0 });
      expect(play(arrows(n), arrows(n).answer)).toMatchObject({ done: true, wrong: 0 });
    });
  }

  it("s04: each wrong push in the spec's table gets its Hint", () => {
    const h = hintTexts(section("u1-l06-s04"));
    expect(hintFor(4, "π 1–2 → C1", { from: "b1", to: "a1" })).toBe(h[0]);
    expect(hintFor(4, "lone pair on O2 → C1", { from: "a2", to: "a1" })).toBe(h[1]);
    expect(hintFor(4, "a C–H bond", { from: "b2", to: "a1" })).toBe(h[2]);
  });

  it("s06: each wrong push gets its Hint, and each half-way drawing its flag", () => {
    const h = hintTexts(section("u1-l06-s06"));
    expect(hintFor(6, "π 2–3 → C2", { from: "b2", to: "a2" })).toBe(h[0]);
    expect(hintFor(6, "lone pair on O3 → C2", { from: "a3", to: "a2" })).toBe(h[1]);
    expect(hintFor(6, "C1–C2 bond", { from: "b1", to: "a2" })).toBe(h[2]);
    const s = arrows(6);
    expect(arrowsView(task(s), play(s, [{ from: "a4", to: "a2" }])).flags.map((f) => f.text)).toEqual([
      "C has 10 e⁻: something has to leave. In resonance both arrows happen at once, so this halfway drawing isn't a real structure.",
    ]);
    expect(arrowsView(task(s), play(s, [{ from: "b2", to: "a3" }])).flags.map((f) => f.text)).toEqual([
      "C has only 6 e⁻ and O3 has a charge. This halfway drawing isn't real either. Fill the gap.",
    ]);
  });

  it("s08: each wrong push gets its Hint", () => {
    const h = hintTexts(section("u1-l06-s08"));
    expect(hintFor(8, "π 1–2 → C2", { from: "b1", to: "a2" })).toBe(h[0]);
    expect(hintFor(8, "π 1–2 → C1", { from: "b1", to: "a1" })).toBe(h[0]);
    expect(hintFor(8, "C2–C3 bond", { from: "b2", to: "a3" })).toBe(h[1]);
  });

  it("s10: each wrong push gets its Hint, and each half-way drawing its flag", () => {
    const h = hintTexts(section("u1-l06-s10"));
    expect(hintFor(10, "π 2–3 → N2", { from: "b2", to: "a2" })).toBe(h[0]);
    expect(hintFor(10, "lone pair on O3 → N2", { from: "a3", to: "a2" })).toBe(h[1]);
    expect(hintFor(10, "the C–N bond", { from: "b1", to: "a2" })).toBe(h[2]);
    const s = arrows(10);
    expect(arrowsView(task(s), play(s, [{ from: "a4", to: "a2" }])).flags.map((f) => f.text)).toEqual([
      "N would have 10 e⁻. A second-row atom can't, so another pair has to leave. This isn't a real structure.",
    ]);
    expect(arrowsView(task(s), play(s, [{ from: "b2", to: "a3" }])).flags.map((f) => f.text)).toEqual([
      "N has only 6 e⁻ and a 2+ charge. Not a real structure. Finish the move.",
    ]);
  });

  it("u1-res-ozone: open (no target drawn), its Hints and flags", () => {
    const s = arrows(11);
    expect(s.target).toBeUndefined();
    const h = hintTexts(section("u1-res-ozone"));
    expect(hintFor(11, "π 1–2 → O2", { from: "b1", to: "a2" })).toBe(h[0]);
    expect(hintFor(11, "lone pair on O1 → O2", { from: "a1", to: "a2" })).toBe(h[1]);
    expect(arrowsView(task(s), play(s, [{ from: "a3", to: "a2" }])).flags.map((f) => f.text)).toEqual([
      "Central O would have 10 e⁻. Something has to leave.",
    ]);
    expect(arrowsView(task(s), play(s, [{ from: "b1", to: "a1" }])).flags.map((f) => f.text)).toEqual([
      "Central O now has only 6 e⁻ and 2+. Not a real structure.",
    ]);
  });

  it("u1-res-oxocarbenium: its Hints, and the C5⁺ half-way drawing is called a valid contributor", () => {
    const s = arrows(13);
    expect(s.target?.structure.id).toBe("dihydropyranyl-oxocarbenium");
    const h = hintTexts(section("u1-res-oxocarbenium"));
    expect(hintFor(13, "lone pair on O6 → C1", { from: "a6", to: "a1" })).toBe(h[0]);
    expect(hintFor(13, "π 4–5 → C4", { from: "b4", to: "a4" })).toBe(h[1]);
    expect(hintFor(13, "π 4–5 → C5", { from: "b4", to: "a5" })).toBe(h[1]);
    expect(hintFor(13, "a ring σ bond", { from: "b1", to: "a2" })).toBe(h[2]);
    expect(arrowsView(task(s), play(s, [{ from: "a6", to: "a5" }])).flags.map((f) => f.text)).toEqual([
      "C5 would have 10 e⁻. Something has to leave.",
    ]);
    expect(arrowsView(task(s), play(s, [{ from: "b4", to: "a3" }])).flags.map((f) => f.text)).toEqual([
      "C5⁺, next to O. That's a valid contributor too. Keep going to reach the target.",
    ]);
  });

  it("u1-res-thiodienyl: its Hints, and every half-way drawing is flagged", () => {
    const s = arrows(14);
    const h = hintTexts(section("u1-res-thiodienyl"));
    expect(hintFor(14, "π 4–5 → C6", { from: "b4", to: "a6" })).toBe(h[0]);
    expect(hintFor(14, "π 2–3 → C2", { from: "b2", to: "a2" })).toBe(h[1]);
    expect(hintFor(14, "lone pair on S3 → C2", { from: "a3", to: "a2" })).toBe(h[2]);
    const pushes = [{ from: "a6", to: "a5" }, { from: "b4", to: "a2" }, { from: "b2", to: "a3" }];
    // Every partial set of the three pushes (one or two of them, any order that is accepted) gets a flag.
    for (const partial of [[0], [1], [2], [0, 1], [0, 2], [1, 2]]) {
      const st = play(s, partial.map((i) => pushes[i]));
      expect(st.pushes.length, `pushes ${partial}`).toBe(partial.length);
      const texts = arrowsView(task(s), st).flags.map((f) => f.text);
      expect(texts.length, `pushes ${partial}`).toBeGreaterThan(0);
      for (const t of texts) expect(t).toMatch(/^C\d (would have 10 e⁻\. Something has to leave\.|has only 6 e⁻\. Not a real structure, keep going\.)$/);
    }
  });
});
