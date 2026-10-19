import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { cite, sourceNote } from "../src/data.ts";
import { computedEthane, elements, methane, validTree, writeTree, type Tree } from "./tree.ts";

function build(edit: (tree: Tree) => void = () => {}) {
  const tree = validTree();
  tree["chem/data/methane.yaml"] = methane();
  edit(tree);
  return buildContent(writeTree(tree));
}

function errorsFor(edit: (tree: Tree) => void): string[] {
  const result = build(edit);
  expect(result.model).toBeUndefined();
  return result.errors;
}

const dataOf = (result: ReturnType<typeof build>) => result.model!.subjects[0].data;

describe("cited-data lookup", () => {
  it("returns a value with its unit, citation and licence", () => {
    const result = build();
    expect(result.errors).toEqual([]);

    const ch = cite(dataOf(result), "methane/r.CH");
    expect(ch).toMatchObject({
      ref: "methane/r.CH",
      label: "C–H",
      value: 1.087,
      unit: "Å",
      quantity: "bond-length",
      tier: "experimental",
      display: "1.09 Å",
      full: "1.087 Å",
    });
    expect(ch.source.citation).toBe(
      "Hirota, J. Mol. Spectrosc. 77, 213 (1979), doi:10.1016/0022-2852(79)90103-6",
    );
    expect(ch.source.via?.citation).toBe(
      "NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z",
    );
    expect(ch.licence).toBe("NIST SRD 101; reuse with acknowledgement (https://www.nist.gov/open/license)");
  });

  it("shows angles to 1 decimal and keeps the full value", () => {
    expect(cite(dataOf(build()), "methane/a.HCH")).toMatchObject({ display: "109.5°", full: "109.471°" });
  });

  it("holds counts (atoms in a formula) as whole numbers with no unit", () => {
    const result = build((t) => {
      t["chem/data/h-counts.yaml"] = {
        id: "h-counts",
        kind: "table",
        title: "Hydrogen counts",
        sources: { cid712: { kind: "reference", citation: "PubChem CID 712, formaldehyde (CH2O)", licence: "PubChem data, public domain" } },
        values: { formaldehyde: { label: "H atoms in formaldehyde", quantity: "count", value: 2, source: "cid712" } },
      };
    });
    expect(result.errors).toEqual([]);
    expect(cite(dataOf(result), "h-counts/formaldehyde")).toMatchObject({ quantity: "count", display: "2", full: "2" });
  });

  it("throws on a value that isn't in the data", () => {
    expect(() => cite(dataOf(build()), "methane/r.CC")).toThrow('No cited value "methane/r.CC"');
  });

  it("reads JSON data files written by the pipelines", () => {
    const result = build((t) => (t["chem/data/ethane.json"] = JSON.stringify(computedEthane())));
    expect(result.errors).toEqual([]);
    expect(cite(dataOf(result), "ethane/r.CC")).toMatchObject({ tier: "computed", display: "1.50 Å", full: "1.5 Å" });
  });
});

describe("Lessons and Problems cite numbers as {{file/key}}", () => {
  type Steps = { steps: Record<string, unknown>[] };
  const steps = (result: ReturnType<typeof build>) => result.model!.subjects[0].courses[0].units[0].lessons[0].steps;

  it("a Step shows the display value and carries what it cited", () => {
    const result = build((t) => {
      (t["chem/lessons/l1.yaml"] as Steps).steps[1].text = "Each C–H bond is {{methane/r.CH}} long.";
    });
    expect(result.errors).toEqual([]);
    const s02 = steps(result)[1];
    expect(s02).toMatchObject({ text: "Each C–H bond is 1.09 Å long." });
    expect(s02.citations?.map((c) => c.full)).toEqual(["1.087 Å"]);
  });

  it("a Check Step carries its Problem's citations", () => {
    const result = build((t) => {
      (t["chem/problems/p1.yaml"] as { reveal: string }).reveal = "The angle is {{methane/a.HCH}}.";
    });
    const s08 = steps(result)[7];
    expect(s08).toMatchObject({ reveal: "The angle is 109.5°." });
    expect(s08.citations?.map((c) => c.ref)).toEqual(["methane/a.HCH"]);
  });

  it("a Step with no cited numbers has no citations", () => {
    expect(steps(build())[1].citations).toBeUndefined();
  });

  it("the build rejects a cite that isn't in the data", () => {
    expect(
      errorsFor((t) => {
        (t["chem/lessons/l1.yaml"] as Steps).steps[1].text = "C–C is {{methane/r.CC}}.";
        (t["chem/problems/p2.yaml"] as { prompt: string }).prompt = "{{ethane/r.CC}}?";
      }),
    ).toEqual([
      'chem/lessons/l1.yaml: step s02: cites "methane/r.CC", which is not in the cited data',
      'chem/problems/p2.yaml: cites "ethane/r.CC", which is not in the cited data',
    ]);
  });
});

describe("Source note", () => {
  it("names each experimental value's paper and database, with full values", () => {
    const data = dataOf(build());
    const ch = cite(data, "methane/r.CH");
    expect(sourceNote([ch, cite(data, "methane/a.HCH"), ch])).toEqual([
      {
        lead: "Geometry: experimental (gas phase).",
        text:
          "C–H 1.087 Å from Hirota, J. Mol. Spectrosc. 77, 213 (1979), doi:10.1016/0022-2852(79)90103-6, " +
          "via NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z. " +
          "H–C–H 109.471° from Sverdlov, Kovner and Krainov, Vibrational Spectra of Polyatomic Molecules, Wiley (1974), " +
          "via NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z. " +
          "Other distances are calculated from these values.",
      },
    ]);
  });

  it('labels computed values "computed, not measured" with the method and its known error', () => {
    const result = build((t) => {
      const e = computedEthane();
      (e.sources.ours.method as Record<string, unknown>).maxDeviation = 0.01;
      t["chem/data/ethane.yaml"] = e;
    });
    expect(sourceNote([cite(dataOf(result), "ethane/r.CC")])).toEqual([
      {
        lead: "Geometry: computed, not measured.",
        text:
          "C–C 1.5 Å optimised at B3LYP/cc-pVTZ with PySCF 0.0.0 (our calculation, 2026-01-01), isolated molecule in the gas phase. " +
          "For molecules with experimental structures, this method's bond lengths differ from experiment by up to 0.01 Å.",
      },
    ]);
  });

  it("gives one paragraph per data file, table values without a geometry label", () => {
    const result = build((t) => (t["chem/data/elements.yaml"] = elements()));
    const data = dataOf(result);
    const note = sourceNote([cite(data, "elements/C.colour"), cite(data, "elements/H.colour"), cite(data, "methane/r.CH")]);
    expect(note[0]).toEqual({
      text: "C colour #909090 and H colour #FFFFFF from the Jmol CPK colour table, Jmol source org/jmol/c/PAL.java.",
    });
    expect(note[1].lead).toBe("Geometry: experimental (gas phase).");
  });
});

describe("the build rejects broken data files", () => {
  type File = ReturnType<typeof methane>;
  const editMethane = (edit: (m: File) => void) => (t: Tree) => edit(t["chem/data/methane.yaml"] as File);

  it("a molecule that mixes experimental and computed geometry", () => {
    expect(
      errorsFor(
        editMethane((m) => {
          (m.sources as Record<string, unknown>).ours = computedEthane().sources.ours;
          m.values["r.CH"].source = "ours";
        }),
      ),
    ).toEqual([
      'chem/data/methane.yaml: values.r.CH: computed source "ours" in an experimental molecule; one molecule never mixes experimental and computed geometry',
    ]);
  });

  it("coordinates from a different tier than the molecule", () => {
    expect(
      errorsFor((t) => {
        const e = computedEthane() as ReturnType<typeof computedEthane> & { atoms?: unknown };
        (e.sources as Record<string, unknown>).cccbdb = methane().sources.cccbdb;
        e.atoms = { source: "cccbdb", list: [["C", 0, 0, 0]] };
        t["chem/data/ethane.yaml"] = e;
      }),
    ).toEqual([
      'chem/data/ethane.yaml: atoms: experimental source "cccbdb" in a computed molecule; one molecule never mixes experimental and computed geometry',
    ]);
  });

  it("a molecule that doesn't say which tier its geometry is", () => {
    expect(errorsFor(editMethane((m) => delete (m as Partial<File>).geometry))).toEqual([
      "chem/data/methane.yaml: geometry: a molecule must say experimental or computed",
    ]);
  });

  it("a value without a known source", () => {
    expect(errorsFor(editMethane((m) => (m.values["r.CH"].source = "nobody")))).toEqual([
      'chem/data/methane.yaml: values.r.CH.source: "nobody" is not a source in this file',
    ]);
  });

  it("a source without a licence", () => {
    expect(errorsFor(editMethane((m) => delete (m.sources.cccbdb as { licence?: string }).licence))).toEqual([
      "chem/data/methane.yaml: sources.cccbdb.licence: Invalid input: expected string, received undefined",
    ]);
  });

  it("a bond length not in Å", () => {
    expect(errorsFor(editMethane((m) => (m.values["r.CH"].unit = "pm")))).toEqual([
      "chem/data/methane.yaml: values.r.CH.unit: a bond-length needs one of Å; found pm",
    ]);
  });

  it("a data file whose id doesn't match its file name", () => {
    expect(errorsFor(editMethane((m) => (m.id = "ch4")))).toEqual([
      'chem/data/methane.yaml: id "ch4" must match the file name',
    ]);
  });
});
