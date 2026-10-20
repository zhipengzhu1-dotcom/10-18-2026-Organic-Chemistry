// Computed orbitals on the 3D Step card (#70): a Step's molecule names orbitals from an orbital
// data file (pipelines/orbitals output); the build resolves each to its mesh, lobes and chip, and the
// Step's Source note gains the orbital set's isovalue and energies, with the model caveat.
import { describe, expect, it } from "vitest";
import { sourceNote } from "../src/data.ts";
import { buildContent } from "../src/index.ts";
import { computedEthane, elementsWithRadii as elements, lesson, methaneWithBonds, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

const methaneOrbitals = (extra: object = {}) => ({
  id: "methane-orbitals",
  kind: "table",
  title: "Methane orbitals",
  sources: {
    ours: {
      kind: "computed",
      citation: "Our calculation: canonical MOs with PySCF 2.14.0, B3LYP/cc-pVTZ, 2026-10-19",
      licence: "CC BY-NC-SA 4.0",
      note: "Computed orbital energies are model values: compare them with each other, not with measured energies.",
      method: { program: "PySCF", version: "2.14.0", level: "B3LYP/cc-pVTZ", date: "2026-10-19" },
    },
  },
  values: {
    homo: { label: "Methane HOMO", quantity: "energy", value: -10.6582, unit: "eV", decimals: 1, source: "ours" },
    iso: { label: "Isosurface value", quantity: "isovalue", value: 0.05, unit: "a.u.", source: "ours" },
  },
  orbitals: {
    molecule: "methane",
    kind: "canonical",
    iso: "iso",
    list: {
      homo: {
        label: "HOMO",
        chip: "HOMO",
        style: "phase",
        energy: "homo",
        mesh: "/orbitals/methane-orbitals/homo.glb",
        sha256: "0".repeat(64),
        triangles: 12,
        lobes: [
          { sign: "+", at: [0.5, 0, 0] },
          { sign: "-", at: [-0.5, 0, 0] },
        ],
      },
    },
  },
  ...extra,
});

function build(molecule: object, data: object = methaneOrbitals()) {
  const steps: object[] = sampleSteps();
  steps[1] = { id: "s02", phase: "build", type: "explain", text: "Here is the orbital.", molecule };
  const tree: Tree = {
    ...validTree(),
    [L]: lesson({ steps }),
    "chem/data/elements.yaml": elements(),
    "chem/data/methane.yaml": methaneWithBonds(),
    "chem/data/methane-orbitals.json": data,
  };
  return buildContent(writeTree(tree));
}
const s02 = (result: ReturnType<typeof build>) => result.model!.subjects[0].courses[0].units[0].lessons[0].steps[1];

describe("computed orbitals on a Step's 3D card", () => {
  it("resolve to their mesh, lobes, chip and style, with the energy cited to 1 decimal in eV", () => {
    const result = build({ id: "methane", card: true, orbitals: ["methane-orbitals/homo"] });
    expect(result.errors).toEqual([]);
    const step = s02(result);
    if (step.type !== "explain") throw new Error("s02 is an Explain Step");
    const [orbital] = step.molecule!.orbitals!;
    expect(orbital).toMatchObject({
      ref: "methane-orbitals/homo",
      label: "HOMO",
      chip: "HOMO",
      style: "phase",
      mesh: "/orbitals/methane-orbitals/homo.glb",
      lobes: [
        { sign: "+", at: [0.5, 0, 0] },
        { sign: "-", at: [-0.5, 0, 0] },
      ],
    });
    expect(orbital.energy?.display).toBe("−10.7 eV");
    expect(orbital.energy?.full).toBe("−10.6582 eV");
  });

  it("add the isovalue and energies to the Step's Source note, with the model caveat", () => {
    const step = s02(build({ id: "methane", card: true, orbitals: ["methane-orbitals/homo"] }));
    const refs = step.citations!.map((c) => c.ref);
    expect(refs).toContain("methane-orbitals/iso");
    expect(refs).toContain("methane-orbitals/homo");
    const note = sourceNote(step.citations!.filter((c) => c.ref.startsWith("methane-orbitals/")));
    expect(note).toEqual([
      {
        lead: "Computed, not measured.",
        text:
          "Methane HOMO −10.6582 eV and Isosurface value 0.05 a.u. from Our calculation: canonical MOs with PySCF 2.14.0, B3LYP/cc-pVTZ, 2026-10-19. " +
          "Computed orbital energies are model values: compare them with each other, not with measured energies.",
      },
    ]);
  });

  it("an orbital data file must name the molecule data file it was computed on", () => {
    const other = methaneOrbitals({ orbitals: { ...methaneOrbitals().orbitals, molecule: "elements" } });
    expect(build({ id: "methane" }, other).errors).toEqual([
      `chem/data/methane-orbitals.json: orbitals.molecule: "elements" is not a molecule data file`,
    ]);
  });

  it("are refused when the orbital doesn't exist or the set was computed on another molecule", () => {
    expect(build({ id: "methane", card: true, orbitals: ["methane-orbitals/lumo"] }).errors).toEqual([
      `${L}: step s02: molecule "methane": no orbital "methane-orbitals/lumo"`,
    ]);
    expect(build({ id: "methane", card: true, orbitals: ["elements/homo"] }).errors).toEqual([
      `${L}: step s02: molecule "methane": "elements" is not an orbital data file`,
    ]);
    const steps: object[] = sampleSteps();
    steps[1] = { id: "s02", phase: "build", type: "explain", text: "Here.", molecule: { id: "methane", card: true, orbitals: ["methane-orbitals/homo"] } };
    const result = buildContent(
      writeTree({
        ...validTree(),
        [L]: lesson({ steps }),
        "chem/data/elements.yaml": elements(),
        "chem/data/methane.yaml": methaneWithBonds(),
        "chem/data/ethane.yaml": computedEthane(),
        "chem/data/methane-orbitals.json": methaneOrbitals({ orbitals: { ...methaneOrbitals().orbitals, molecule: "ethane" } }),
      }),
    );
    expect(result.errors).toEqual([
      `${L}: step s02: molecule "methane": orbitals "methane-orbitals" were computed on "ethane", so they don't sit on these atoms`,
    ]);
  });

  it("need the inline card", () => {
    expect(build({ id: "methane", orbitals: ["methane-orbitals/homo"] }).errors).toEqual([
      `${L}: step s02: molecule "methane": orbitals show only on the inline card (card: true)`,
    ]);
  });

  it("orbital data files are checked: energies and the isovalue must be values in the file", () => {
    const bad = methaneOrbitals();
    bad.orbitals.list.homo.energy = "nope";
    bad.orbitals.iso = "missing";
    expect(build({ id: "methane" }, bad).errors).toEqual([
      `chem/data/methane-orbitals.json: orbitals.iso: "missing" is not a value in this file`,
      `chem/data/methane-orbitals.json: orbitals.list.homo.energy: "nope" is not a value in this file`,
    ]);
  });
});

describe("orbitals shown as A and B (Lesson 8: the spec's `labels: hide`)", () => {
  const twoOrbitals = () => {
    const d = methaneOrbitals();
    const list = d.orbitals.list as Record<string, (typeof d.orbitals.list)["homo"]>;
    list.lumo = { ...list.homo, label: "LUMO", chip: "LUMO", energy: "homo", mesh: "/orbitals/methane-orbitals/lumo.glb", sha256: "a".repeat(64) };
    return d;
  };
  const pair = (extra: object = {}) => ({
    id: "methane",
    card: true,
    label: "A",
    orbitalLabels: "hide",
    tapMeasure: false,
    orbitals: ["methane-orbitals/homo"],
    describe: "One lobe.",
    toggle: [{ id: "methane", label: "B", orbitals: ["methane-orbitals/lumo"], describe: "Two lobes." }],
    ...extra,
  });

  it("name each orbital only by its letter: no orbital name, energy or telling mesh path reaches the page", () => {
    const result = build(pair(), twoOrbitals());
    expect(result.errors).toEqual([]);
    const m = s02(result).molecule!;
    expect(m.orbitalLabels).toBe("hide");
    expect(m.orbitals).toEqual([expect.objectContaining({ ref: "A", label: "orbital A", chip: "A", mesh: `/orbitals/m/${"0".repeat(16)}.glb` })]);
    expect(m.toggle![0].orbitals).toEqual([expect.objectContaining({ ref: "B", label: "orbital B", chip: "B", mesh: `/orbitals/m/${"a".repeat(16)}.glb` })]);
    expect(m.orbitals![0].energy).toBeUndefined();
    const page = JSON.stringify(m);
    for (const telling of ["homo", "lumo", "HOMO", "LUMO"]) expect(page).not.toContain(telling);
    expect(m.toggle![0].describe).toBe("Two lobes.");
  });

  it("turn tap-measuring off for every molecule of the card", () => {
    const m = s02(build(pair(), twoOrbitals())).molecule!;
    expect(m.tapMeasure).toBe(false);
    expect(m.toggle![0].tapMeasure).toBe(false);
  });

  it("need a letter on every molecule", () => {
    expect(build(pair({ label: undefined, toggle: [{ id: "methane", orbitals: ["methane-orbitals/lumo"] }] }), twoOrbitals()).errors).toEqual([
      `${L}: step s02: molecule "methane": a toggle needs a label on every molecule`,
    ]);
    expect(build({ id: "methane", card: true, orbitalLabels: "hide", orbitals: ["methane-orbitals/homo"] }, twoOrbitals()).errors).toEqual([
      `${L}: step s02: molecule "methane": orbitalLabels: hide names each orbital by its molecule's label (A, B…); add a label`,
    ]);
  });
});
