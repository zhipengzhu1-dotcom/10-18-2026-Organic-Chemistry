import { describe, expect, it } from "vitest";
import { layoutStructure } from "../src/layout.ts";

const summary = (s: Awaited<ReturnType<typeof layoutStructure>>) =>
  s.atoms.map((a) => `${a.id} ${a.el}${a.h ? `H${a.h}` : ""} q${a.charge ?? 0} lp${a.lp ?? 0}`);

describe("structure layout through RDKit.js", () => {
  it("lays out glycine's zwitterion in full Lewis with every H an atom and lone pairs from valence", async () => {
    const s = await layoutStructure({ id: "glycine", smiles: "[NH3+]CC(=O)[O-]", style: "full", source: "PubChem CID 750" });
    expect(summary(s)).toEqual([
      "a1 N q1 lp0",
      "a2 C q0 lp0",
      "a3 C q0 lp0",
      "a4 O q0 lp2",
      "a5 O q-1 lp3",
      "a6 H q0 lp0",
      "a7 H q0 lp0",
      "a8 H q0 lp0",
      "a9 H q0 lp0",
      "a10 H q0 lp0",
    ]);
    expect(s.bonds.find((b) => b.a === "a3" && b.b === "a4")).toMatchObject({ id: "b3", order: 2 });
    expect(s).toMatchObject({ id: "glycine", style: "full", smiles: "[NH3+]CC(=O)[O-]", source: "PubChem CID 750" });
  });

  it("in line-angle, keeps H's on heteroatoms as part of the letter and none on carbon", async () => {
    const s = await layoutStructure({ id: "ethanol", smiles: "CCO", style: "line-angle" });
    expect(summary(s)).toEqual(["a1 C q0 lp0", "a2 C q0 lp0", "a3 OH1 q0 lp2"]);
  });

  it("draws a carbocation and a carbanion's lone pair", async () => {
    const s = await layoutStructure({ id: "ions", smiles: "[CH3+].[CH3-]", style: "line-angle" });
    expect(summary(s)).toEqual(["a1 C q1 lp0", "a2 C q-1 lp1"]);
  });

  it("keeps an aromatic ring as alternating single and double bonds", async () => {
    const s = await layoutStructure({ id: "benzene", smiles: "c1ccccc1", style: "line-angle" });
    expect(s.bonds.map((b) => b.order).sort()).toEqual([1, 1, 1, 2, 2, 2]);
  });

  it("keeps wedges and hashes from the stereo SMILES, narrow end first", async () => {
    const s = await layoutStructure({ id: "2-fluorobutane", smiles: "C[C@H](F)CC", style: "line-angle" });
    const stereo = s.bonds.filter((b) => b.stereo);
    expect(stereo).toHaveLength(1);
    expect(stereo[0]).toMatchObject({ a: "a2" });
  });

  it("puts bonds about 1.5 units long, y down", async () => {
    const s = await layoutStructure({ id: "ethane", smiles: "CC", style: "line-angle" });
    const [p, q] = s.atoms;
    expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(1.5, 1);
  });
});
