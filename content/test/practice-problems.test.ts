// Unit 1 Practice Problems (#87): the 24 Problems of docs/specs/unit-1/practice-problems.md are in
// the Bank as the spec writes them (tags, difficulty, Source line, credit, Prompt, Correct line,
// Hints, Source note), and the spec's build-time sanity checks hold on the cited data and the
// structure files. If a check fails, the Problem is rewritten, never the data.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { project, viewMatrix, type Vec3, type ViewSpec } from "../src/molecule.ts";
import { expectedLonePairs, hydrogenCount, impliedHydrogens } from "../src/valence.ts";
import { readStructure } from "../src/structure-file.ts";
import { arrowsAct, arrowsStart } from "../src/arrows.ts";
import type { Push } from "../src/model.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const data = organic.data;
const unit = organic.courses[0].units[0];
const spec = readFileSync(join(contentRoot, "..", "..", "docs", "specs", "unit-1", "practice-problems.md"), "utf8");
const yaml = (path: string) => parse(readFileSync(join(contentRoot, "organic", path), "utf8"));

const TYPES: Record<string, string> = {
  "Numeric input": "numeric",
  "Tap-to-identify": "tap-to-identify",
  "Multiple choice": "multiple-choice",
  "Multiple choice (structure cards)": "multiple-choice",
  "Multiple choice (multi-correct)": "multiple-choice",
  "Rotate-and-identify 3D": "rotate-and-identify",
  "Draw arrows": "draw-arrows",
  "Draw arrows (open)": "draw-arrows",
  "Rank / order": "rank",
};

/** Every Problem the spec lists: id, Lesson tag, type, difficulty and its section of the spec. */
const listed = [...spec.matchAll(/^## Lesson (\d):[\s\S]*?(?=^## |(?![\s\S]))/gm)].flatMap((lesson) =>
  [...lesson[0].matchAll(/^### `([a-z0-9-]+)` · (.+?) · difficulty (\d)\n([\s\S]*?)(?=^### |^---|(?![\s\S]))/gm)].map((m) => ({
    id: m[1],
    lesson: `u1-l0${lesson[1]}`,
    type: TYPES[m[2]],
    difficulty: Number(m[3]),
    text: m[4],
  })),
);

/** Spec text and Problem text in one form: cites as {file.key}, Markdown line breaks as spaces. */
const norm = (s: string) =>
  s
    .replace(/\{\{([\w-]+)\/([\w.-]+)\}\}/g, "{$1.$2}")
    .replace(/<br>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const quoted = (text: string, field: string) => {
  const m = text.match(new RegExp(`\\*\\*${field}:\\*\\* "([\\s\\S]*?)"\\n`));
  return m ? norm(m[1]) : undefined;
};
const line = (text: string, field: string) => text.match(new RegExp(`\\*\\*${field}:\\*\\* (.*)`))?.[1].trim();
const hintTexts = (text: string) => [...text.matchAll(/^\s*\| [^|\n]+ \| "(.*)" \|$/gm)].map((m) => norm(m[1]));

describe("the spec's 24 Practice Problems", () => {
  it("are three per core Lesson, one at each difficulty", () => {
    expect(listed).toHaveLength(24);
    for (let n = 1; n <= 8; n++)
      expect(listed.filter((p) => p.lesson === `u1-l0${n}`).map((p) => p.difficulty)).toEqual([1, 2, 3]);
    expect(listed.every((p) => p.type)).toBe(true);
  });

  it.each(listed.map((p) => [p.id, p] as const))("%s is an approved Problem file with the spec's tags, Source line and credit", (id, p) => {
    const file = yaml(`problems/${id}.yaml`);
    expect(file).toMatchObject({ id, unit: "u1", lesson: p.lesson, difficulty: p.difficulty, type: p.type, status: "approved" });
    expect(file.source).toBe(line(p.text, "Source line"));
    // An adapted Problem credits its author and licence; an original one has nothing to credit.
    if (file.source.startsWith("Adapted")) expect(file.credit).toMatch(/CC BY-NC-SA 4\.0$/);
    else expect(file.credit).toBeUndefined();
  });

  it.each(listed.map((p) => [p.id, p] as const))("%s has the spec's Prompt, Correct line, Hints and Source note", (id, p) => {
    const file = yaml(`problems/${id}.yaml`);
    expect(norm(file.prompt)).toBe(quoted(p.text, "Prompt"));
    expect(norm(file.correct)).toBe(quoted(p.text, "Correct line"));
    expect(new Set(file.hints.map((h: { text: string }) => norm(h.text)))).toEqual(new Set(hintTexts(p.text)));
    const note = line(p.text, "Source note");
    if (note && /^"[^"]*"$/.test(note)) expect(norm(file.sourceNote)).toBe(norm(note.slice(1, -1)));
  });

  it("are in Unit 1's Bank as Practice Problems: drawable, and no Lesson's Check Step", () => {
    for (const p of listed) {
      const inBank = unit.bank.find((b) => b.id === p.id);
      expect(inBank, p.id).toMatchObject({ lesson: p.lesson, status: "approved", check: false, onRamp: false });
      expect(inBank!.step.type).toBe(p.type);
    }
  });
});

describe("the spec's build-time sanity checks", () => {
  const v = (ref: string) => {
    const [file, key] = ref.split("/");
    return Number(data[file].values[key].value);
  };
  const structure = (id: string) => readStructure(contentRoot, "organic", id);

  it("B is below H and N below O on Lesson 1's Pauling scale (u1-polarity-tap-dminus: H is δ− in B–H)", () => {
    expect(v("electronegativity-pauling/B")).toBeLessThan(v("electronegativity-pauling/H"));
    expect(v("electronegativity-pauling/N")).toBeLessThan(v("electronegativity-pauling/O"));
  });

  it("furan has 4 H (C₄H₄O), caffeine 8 lone pairs, ibuprofen exactly 3 carbons with no H", () => {
    expect(hydrogenCount(structure("furan"))).toBe(4);
    const caffeine = structure("caffeine");
    expect(Object.values(expectedLonePairs(caffeine)).reduce((a, b) => a + b, 0)).toBe(8);
    const ibuprofen = structure("ibuprofen");
    const bare = ibuprofen.atoms.filter((a) => a.el === "C" && impliedHydrogens(ibuprofen)[a.id] === 0).map((a) => a.id);
    expect(bare).toHaveLength(3);
    // ...and they are the ones the Tap Problem's answer names.
    expect(new Set(yaml("problems/u1-draw-ibuprofen-bare-carbons.yaml").answer)).toEqual(new Set(bare));
  });

  it("u1-3d-perspective-b: with H and CH₂CH₃ in the page as in the right-hand drawing, F points away and CH₃ toward you", () => {
    const views = parse(readFileSync(join(contentRoot, "organic", "views.yaml"), "utf8")) as Record<string, Record<string, ViewSpec>>;
    const atoms = data["2-fluorobutane-r"].atoms!.list;
    const shown = (view: string) => {
      const p = project(atoms, viewMatrix(atoms, views["2-fluorobutane-r"][view]));
      return p.map((q) => q.map((x, k) => x - p[1][k]) as Vec3);
    };
    const [CH3, F, ETHYL, H] = [0, 2, 3, 8];
    // Left drawing: H up and F left in the page; CH₃ on a dash and CH₂CH₃ on a wedge, both below.
    const left = shown("ps1-q2b-left");
    for (const i of [H, F]) expect(left[i][2]).toBeCloseTo(0, 6);
    expect(left[H][0]).toBeCloseTo(0, 6);
    expect(left[H][1]).toBeGreaterThan(0.9);
    expect(left[F][0]).toBeLessThan(-0.5);
    expect(left[CH3][2]).toBeLessThan(-0.5);
    expect(left[ETHYL][2]).toBeGreaterThan(0.5);
    for (const i of [CH3, ETHYL]) expect(left[i][1]).toBeLessThan(0);
    // Right drawing: H lower left and CH₂CH₃ lower right in the page; the dash and wedge above.
    const right = shown("ps1-q2b-right");
    for (const i of [H, ETHYL]) expect(right[i][2]).toBeCloseTo(0, 6);
    expect(right[H][0]).toBeLessThan(-0.5);
    expect(right[ETHYL][0]).toBeGreaterThan(0.5);
    for (const i of [H, ETHYL]) expect(right[i][1]).toBeLessThan(0);
    for (const i of [F, CH3]) expect(right[i][1]).toBeGreaterThan(0);
    // The answer (a): F on the dash (away), CH₃ on the wedge (toward you).
    expect(right[F][2]).toBeLessThan(-0.5);
    expect(right[CH3][2]).toBeGreaterThan(0.5);
    expect(yaml("problems/u1-3d-perspective-b.yaml").answer).toEqual(["a"]);
  });

  it("u1-hyb-allene-planes: the H–C1–H and H–C3–H planes meet at 90° within 0.5°", () => {
    const allene = data.allene;
    const atoms = allene.atoms!.list;
    const at = (i: number): Vec3 => [atoms[i].x, atoms[i].y, atoms[i].z];
    const carbons = atoms.map((a, i) => (a.element === "C" ? i : -1)).filter((i) => i >= 0);
    const bonded = (i: number) => allene.bonds!.filter((b) => b.a === i || b.b === i).map((b) => (b.a === i ? b.b : b.a));
    const ends = carbons.filter((c) => bonded(c).some((n) => atoms[n].element === "H"));
    expect(ends).toHaveLength(2);
    const normal = (c: number) => {
      const [h1, h2] = bonded(c).filter((n) => atoms[n].element === "H");
      return cross(sub(at(h1), at(c)), sub(at(h2), at(c)));
    };
    const [n1, n3] = ends.map(normal);
    const angle = (Math.acos(Math.abs(dot(n1, n3)) / (len(n1) * len(n3))) * 180) / Math.PI;
    expect(Math.abs(angle - 90)).toBeLessThan(0.5);
  });

  it("u1-hyb-allene-planes starts three-quarter: the left plane's CH₂ (C1) on the left, the right one's (C2) on the right", () => {
    const views = parse(readFileSync(join(contentRoot, "organic", "views.yaml"), "utf8")) as Record<string, Record<string, ViewSpec>>;
    const atoms = data.allene.atoms!.list;
    const p = project(atoms, viewMatrix(atoms, views.allene["three-quarter"]));
    expect(p[1][0]).toBeLessThan(-0.5);
    expect(p[2][0]).toBeGreaterThan(0.5);
    const problem = yaml("problems/u1-hyb-allene-planes.yaml");
    expect(problem.molecule.planes).toEqual([
      { through: [3, 1, 4], label: "left CH₂ plane" },
      { through: [5, 2, 6], label: "right CH₂ plane" },
    ]);
  });
});

describe("the Draw-arrows Practice Problems grade the spec's pushes", () => {
  const task = (id: string) => {
    const step = unit.bank.find((p) => p.id === id)!.step;
    if (step.type !== "draw-arrows") throw new Error(`${id} is not Draw arrows`);
    return { ...step, start: step.start.structure, results: step.results ?? [] };
  };
  const play = (id: string, pushes: Push[]) => pushes.reduce((s, push) => arrowsAct(task(id), s, { push }), arrowsStart());
  const hintFor = (id: string, before: Push[], wrong: Push) => {
    const state = play(id, [...before, wrong]);
    return state.last?.kind === "wrong" ? state.last.hint : `not wrong: ${state.last?.kind}`;
  };
  const hint = (id: string, starts: string) => {
    const file = yaml(`problems/${id}.yaml`);
    return file.hints.find((h: { text: string }) => h.text.startsWith(starts)).text as string;
  };

  it.each(["u1-res-pentadienyl-cation", "u1-res-acac-enolate", "u1-res-phenoxide-para", "u1-mo-alcl3-chloromethane"])(
    "%s: the answer's pushes, in order, reach the target first try",
    (id) => {
      const state = play(id, task(id).answer);
      expect(state.done).toBe(true);
      expect(state.wrong).toBe(0);
    },
  );

  it("u1-res-acac-enolate: either oxygen is right", () => {
    const state = play("u1-res-acac-enolate", [{ from: "a4", to: "b4" }, { from: "b5", to: "a6" }]);
    expect(state.done && state.wrong).toBe(0);
  });

  it("each spec wrong push gets its Hint", () => {
    expect(hintFor("u1-res-pentadienyl-cation", [], { from: "b3", to: "a3" })).toBe(hint("u1-res-pentadienyl-cation", "That parks"));
    expect(hintFor("u1-res-pentadienyl-cation", [], { from: "b1", to: "b2" })).toBe(hint("u1-res-pentadienyl-cation", "That π bond"));
    expect(hintFor("u1-res-acac-enolate", [], { from: "b2", to: "a2" })).toBe(hint("u1-res-acac-enolate", "Oxygen is"));
    expect(hintFor("u1-res-acac-enolate", [], { from: "a3", to: "a2" })).toBe(hint("u1-res-acac-enolate", "That oxygen"));
    expect(hintFor("u1-res-acac-enolate", [{ from: "a4", to: "b3" }], { from: "b5", to: "a6" })).toBe(hint("u1-res-acac-enolate", "The pair that came"));
    expect(hintFor("u1-res-phenoxide-para", [], { from: "b2", to: "a3" })).toBe(hint("u1-res-phenoxide-para", "That puts"));
    expect(hintFor("u1-res-phenoxide-para", [], { from: "b6", to: "a6" })).toBe(hint("u1-res-phenoxide-para", "Start where"));
    expect(hintFor("u1-res-phenoxide-para", [], { from: "b3", to: "a3" })).toBe(hint("u1-res-phenoxide-para", "σ bonds"));
    expect(hintFor("u1-mo-alcl3-chloromethane", [], { from: "a4", to: "a3" })).toBe(hint("u1-mo-alcl3-chloromethane", "Those chlorines"));
    expect(hintFor("u1-mo-alcl3-chloromethane", [], { from: "b1", to: "a2" })).toBe(hint("u1-mo-alcl3-chloromethane", "σ bonds sit low"));
    expect(hintFor("u1-mo-alcl3-chloromethane", [], { from: "a2", to: "a1" })).toBe(hint("u1-mo-alcl3-chloromethane", "Carbon already"));
  });
});

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.sqrt(dot(a, a));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
