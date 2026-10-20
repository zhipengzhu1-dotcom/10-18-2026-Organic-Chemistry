// Lesson 4's options for the 3D Step card (#82), resolved by the content build:
// - `toggle` entries may name their own `orbitals`, so one card switches between σ, π and both;
//   `toggleLabel` names the toggle group ("Show") and `autoplay` steps through it once on entry.
// - `plane: { through: [a, b, c], label, on }`: a translucent sheet through three atoms that turns
//   with the molecule (the molecular plane), with a button that shows or hides it.
// - `measure: [a, b]` (or three atoms): a bond or angle measured and labelled on load.
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { elementsWithRadii as elements, lesson, methaneWithBonds, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

const orbital = (sign: number) => ({
  label: sign > 0 ? "C–H σ bond orbital" : "Other C–H σ bond orbital",
  chip: "σ",
  style: "sigma",
  mesh: `/orbitals/methane-orbitals/${sign > 0 ? "a" : "b"}.glb`,
  sha256: "0".repeat(64),
  triangles: 12,
  lobes: [{ sign: "+", at: [0.5 * sign, 0, 0] }],
});
const methaneOrbitals = () => ({
  id: "methane-orbitals",
  kind: "table",
  title: "Methane bond orbitals",
  sources: {
    ours: {
      kind: "computed",
      citation: "Our calculation: IBOs with PySCF 2.14.0, B3LYP/cc-pVTZ, 2026-10-19",
      licence: "CC BY-NC-SA 4.0",
      method: { program: "PySCF", version: "2.14.0", level: "B3LYP/cc-pVTZ", date: "2026-10-19" },
    },
  },
  values: { iso: { label: "Isosurface value", quantity: "isovalue", value: 0.05, unit: "a.u.", source: "ours" } },
  orbitals: { molecule: "methane", kind: "ibo", iso: "iso", list: { a: orbital(1), b: orbital(-1) } },
});

function build(molecule: object) {
  const steps: object[] = sampleSteps();
  steps[1] = { id: "s02", phase: "build", type: "explain", text: "Turn it.", molecule };
  const tree: Tree = {
    ...validTree(),
    [L]: lesson({ steps }),
    "chem/data/elements.yaml": elements(),
    "chem/data/methane.yaml": methaneWithBonds(),
    "chem/data/methane-orbitals.json": methaneOrbitals(),
  };
  return buildContent(writeTree(tree));
}
const s02 = (result: ReturnType<typeof build>) => {
  const step = result.model!.subjects[0].courses[0].units[0].lessons[0].steps[1];
  if (step.type !== "explain") throw new Error("s02 is an Explain Step");
  return step;
};

describe("Lesson 4's 3D card options", () => {
  it("toggle entries carry their own orbitals, under a named toggle that can autoplay", () => {
    const result = build({
      id: "methane",
      card: true,
      label: "a",
      orbitals: ["methane-orbitals/a"],
      toggleLabel: "Show",
      autoplay: true,
      toggle: [
        { id: "methane", label: "b", orbitals: ["methane-orbitals/b"] },
        { id: "methane", label: "both", orbitals: ["methane-orbitals/a", "methane-orbitals/b"] },
      ],
    });
    expect(result.errors).toEqual([]);
    const m = s02(result).molecule!;
    expect(m.toggleLabel).toBe("Show");
    expect(m.autoplay).toBe(true);
    expect(m.orbitals!.map((o) => o.ref)).toEqual(["methane-orbitals/a"]);
    expect(m.toggle!.map((t) => t.orbitals!.map((o) => o.ref))).toEqual([["methane-orbitals/b"], ["methane-orbitals/a", "methane-orbitals/b"]]);
    // The toggled orbitals' isovalue joins the Step's Source note once.
    expect(s02(result).citations!.filter((c) => c.ref === "methane-orbitals/iso")).toHaveLength(1);
  });

  it("toggleLabel and autoplay need a toggle", () => {
    expect(build({ id: "methane", card: true, autoplay: true }).errors).toEqual([
      `${L}: step s02: molecule "methane": toggleLabel and autoplay need a toggle`,
    ]);
  });

  it("a plane sheet goes through three atoms, starts on or off, and is named", () => {
    const result = build({ id: "methane", card: true, plane: { through: [1, 0, 2], label: "H–C–H plane", on: true } });
    expect(result.errors).toEqual([]);
    expect(s02(result).molecule!.plane).toEqual({ through: [1, 0, 2], label: "H–C–H plane", on: true });
    expect(s02(build({ id: "methane", card: true, plane: { through: [1, 0, 2] } })).molecule!.plane).toEqual({
      through: [1, 0, 2],
      label: "Plane",
      on: false,
    });
  });

  it("rejects a plane or measured atom that isn't in the molecule, and a plane in a line", () => {
    expect(build({ id: "methane", card: true, plane: { through: [1, 0, 9] } }).errors).toEqual([
      `${L}: step s02: molecule "methane": plane: atom 9 is not in the molecule (0–4)`,
    ]);
    expect(build({ id: "methane", card: true, plane: { through: [1, 0, 1] } }).errors).toEqual([
      `${L}: step s02: molecule "methane": plane: the three atoms are in a line`,
    ]);
    expect(build({ id: "methane", card: true, measure: [0, 7] }).errors).toEqual([
      `${L}: step s02: molecule "methane": measure: atom 7 is not in the molecule (0–4)`,
    ]);
  });

  it("zoom sets the start zoom, between the card's own limits", () => {
    expect(s02(build({ id: "methane", card: true, zoom: 1.5 })).molecule!.zoom).toBe(1.5);
    expect(build({ id: "methane", card: true, zoom: 4 }).errors.length).toBeGreaterThan(0);
  });

  it("measure names two atoms (a length) or three (an angle) to show on load", () => {
    expect(s02(build({ id: "methane", card: true, measure: [0, 1] })).molecule!.measure).toEqual([0, 1]);
    expect(s02(build({ id: "methane", card: true, measure: [1, 0, 2] })).molecule!.measure).toEqual([1, 0, 2]);
    expect(build({ id: "methane", card: true, measure: [0] }).errors.length).toBeGreaterThan(0);
  });
});
