// The homepage Push hero (#73): a Subject names one live push in subject.yaml,
// checked like a Draw-arrows Step and handed to the site as a ready task.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { arrowsAct, arrowsStart } from "../src/arrows.ts";
import { validTree, writeTree, type Tree } from "./tree.ts";

/** OH⁻ + H⁺, full Lewis: a1 = O (three lone pairs), a2 = H⁺, a3 = the H already on O. */
const hydroxideProton = {
  id: "hydroxide-proton",
  style: "full",
  smiles: "[OH-:1].[H+:2]",
  atoms: [
    { id: "a1", el: "O", x: 0, y: 0, charge: -1, lp: 3 },
    { id: "a2", el: "H", x: -2.4, y: -0.75, charge: 1 },
    { id: "a3", el: "H", x: 1.3, y: -0.75 },
  ],
  bonds: [{ id: "b1", a: "a1", b: "a3", order: 1 }],
};
const water = {
  id: "water",
  style: "full",
  smiles: "[OH:1][H:2]",
  atoms: [
    { id: "a1", el: "O", x: 0, y: 0, lp: 2 },
    { id: "a2", el: "H", x: -1.3, y: -0.75 },
    { id: "a3", el: "H", x: 1.3, y: -0.75 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a1", b: "a3", order: 1 },
  ],
};

const hero = (extra: object = {}) => ({
  start: "hydroxide-proton",
  results: ["water"],
  answer: [{ from: "a1", to: "a2" }],
  hints: [{ text: "Almost: let go on top of H⁺, the dashed circle." }],
  ...extra,
});

function treeWith(heroField: object | undefined): Tree {
  const tree = validTree();
  tree["chem/subject.yaml"] = { title: "Chemistry", ...(heroField && { hero: heroField }) };
  tree["chem/structures/hydroxide-proton.yaml"] = hydroxideProton;
  tree["chem/structures/water.yaml"] = water;
  return tree;
}
const build = (tree: Tree) => buildContent(writeTree(tree));

describe("The Push hero in the content build", () => {
  it("resolves the Subject's hero push into a task the homepage can play", () => {
    const { model, errors } = build(treeWith(hero()));
    expect(errors).toEqual([]);
    const task = model!.subjects[0].hero!;
    expect(task.start.id).toBe("hydroxide-proton");
    expect(task.results.map((r) => r.id)).toEqual(["water"]);
    // The lone pair on O onto H⁺ makes water in one push.
    const after = arrowsAct(task, arrowsStart(), { push: { from: "a1", to: "a2" } });
    expect(after.done).toBe(true);
  });

  it("a Subject without a hero has none", () => {
    const { model, errors } = build(treeWith(undefined));
    expect(errors).toEqual([]);
    expect(model!.subjects[0].hero).toBeUndefined();
  });

  it("checks the hero like a Draw-arrows Step: missing structures and pushes that don't reach water are errors", () => {
    expect(build(treeWith(hero({ results: ["ice"] }))).errors).toEqual([
      'chem/subject.yaml: hero: structure "ice" not found',
    ]);
    expect(build(treeWith(hero({ answer: [{ from: "b1", to: "a1" }] }))).errors).toEqual([
      "chem/subject.yaml: hero: push 1 (σ bond O1–H3 → O1) is not a step toward an accepted result",
    ]);
  });

  it("the real organic Subject's hero is OH⁻ + H⁺ → water", () => {
    const { model } = buildContent(contentRoot);
    const task = model!.subjects.find((s) => s.slug === "organic")!.hero!;
    expect(task.start.id).toBe("hydroxide-proton");
    expect(task.results.map((r) => r.id)).toEqual(["water"]);
  });
});
