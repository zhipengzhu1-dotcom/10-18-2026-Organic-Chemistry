// The orbital pipeline's committed output (#70): the orbital data files Lessons 4 and 8 read, their
// meshes on the site, and the Lesson 8 spec's sanity checks on the energies. Expected relations come
// from the specs (docs/specs/unit-1/lesson-04*, lesson-08*), not from the pipeline.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { cite, sourceNote } from "../src/data.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const sitePublic = fileURLToPath(new URL("../../site/public", import.meta.url));
const n = (ref: string) => Number(cite(data, ref).value);

const L4 = { "ethylene-orbitals": ["sigma", "pi"], "acetylene-orbitals": ["sigma", "pi1", "pi2", "pi-both"], "ketene-orbitals": ["cc-pi", "co-pi"] };
const L8 = {
  "hydrogen-b3lyp-orbitals": ["sigma", "sigma-star"],
  "ethane-b3lyp-orbitals": [],
  "ethylene-b3lyp-orbitals": ["homo", "lumo"],
  "ammonia-b3lyp-orbitals": ["homo"],
  "boron-trifluoride-b3lyp-orbitals": ["lumo"],
};

describe("orbital data files", () => {
  it("Lesson 4's bond orbitals sit on the experimental geometry, Lesson 8's on the B3LYP-optimised one", () => {
    for (const [id, list] of Object.entries(L4)) {
      expect(Object.keys(data[id].orbitals!.list)).toEqual(list);
      expect(data[id].orbitals!.kind).toBe("ibo");
      expect(data[data[id].orbitals!.molecule].geometry).toBe("experimental");
    }
    for (const [id, list] of Object.entries(L8)) {
      expect(Object.keys(data[id].orbitals!.list)).toEqual(list);
      expect(data[id].orbitals!.kind).toBe("canonical");
      expect(data[data[id].orbitals!.molecule].geometry).toBe("computed");
    }
  });

  it("every mesh is on the site with the hash its data file records", () => {
    for (const id of [...Object.keys(L4), ...Object.keys(L8)])
      for (const entry of Object.values(data[id].orbitals!.list)) {
        const file = `${sitePublic}${entry.mesh}`;
        expect(existsSync(file), entry.mesh).toBe(true);
        expect(createHash("sha256").update(readFileSync(file)).digest("hex"), entry.mesh).toBe(entry.sha256);
      }
  });

  it("one isovalue for every orbital in each Lesson", () => {
    const isos = (ids: string[]) => new Set(ids.map((id) => n(`${id}/${data[id].orbitals!.iso}`)));
    expect(isos(Object.keys(L4)).size).toBe(1);
    expect(isos(Object.keys(L8)).size).toBe(1);
  });

  it("orbital energies show to 1 decimal in eV, with the full value and the model caveat in the Source note", () => {
    const homo = cite(data, "ethylene-b3lyp-orbitals/homo");
    expect(homo.display).toMatch(/^−\d+\.\d eV$/);
    expect(homo.full).toMatch(/^−\d+\.\d{3,} eV$/);
    const [paragraph] = sourceNote([homo]);
    expect(paragraph.lead).toBe("Computed, not measured.");
    expect(paragraph.text).toContain(homo.full);
    expect(paragraph.text).toContain("B3LYP/cc-pVTZ");
    expect(paragraph.text).toContain("Computed orbital energies are model values: compare them with each other, not with measured energies.");
  });

  it("Lesson 8 check 3: ethylene's HOMO sits above ethane's and its gap is smaller", () => {
    expect(n("ethylene-b3lyp-orbitals/homo")).toBeGreaterThan(n("ethane-b3lyp-orbitals/homo"));
    expect(n("ethylene-b3lyp-orbitals/gap")).toBeLessThan(n("ethane-b3lyp-orbitals/gap"));
  });

  it("Lesson 8 check 5: NH₃ HOMO → BF₃ LUMO is the smaller gap; the flows are the LUMO − HOMO differences", () => {
    expect(n("frontier-flow/nh3_bf3")).toBeLessThan(n("frontier-flow/bf3_nh3"));
    expect(n("frontier-flow/nh3_bf3")).toBeCloseTo(n("boron-trifluoride-b3lyp-orbitals/lumo") - n("ammonia-b3lyp-orbitals/homo"), 3);
    expect(n("frontier-flow/bf3_nh3")).toBeCloseTo(n("ammonia-b3lyp-orbitals/lumo") - n("boron-trifluoride-b3lyp-orbitals/homo"), 3);
  });

  it("each π orbital of Lesson 4 has a solid (+) lobe on the +x side (above the plane in the file's frame) and a hatched one opposite", () => {
    const pi = data["ethylene-orbitals"].orbitals!.list.pi.lobes;
    expect(pi.map((l) => l.sign)).toEqual(["+", "-"]);
    expect(pi[0].at[0]).toBeGreaterThan(0.3);
    expect(pi[1].at[0]).toBeLessThan(-0.3);
  });
});
