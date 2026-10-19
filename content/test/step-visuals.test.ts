// What a Step shows besides its interaction (#79, Lesson 1): drawn figures
// with a ringed atom or outlined bond, a Scene that plays only once the Step is
// answered (`revealScene`), and an `aside` one tap away (a Scene or a table of
// drawings). Problems carry them too, so their Check Steps show them.
import { describe, expect, it } from "vitest";
import { buildContent, type SceneCatalog } from "../src/index.ts";
import { elements, lesson, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

/** Ammonium, NH₄⁺, full Lewis. */
const ammonium = {
  id: "ammonium",
  style: "full",
  atoms: [
    { id: "a1", el: "N", x: 0, y: 0, charge: 1 },
    { id: "a2", el: "H", x: 1.5, y: 0 },
    { id: "a3", el: "H", x: -1.5, y: 0 },
    { id: "a4", el: "H", x: 0, y: 1.5 },
    { id: "a5", el: "H", x: 0, y: -1.5 },
  ],
  bonds: ["a2", "a3", "a4", "a5"].map((b, i) => ({ id: `b${i + 1}`, a: "a1", b, order: 1 })),
};

/** An oxygen with a single and a double bond to the rest of a molecule (loose ends `*`) and one lone pair. */
const oxygenFragment = {
  id: "o-three-bonds",
  style: "full",
  atoms: [
    { id: "a1", el: "O", x: 0, y: 0, charge: 1, lp: 1 },
    { id: "a2", el: "*", x: -1.5, y: 0 },
    { id: "a3", el: "*", x: 1.5, y: 0 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a1", b: "a3", order: 2 },
  ],
};

const catalog: SceneCatalog = {
  strip: {
    states: {
      highlight: {
        kind: "choice",
        label: "Highlight",
        options: [
          { id: "all", label: "All" },
          { id: "some", label: "Some" },
        ],
        default: "all",
      },
    },
    data: ["elements/C.colour"],
  },
};

const numeric = (extra: object = {}) => ({
  id: "s03",
  phase: "build",
  type: "numeric",
  prompt: "Ammonium. What is the formal charge on nitrogen?",
  unitSymbol: "",
  answer: 1,
  tolerance: 0,
  correct: "5 − 0 − 4 = +1.",
  hints: [{ match: 0, text: "Count the bonds again." }, { text: "Valence, minus lone-pair electrons, minus bonds." }],
  reveal: "+1.",
  figures: [{ structure: "ammonium", hide: ["charges"], ring: ["a1"], alt: "Ammonium, nitrogen ringed, charge hidden." }],
  ...extra,
});

function build(s03: object, edit: (tree: Tree) => void = () => {}) {
  const steps: object[] = sampleSteps();
  steps[2] = s03;
  const tree = validTree();
  tree[L] = lesson({ steps });
  tree["chem/structures/ammonium.yaml"] = ammonium;
  tree["chem/structures/o-three-bonds.yaml"] = oxygenFragment;
  tree["chem/data/elements.yaml"] = elements();
  edit(tree);
  return buildContent(writeTree(tree), { scenes: catalog });
}
const stepsOf = (result: ReturnType<typeof build>) => result.model!.subjects[0].courses[0].units[0].lessons[0].steps;

describe("figures: structures drawn with a Step", () => {
  it("arrive resolved, with what they hide, the ringed atom and their screen-reader text", () => {
    const result = build(numeric());
    expect(result.errors).toEqual([]);
    const [figure] = stepsOf(result)[2].figures!;
    expect(figure.view.structure.id).toBe("ammonium");
    expect(figure.view.hide).toEqual(["charges"]);
    expect(figure.view.highlight).toEqual({ ring: ["a1"], outline: [] });
    expect(figure.alt).toBe("Ammonium, nitrogen ringed, charge hidden.");
  });

  it("may be fragments with loose bond ends", () => {
    const result = build(numeric({ figures: [{ structure: "o-three-bonds", hide: ["charges"], alt: "An oxygen." }] }));
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2].figures![0].view.structure.atoms.map((a) => a.el)).toEqual(["O", "*", "*"]);
  });

  it("reject an unknown structure and a ring or outline the structure doesn't have", () => {
    expect(
      build(numeric({ figures: [{ structure: "nope", alt: "x" }, { structure: "ammonium", ring: ["a9"], outline: ["b9"], alt: "y" }] }))
        .errors,
    ).toEqual([
      `${L}: step s03: structure "nope" not found`,
      `${L}: step s03: structure "ammonium" has no atom "a9"`,
      `${L}: step s03: structure "ammonium" has no bond "b9"`,
    ]);
  });
});

describe("a Tap-to-identify drawing", () => {
  const tap = (extra: object = {}) => ({
    id: "s03",
    phase: "build",
    type: "tap-to-identify",
    prompt: "Tap the δ− atom of the outlined bond.",
    structure: "ammonium",
    outline: ["b1"],
    alt: "Ammonium with one N–H bond outlined.",
    tappable: { atoms: ["a1", "a2"] },
    answer: ["a1"],
    correct: "N pulls harder.",
    hints: [{ text: "Bigger number is δ−." }],
    reveal: "N.",
    ...extra,
  });

  it("outlines the bonds a Step points at and carries a description of the whole drawing", () => {
    const result = build(tap());
    expect(result.errors).toEqual([]);
    const step = stepsOf(result)[2];
    if (step.type !== "tap-to-identify") throw new Error("not a Tap Step");
    expect(step.structure.highlight).toEqual({ ring: [], outline: ["b1"] });
    expect(step.alt).toBe("Ammonium with one N–H bond outlined.");
  });

  it("rejects an outline the structure doesn't have", () => {
    expect(build(tap({ outline: ["b7"] })).errors).toEqual([`${L}: step s03: structure "ammonium" has no bond "b7"`]);
  });
});

describe("revealScene: a Scene shown once the Step is answered", () => {
  it("is resolved like a Step's Scene, and its numbers join the Source note", () => {
    const result = build(numeric({ revealScene: { id: "strip", state: { highlight: "some" } } }));
    expect(result.errors).toEqual([]);
    const step = stepsOf(result)[2];
    expect(step.type !== "explain" && step.revealScene).toMatchObject({ id: "strip", state: { highlight: "some" } });
    expect(step.citations?.map((c) => c.ref)).toEqual(["elements/C.colour"]);
  });

  it("is checked against the Scene registry", () => {
    expect(build(numeric({ revealScene: { id: "strip", state: { highlight: "none" } } })).errors).toEqual([
      `${L}: step s03: revealScene: Scene "strip" state "highlight" must be one of all, some`,
    ]);
  });
});

describe("a still Scene", () => {
  it("is shown on its poster frame without playback (e.g. the Hook's setup before the reveal plays)", () => {
    const result = build(numeric({ scene: { id: "strip", still: true } }));
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2].scene).toMatchObject({ id: "strip", still: true });
  });
});

describe("aside: something one tap away", () => {
  it("can hold a Scene", () => {
    const result = build(numeric({ aside: { label: "Show values", scene: { id: "strip" } } }));
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2].aside).toMatchObject({ label: "Show values", scene: { id: "strip", state: { highlight: "all" } } });
  });

  it("can hold a table of drawings, with empty cells", () => {
    const table = {
      columns: ["+1", "0"],
      caption: "Our own table.",
      rows: [{ head: "N", cells: [{ structure: "ammonium", alt: "N with 4 bonds." }, null] }],
    };
    const result = build(numeric({ aside: { label: "Card", table } }));
    expect(result.errors).toEqual([]);
    const aside = stepsOf(result)[2].aside!;
    expect(aside.table!.columns).toEqual(["+1", "0"]);
    expect(aside.table!.caption).toBe("Our own table.");
    expect(aside.table!.rows[0].cells[0]?.view.structure.id).toBe("ammonium");
    expect(aside.table!.rows[0].cells[1]).toBeNull();
  });

  it("checks its Scene and structures", () => {
    expect(build(numeric({ aside: { label: "Show values", scene: { id: "nope" } } })).errors).toEqual([
      `${L}: step s03: aside: Scene "nope" is not in the Scene registry`,
    ]);
  });
});

describe("a written Source note (credits that aren't cited numbers)", () => {
  it("rides on the Step, and a Problem's on its Check Step", () => {
    const note = "Formal charge as in MIT OCW 5.12, Problem Set 1 Q1.";
    const meta = { id: "p1", unit: "u1", lesson: "l1", difficulty: 1, status: "approved", source: "Original" };
    const { id: _i, phase: _p, ...interaction } = numeric({ sourceNote: note });
    const result = build(numeric({ sourceNote: note }), (t) => (t["chem/problems/p1.yaml"] = { ...meta, ...interaction }));
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2].sourceNote).toBe(note);
    expect(stepsOf(result)[7].sourceNote).toBe(note);
  });
});

describe("Problems carry figures, revealScene and aside into their Check Steps", () => {
  const { id: _i, phase: _p, ...interaction } = numeric({
    revealScene: { id: "strip" },
    aside: { label: "Show values", scene: { id: "strip", state: { highlight: "some" } } },
  });
  const meta = { id: "p1", unit: "u1", lesson: "l1", difficulty: 1, status: "approved", source: "Original" };
  const edit = (p1: object) => (t: Tree) => (t["chem/problems/p1.yaml"] = { ...meta, ...p1 });

  it("resolved", () => {
    const result = build(numeric(), edit(interaction));
    expect(result.errors).toEqual([]);
    const check = stepsOf(result)[7];
    expect(check.figures?.[0].view.highlight?.ring).toEqual(["a1"]);
    expect(check.type !== "explain" && check.revealScene?.id).toBe("strip");
    expect(check.aside?.scene?.state).toEqual({ highlight: "some" });
    expect(check.citations?.map((c) => c.ref)).toEqual(["elements/C.colour"]);
  });

  it("checked", () => {
    expect(build(numeric(), edit({ ...interaction, revealScene: { id: "nope" } })).errors).toEqual([
      'chem/problems/p1.yaml: revealScene: Scene "nope" is not in the Scene registry',
    ]);
  });
});
