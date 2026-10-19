// Lesson 8 (#86), the Unit 1 capstone, against its merged Lesson spec: every Prompt, Correct line,
// Hint, Reveal and Source note is read from docs/specs/unit-1/lesson-08-molecular-orbitals.md and
// compared with the built Lesson; the spec's `{molecule.key}` numbers map to the cited orbital data.
// Also: the start views, the orbitals on each card, and the Draw-arrows Steps played on the engine.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { arrowsAct, arrowsStart, type ArrowsTask } from "@astratron/content/arrows";
import { project } from "@astratron/content/molecule";
import { cite } from "@astratron/content/data";
import { buildContent, contentRoot, type DrawArrowsStep, type GradedStep, type Lesson, type MoleculeUse, type Step } from "@astratron/content";
import { sceneCatalog } from "@astratron/scenes/check";
import { sceneManifests } from "@astratron/scenes/manifests";
import { watchSceneManifests } from "@astratron/scenes/watch";
import { splitLesson } from "./answer-key.ts";

const spec = readFileSync(new URL("../../../docs/specs/unit-1/lesson-08-molecular-orbitals.md", import.meta.url), "utf8");
const built = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
const subject = built.model?.subjects.find((s) => s.slug === "organic");
const data = subject!.data;
const unit = subject?.courses[0].units.find((u) => u.id === "u1");
const lesson = unit?.lessons.find((l) => l.id === "u1-l08") as Lesson;
const step = (n: number) => lesson.steps[n - 1];

/** The spec's pipeline fields → our cited data. */
const FILES: Record<string, string> = {
  ethylene: "ethylene-b3lyp-orbitals",
  ethane: "ethane-b3lyp-orbitals",
  nh3: "ammonia-b3lyp-orbitals",
  bf3: "boron-trifluoride-b3lyp-orbitals",
  flow: "frontier-flow",
};
/** Fills the spec's `{ethylene.homo}` with the cited display value. */
const fill = (s: string) => s.replace(/\{(\w+)\.(\w+)\}/g, (_, f: string, k: string) => cite(data, `${FILES[f]}/${k}`).display);
/**
 * Markdown emphasis, escapes, line breaks and units don't count; the words do. An energy's display
 * carries "eV", so the spec's "{x} vs {y} eV" and our "{{x}} vs {{y}}" compare equal without units.
 */
const plain = (s: string | undefined) =>
  fill(s ?? "")
    .replace(/<br>/g, " ")
    .replace(/\\/g, "")
    .replace(/\*\*/g, "")
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*/g, "$1$2")
    .replace(/ eV/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** The spec section of a Step (`u1-l08-s04`) or a Check Problem (`u1-mo-ether-bf3`). */
function section(id: string): string {
  const start = spec.indexOf(`### \`${id}\``);
  if (start < 0) throw new Error(`no spec section ${id}`);
  const next = spec.indexOf("\n### ", start + 4);
  return spec.slice(start, next < 0 ? undefined : next);
}
/** A quoted field: `- **Prompt:** "…"` (it may run over several lines). */
const quoted = (text: string, field: string) => new RegExp(`\\*\\*${field}:\\*\\*[^"\\n]*"([\\s\\S]*?)"\\s*$`, "m").exec(text)?.[1];
/** The Hint column of a section's Hint table, in order. */
const hintTexts = (text: string) => [...text.matchAll(/^\s*\| [^|]+ \| "(.+)" \|\s*$/gm)].map((m) => m[1]);
/** A spec option list: "`a` Nothing … · `b` They snap …" or one option per line. */
const optionTexts = (text: string) => {
  const part = text.slice(text.indexOf("**Interaction:**"), text.indexOf("**Answer:**"));
  return [...part.matchAll(/`([a-d])` ([^·\n]+)/g)].map((m) => m[2].trim());
};
const stepIds = [...spec.matchAll(/^### `u1-l08-(s\d\d)`/gm)].map((m) => m[1]);
const problemIds = [...spec.matchAll(/^### `(u1-mo-[a-z0-9-]+)`/gm)].map((m) => m[1]);

describe("Lesson 8: Molecular Orbitals: Why Electrons Flow", () => {
  it("builds with the rest of the content", () => {
    expect(built.errors).toEqual([]);
    expect(lesson).toBeDefined();
  });

  it("has the spec's 15 Steps: Hook 1, Build 10, Check 3, Wrap 1, in the spec's types", () => {
    expect(lesson.steps.map((s) => s.id)).toEqual(Array.from({ length: 15 }, (_, i) => `s${String(i + 1).padStart(2, "0")}`));
    expect(lesson.phases).toEqual({ hook: 1, build: 10, check: 3, wrap: 1 });
    expect(lesson.steps.map((s) => s.type)).toEqual([
      "multiple-choice", "explain", "rotate-and-identify", "manipulate", "explain", "rotate-and-identify", "multiple-choice", "explain",
      "rotate-and-identify", "multiple-choice", "draw-arrows", "rank", "rotate-and-identify", "draw-arrows", "explain",
    ]);
  });

  it("is the Unit's capstone, last in Lesson order, with the spec's title, goal, key idea and signature", () => {
    expect(lesson.capstone).toBe(true);
    expect(lesson.title).toBe("Molecular Orbitals: Why Electrons Flow");
    expect(plain(lesson.goal)).toBe(plain(/\| Goal \| (.+) \|/.exec(spec)![1]));
    expect(plain(lesson.keyIdea)).toBe(plain(/\| Key idea \| (.+) \|/.exec(spec)![1]));
    expect(lesson.signature).toBe("manipulate");
    const real = unit!.lessons.map((l) => l.id).filter((id) => /^u1-l\d\d$/.test(id));
    expect(real).toEqual([...real].sort());
    expect(real.at(-1)).toBe("u1-l08");
  });

  it("its Check Steps play the spec's three Problems, in order, approved and tagged with this Lesson", () => {
    const checks = lesson.steps.filter((s) => s.phase === "check") as GradedStep[];
    expect(checks.map((s) => s.problemId)).toEqual(problemIds);
    for (const [id, difficulty] of [["u1-mo-bond-order-rank", 1], ["u1-mo-ethylene-lumo", 2], ["u1-mo-ether-bf3", 3]] as const)
      expect(unit!.bank.find((p) => p.id === id), id).toMatchObject({ status: "approved", lesson: "u1-l08", check: true, difficulty });
  });
});

describe("Lesson 8 text matches its spec", () => {
  const cases: [string, Step][] = [
    ...stepIds.filter((id) => !["s12", "s13", "s14"].includes(id)).map((id): [string, Step] => [`u1-l08-${id}`, lesson.steps.find((s) => s.id === id)!]),
    ...problemIds.map((id, i): [string, Step] => [id, step(12 + i)]),
  ];
  for (const [id, s] of cases)
    it(`${id}: Prompt, options, Correct line, Hints and Reveal`, () => {
      const text = section(id);
      const prompt = s.type === "explain" ? s.text : s.prompt;
      expect(plain(prompt)).toBe(plain(quoted(text, "Prompt")));
      if (s.type === "explain") return;
      const graded = s as GradedStep;
      if ("options" in graded && graded.options) expect(graded.options.map((o) => plain(o.text))).toEqual(optionTexts(text).map(plain));
      if (!(s.type === "multiple-choice" && s.prediction)) expect(plain(graded.correct)).toBe(plain(quoted(text, "Correct line")));
      expect((graded.hints ?? []).map((h) => plain(h.text))).toEqual(hintTexts(text).map(plain));
      // The spec's Reveal line: its last quoted words (after any visual cue, but not screen-reader text)
      // open our reveal; the visual parts the card can't draw are written after them.
      const line = /^- \*\*Reveal[^:]*:\*\*(.*)$/m.exec(text)?.[1] ?? "";
      const reveal = line.includes("Screen reader") ? undefined : [...line.matchAll(/"([^"]+)"/g)].at(-1)?.[1];
      if (reveal) expect(plain(graded.reveal).startsWith(plain(reveal)), plain(graded.reveal)).toBe(true);
    });

  it("Source notes: the spec's quoted notes as written; the computed-orbital note from the cited data, with the model caveat", () => {
    for (const id of stepIds.filter((n) => !["s12", "s13", "s14"].includes(n))) {
      const text = section(`u1-l08-${id}`);
      const s = lesson.steps.find((x) => x.id === id)!;
      const quotedNote = /\*\*Source note:\*\* "([^"]+)"/.exec(text)?.[1];
      const facts = /with the OpenStax §1\.11 facts line/.test(text);
      if (quotedNote) expect(plain(s.sourceNote), id).toBe(plain(quotedNote));
      else if (facts) expect(plain(s.sourceNote), id).toMatch(/^Bonding and antibonding orbitals of H₂: facts as in OpenStax Organic Chemistry §1\.11/);
      else if (/\*\*Source note:\*\* the computed-orbital note, adding: "([^"]+)"/.test(text))
        expect(plain(s.sourceNote), id).toBe(plain(/adding: "([^"]+)"/.exec(text)![1]));
      else expect(s.sourceNote, id).toBeUndefined();
      if (/\*\*Source note:\*\* the computed-orbital note/.test(text)) {
        const notes = (s.citations ?? []).map((c) => c.source.note ?? "");
        expect(notes.join(" "), id).toContain("Computed orbital energies are model values: compare them with each other, not with measured energies.");
        expect((s.citations ?? []).some((c) => c.quantity === "isovalue" || c.quantity === "energy"), id).toBe(true);
      }
    }
  });
});

describe("Lesson 8's computed numbers", () => {
  it("s07 cites both HOMOs and both gaps; s10 both flows and all four energies (the Scene's Source note)", () => {
    const refs = (n: number) => (step(n).citations ?? []).map((c) => c.ref);
    expect(refs(7)).toEqual(expect.arrayContaining(["ethylene-b3lyp-orbitals/homo", "ethane-b3lyp-orbitals/homo", "ethylene-b3lyp-orbitals/gap", "ethane-b3lyp-orbitals/gap"]));
    expect(refs(10)).toEqual(
      expect.arrayContaining(["frontier-flow/nh3_bf3", "frontier-flow/bf3_nh3", "ammonia-b3lyp-orbitals/homo", "boron-trifluoride-b3lyp-orbitals/lumo"]),
    );
  });

  it("every energy shows to 1 decimal in eV", () => {
    for (const c of lesson.steps.flatMap((s) => s.citations ?? []).filter((c) => c.quantity === "energy")) expect(c.display).toMatch(/^−?\d+\.\d eV$/);
  });

  it("the spec's sanity checks 3 and 5 hold on the data the Lesson cites", () => {
    const v = (ref: string) => Number(cite(data, ref).value);
    expect(v("ethylene-b3lyp-orbitals/homo")).toBeGreaterThan(v("ethane-b3lyp-orbitals/homo"));
    expect(v("ethylene-b3lyp-orbitals/gap")).toBeLessThan(v("ethane-b3lyp-orbitals/gap"));
    expect(v("frontier-flow/nh3_bf3")).toBeLessThan(v("frontier-flow/bf3_nh3"));
  });
});

describe("Lesson 8's orbital cards", () => {
  const card = (n: number) => (step(n) as { molecule?: MoleculeUse }).molecule!;

  it("s03 shows H₂'s σ as A and σ* as B, side-on with the H–H axis level, measuring off, and the page never names which is which", () => {
    const m = card(3);
    expect(m.orbitalLabels).toBe("hide");
    expect(m.measure).toBe(false);
    expect([m.label, m.toggle![0].label]).toEqual(["A", "B"]);
    const sigma = data["hydrogen-b3lyp-orbitals"].orbitals!.list;
    expect(m.orbitals![0].mesh).toContain(sigma.sigma.sha256.slice(0, 16));
    expect(m.toggle![0].orbitals![0].mesh).toContain(sigma["sigma-star"].sha256.slice(0, 16));
    const [h1, h2] = project(m.atoms, m.orientation);
    expect(Math.abs(h1[1] - h2[1])).toBeLessThan(0.01);
    expect(Math.abs(h1[2] - h2[2])).toBeLessThan(0.01);
    const { page } = splitLesson(lesson);
    const shown = JSON.stringify(page.steps[2]);
    for (const telling of ["sigma", "σ*", "LUMO", "HOMO"]) expect(shown).not.toContain(telling);
  });

  it("s06 and u1-mo-ethylene-lumo start face-on: every atom at one depth, so neither node shows yet", () => {
    for (const m of [card(6), card(13), card(13).toggle![0]]) {
      const depths = project(m.atoms, m.orientation).map((p) => p[2]);
      expect(Math.max(...depths) - Math.min(...depths)).toBeLessThan(0.01);
    }
    expect(card(13).orbitals![0].mesh).toContain(data["ethylene-b3lyp-orbitals"].orbitals!.list.lumo.sha256.slice(0, 16));
  });

  it("s09 shows NH₃'s HOMO and BF₃'s LUMO in one frame, looking straight down from N onto B", () => {
    const m = card(9);
    expect(m.orbitals!.map((o) => o.ref)).toEqual(["ammonia-bf3-pair-orbitals/nh3-homo", "ammonia-bf3-pair-orbitals/bf3-lumo"]);
    const p = project(m.atoms, m.orientation);
    const [n, b] = [p[0], p[4]];
    expect(Math.hypot(n[0] - b[0], n[1] - b[1])).toBeLessThan(0.01);
    expect(n[2]).toBeGreaterThan(b[2]);
    expect(m.measure).toBe(false);
  });
});

describe("Lesson 8's Draw-arrows Steps on the grading engine", () => {
  const play = (s: DrawArrowsStep, pushes: { from: string; to: string }[]) => {
    const task: ArrowsTask = { start: s.start.structure, results: s.results, answer: s.answer, hints: s.hints };
    return pushes.reduce((state, push) => arrowsAct(task, state, { push }), arrowsStart());
  };

  it("s11: N's lone pair → B finishes; the start is marked HOMO and LUMO (empty)", () => {
    const s = step(11) as DrawArrowsStep;
    expect(play(s, [{ from: "a1", to: "a2" }]).done).toBe(true);
    expect(s.start.highlight?.marks?.map((m) => m.text)).toEqual(["HOMO", "LUMO (empty)"]);
  });

  it("s11: each spec wrong push gets its Hint", () => {
    const s = step(11) as DrawArrowsStep;
    const hint = (from: string, to: string) => {
      const state = play(s, [{ from, to }]);
      return state.last?.kind === "wrong" ? state.last.hint : undefined;
    };
    const texts = s.hints!.map((h) => h.text);
    expect(hint("a3", "a2")).toBe(texts[0]);
    expect(hint("b1", "a1")).toBe(texts[1]);
    expect(hint("b4", "a2")).toBe(texts[2]);
    expect(hint("a1", "a4")).toBe(texts[3]);
  });

  it("u1-mo-ether-bf3: either O lone pair → B finishes, with no target drawn", () => {
    const s = step(14) as DrawArrowsStep;
    expect(s.target).toBeUndefined();
    expect(play(s, [{ from: "a2", to: "a4" }]).done).toBe(true);
  });
});
