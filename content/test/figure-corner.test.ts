// A figure's right-angle mark (Lesson 3, #81): `corner: [a, centre, b]` marks the angle at the
// centre atom of a flat drawing, e.g. the flat Lewis CH₄'s right angle that the Hook asks about.
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { lesson, sampleSteps, validTree, writeTree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";
const flatMethane = {
  id: "flat-methane",
  style: "full",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "H", x: 1.5, y: 0 },
    { id: "a3", el: "H", x: -1.5, y: 0 },
    { id: "a4", el: "H", x: 0, y: -1.5 },
    { id: "a5", el: "H", x: 0, y: 1.5 },
  ],
  bonds: ["a2", "a3", "a4", "a5"].map((b, i) => ({ id: `b${i + 1}`, a: "a1", b, order: 1 })),
};

function build(corner: string[]) {
  const steps: object[] = sampleSteps();
  steps[1] = { id: "s02", phase: "build", type: "explain", text: "Methane on paper.", figures: [{ structure: "flat-methane", corner, alt: "Flat methane." }] };
  const tree = validTree();
  tree[L] = lesson({ steps });
  tree["chem/structures/flat-methane.yaml"] = flatMethane;
  return buildContent(writeTree(tree));
}

describe("a figure's right-angle mark", () => {
  it("reaches the drawing's highlight", () => {
    const result = build(["a4", "a1", "a2"]);
    expect(result.errors).toEqual([]);
    const figure = result.model!.subjects[0].courses[0].units[0].lessons[0].steps[1].figures![0];
    expect(figure.view.highlight?.corner).toEqual(["a4", "a1", "a2"]);
  });

  it("names atoms the structure has", () => {
    expect(build(["a4", "a1", "a9"]).errors).toEqual([`${L}: step s02: structure "flat-methane" has no atom "a9"`]);
  });
});
