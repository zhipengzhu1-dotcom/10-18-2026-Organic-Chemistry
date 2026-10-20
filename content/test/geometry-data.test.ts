// The geometry pipeline's committed output (#67): every Unit 1 molecule has a cited geometry file,
// and the build-time sanity checks the Lesson and Practice Problem specs ask for hold on it.
// Expected relations come from the specs (docs/specs/unit-1/*), not from the pipeline.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { cite, type Atom, type DataSet } from "../src/data.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const raw = (id: string) => JSON.parse(readFileSync(join(contentRoot, "organic", "data", `${id}.json`), "utf8"));
const NIST =
  "NIST Computational Chemistry Comparison and Benchmark Database, NIST Standard Reference Database Number 101, Release 22, May 2022, Editor: Russell D. Johnson III, http://cccbdb.nist.gov/, DOI:10.18434/T47C7Z";

// Molecules the Unit 1 Lesson specs and the Practice Problems name with a geometry file.
const UNIT1 = [
  "methane", "ammonia", "water", "formaldehyde", "carbon-dioxide", "boron-trifluoride", "carbon-tetrachloride",
  "dichloromethane", "ethanol", "2-fluorobutane-r", // Lesson 3
  "ethane", "ethylene", "acetylene", "ketene", // Lesson 4
  "acetic-acid", "acetate", // Lesson 6
  "methylamine", "acetamide", "methanimine", // Lesson 7
  "hydrogen-b3lyp", "ethane-b3lyp", "ethylene-b3lyp", "ammonia-b3lyp", "boron-trifluoride-b3lyp", // Lesson 8
  "chloroform", "hydrogen-cyanide", "allene", // Practice Problems
];
const molecules = UNIT1.map((id) => data[id]);

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V) => Math.sqrt(dot(a, a));
const deg = (r: number) => (r * 180) / Math.PI;
const pos = (m: DataSet, i: number): V => {
  const a = m.atoms!.list[i] as Atom;
  return [a.x, a.y, a.z];
};
const angleAt = (m: DataSet, i: number, j: number, k: number) => {
  const u = sub(pos(m, i), pos(m, j));
  const v = sub(pos(m, k), pos(m, j));
  return deg(Math.acos(dot(u, v) / (norm(u) * norm(v))));
};
const dihedral = (m: DataSet, i: number, j: number, k: number, l: number) => {
  const b0 = sub(pos(m, i), pos(m, j));
  const b1 = sub(pos(m, k), pos(m, j));
  const b2 = sub(pos(m, l), pos(m, k));
  const n = b1.map((c) => c / norm(b1)) as V;
  const v = sub(b0, n.map((c) => c * dot(b0, n)) as V);
  const w = sub(b2, n.map((c) => c * dot(b2, n)) as V);
  return deg(Math.atan2(dot(cross(n, v), w), dot(v, w)));
};
const measure = (m: DataSet, idx: number[]) =>
  idx.length === 2 ? norm(sub(pos(m, idx[0]), pos(m, idx[1]))) : idx.length === 3 ? angleAt(m, idx[0], idx[1], idx[2]) : dihedral(m, idx[0], idx[1], idx[2], idx[3]);
/** Every angle X–centre–Y between the centre's neighbours of one element. */
const anglesAround = (m: DataSet, centre: number, element: string) => {
  const around = m.bonds!.flatMap((b) => (b.a === centre ? [b.b] : b.b === centre ? [b.a] : [])).filter((i) => m.atoms!.list[i].element === element);
  return around.flatMap((i, n) => around.slice(n + 1).map((k) => angleAt(m, i, centre, k)));
};
const v = (ref: string) => cite(data, ref).value as number;

describe("every Unit 1 molecule has a cited geometry file", () => {
  it.each(UNIT1)("%s has atoms, bonds and a geometry tier", (id) => {
    const m = data[id];
    expect(m, `${id}.json`).toBeDefined();
    expect(m.kind).toBe("molecule");
    expect(["experimental", "computed"]).toContain(m.geometry);
    expect(m.atoms!.list.length).toBeGreaterThan(1);
    expect(m.bonds!.length).toBeGreaterThan(0);
  });

  it("every value and the coordinates carry a source with a licence", () => {
    for (const m of molecules) {
      expect(m.atoms!.source.licence, m.id).toBeTruthy();
      for (const c of Object.values(m.values)) expect(c.licence, c.ref).toBeTruthy();
    }
  });

  it("a value a Student taps in the viewer equals the cited one (0.001 Å, 0.1°)", () => {
    for (const m of molecules)
      for (const c of Object.values(m.values)) {
        expect(c.atoms, c.ref).toBeDefined();
        const got = measure(m, c.atoms!);
        if (c.quantity === "bond-length") expect(Math.abs(got - (c.value as number)), c.ref).toBeLessThan(0.0011);
        else if (c.quantity === "angle") expect(Math.abs(got - (c.value as number)), c.ref).toBeLessThan(0.1);
        else expect(Math.abs(Math.abs(got) - Math.abs(c.value as number)), c.ref).toBeLessThan(0.1);
      }
  });
});

describe("licence: CCCBDB-derived files", () => {
  const derived = molecules.filter((m) => m.geometry === "experimental");

  it("are exactly the experimental ones, and each carries the NIST acknowledgement outside the MIT licence", () => {
    expect(derived.map((m) => m.id).sort()).toEqual(
      ["acetylene", "allene", "ammonia", "boron-trifluoride", "carbon-dioxide", "carbon-tetrachloride", "chloroform",
        "dichloromethane", "ethane", "ethylene", "formaldehyde", "hydrogen-cyanide", "ketene", "methane", "water"],
    );
    for (const m of derived) {
      expect(m.notice, m.id).toContain(NIST);
      expect(m.notice, m.id).toMatch(/not covered by the repository's MIT licence/);
      expect(m.atoms!.source.citation).toBe("NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z");
    }
  });

  it("computed files carry no NIST notice and say how they were computed", () => {
    for (const m of molecules.filter((x) => x.geometry === "computed")) {
      expect(m.notice, m.id).toBeUndefined();
      expect(m.atoms!.source.method).toMatchObject({ program: "PySCF", level: "B3LYP/cc-pVTZ" });
      expect(m.atoms!.source.method!.maxDeviation, m.id).toBeGreaterThan(0);
    }
  });
});

describe("Lesson 3 build checks", () => {
  it("methane's six H–C–H angles and CCl4's six Cl–C–Cl angles each agree within 0.1°", () => {
    for (const [id, el] of [["methane", "H"], ["carbon-tetrachloride", "Cl"]] as const) {
      const angles = anglesAround(data[id], 0, el);
      expect(angles).toHaveLength(6);
      expect(Math.max(...angles) - Math.min(...angles), id).toBeLessThan(0.1);
    }
  });

  it("H–O–H < H–N–H < H–C–H", () => {
    expect(v("water/a.HOH")).toBeLessThan(v("ammonia/a.HNH"));
    expect(v("ammonia/a.HNH")).toBeLessThan(v("methane/a.HCH"));
  });

  it("methane, ammonia and water use one method (all experimental), so the s05 comparison is fair", () => {
    expect(new Set(["methane", "ammonia", "water"].map((id) => data[id].geometry))).toEqual(new Set(["experimental"]));
  });

  it("CO2 is linear, BF3 flat, NH3 a pyramid", () => {
    expect(Math.abs(angleAt(data["carbon-dioxide"], 1, 0, 2) - 180)).toBeLessThan(0.1);
    const fbf = anglesAround(data["boron-trifluoride"], 0, "F");
    expect(Math.abs(fbf.reduce((s, a) => s + a, 0) - 360)).toBeLessThan(0.1);
    const hnh = anglesAround(data.ammonia, 0, "H");
    expect(hnh.reduce((s, a) => s + a, 0)).toBeLessThan(350);
  });

  it("formaldehyde's H–C–O is wider than its H–C–H", () => {
    expect(v("formaldehyde/a.HCO")).toBeGreaterThan(v("formaldehyde/a.HCH"));
  });

  it("2-fluorobutane is (R) by CIP from its coordinates, anti about C2–C3, and a true minimum", () => {
    const m = data["2-fluorobutane-r"];
    // Atoms 0 C1 (methyl), 1 C2 (stereocentre), 2 F, 3 C3 (ethyl). Priorities F > ethyl > methyl > H.
    // With H pointing away, F → ethyl → methyl runs clockwise exactly when this triple product is negative.
    const c = pos(m, 1);
    expect(dot(sub(pos(m, 2), c), cross(sub(pos(m, 3), c), sub(pos(m, 0), c)))).toBeLessThan(0);
    expect(Math.abs(v("2-fluorobutane-r/d.CCCC"))).toBeGreaterThan(170);
    expect(raw("2-fluorobutane-r").provenance.imaginaryModes).toBe(0);
  });
});

describe("Lesson 4 and Practice build checks", () => {
  it("ketene's Cartesians are rebuilt from CCCBDB's internal coordinates, and the file says so", () => {
    expect(raw("ketene").provenance.rebuilt).toMatch(/rebuilt from the listed parameters/);
  });

  it("every computed file states the current validation's largest B3LYP deviation (after chloroform's rebuild)", () => {
    const summary = JSON.parse(readFileSync(new URL("../../pipelines/geometry/computed/validation/summary.json", import.meta.url), "utf8"));
    const stated = Object.values(data).flatMap((d) =>
      d.kind === "molecule" && d.geometry === "computed"
        ? Object.values(d.values).length || d.atoms
          ? [[d.id, raw(d.id).sources?.ours?.method?.maxDeviation] as const]
          : []
        : [],
    );
    expect(stated.length).toBeGreaterThan(10);
    for (const [id, dev] of stated) expect(dev, id).toBe(summary.maxDeviationAngstrom);
  });

  it("every rebuilt molecule's Cartesians reproduce each listed parameter (chloroform: C3v, C–Cl 1.762 Å)", () => {
    const rebuilt = UNIT1.filter((id) => raw(id).provenance?.rebuilt);
    expect(rebuilt).toEqual(expect.arrayContaining(["ketene", "chloroform"]));
    for (const id of rebuilt) {
      expect(raw(id).provenance.rebuilt, id).toMatch(/rebuilt from the listed parameters/);
      const at = data[id].atoms!.list.map((a) => [a.x, a.y, a.z] as V);
      for (const v of Object.values(data[id].values)) {
        if (!v.atoms || typeof v.value !== "number") continue;
        const [p, q, r] = v.atoms.map((i) => at[i]);
        const measured =
          v.atoms.length === 2
            ? Math.hypot(...sub(p, q))
            : v.atoms.length === 3
              ? (Math.acos(dot(sub(p, q), sub(r, q)) / (Math.hypot(...sub(p, q)) * Math.hypot(...sub(r, q)))) * 180) / Math.PI
              : undefined;
        if (measured === undefined) continue;
        expect(Math.abs(measured - v.value), `${id} ${v.label}`).toBeLessThan(v.atoms.length === 2 ? 0.0005 : 0.01);
      }
    }
    // Chloroform's three C–Cl bonds are equal (C3v), at the listed length.
    const cl = data.chloroform.atoms!.list.map((a, i) => [a, i] as const).filter(([a]) => a.element === "Cl");
    const c = data.chloroform.atoms!.list[0];
    for (const [a] of cl) expect(Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z)).toBeCloseTo(1.762, 3);
  });

  it("allene's two H–C–H planes meet at 90° within 0.5°", () => {
    const m = data.allene;
    const hOn = (c: number) => m.bonds!.filter((b) => b.a === c || b.b === c).map((b) => (b.a === c ? b.b : b.a)).filter((i) => m.atoms!.list[i].element === "H");
    const ends = m.atoms!.list.map((_, i) => i).filter((i) => m.atoms!.list[i].element === "C" && hOn(i).length === 2);
    expect(ends).toHaveLength(2);
    const normal = (c: number) => {
      const [h1, h2] = hOn(c);
      return cross(sub(pos(m, h1), pos(m, c)), sub(pos(m, h2), pos(m, c)));
    };
    const [n1, n2] = ends.map(normal);
    const between = deg(Math.acos(Math.abs(dot(n1, n2)) / (norm(n1) * norm(n2))));
    expect(Math.abs(between - 90)).toBeLessThan(0.5);
  });
});

describe("Lesson 6 build checks (acetic acid and acetate, both computed)", () => {
  it("acetate's two C–O agree within 0.005 Å", () => {
    expect(Math.abs(v("acetate/r.CO.a") - v("acetate/r.CO.b"))).toBeLessThan(0.005);
  });
  it("acetic acid's C=O is shorter than its C–O by more than 0.1 Å, and acetate lies between", () => {
    const [dbl, sgl] = [v("acetic-acid/r.CO.double"), v("acetic-acid/r.CO.single")];
    expect(sgl - dbl).toBeGreaterThan(0.1);
    const mean = (v("acetate/r.CO.a") + v("acetate/r.CO.b")) / 2;
    expect(mean).toBeGreaterThan(dbl);
    expect(mean).toBeLessThan(sgl);
  });
  it("acetic acid is the syn conformer", () => {
    expect(Math.abs(v("acetic-acid/d.OCOH"))).toBeLessThan(5);
  });
  it("records whether CCCBDB has acetic acid (internal coordinates only, no Cartesians)", () => {
    expect(raw("acetic-acid").provenance.cccbdb).toMatch(/internal coordinates only, no Cartesian table/);
  });
});

describe("Lesson 7 build checks", () => {
  it("C–N: methylamine > acetamide > methanimine, each gap at least 0.05 Å", () => {
    expect(v("methylamine/r.CN") - v("acetamide/r.CN")).toBeGreaterThanOrEqual(0.05);
    expect(v("acetamide/r.CN") - v("methanimine/r.CN")).toBeGreaterThanOrEqual(0.05);
  });
});

describe("every computed structure is a true minimum", () => {
  it.each(UNIT1.filter((id) => data[id]?.geometry === "computed"))("%s has no imaginary frequency", (id) => {
    const p = raw(id).provenance;
    expect(p.imaginaryModes).toBe(0);
    expect(p.lowestFrequency).toBeGreaterThan(0);
    expect(p.start).toBeTruthy();
  });
});
