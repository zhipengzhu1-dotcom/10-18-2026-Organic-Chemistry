// What the Explore in 3D view hands 3Dmol.js: our cited colours and radii, never its defaults.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import type { ExploreMolecule } from "@astratron/content";
import { exploreMolecule } from "@astratron/content/explore";
import { describeMolecule, molBlock, styles } from "./scene.ts";

const data = buildContent(contentRoot).model!.subjects[0].data;
const molecule = (id: string): ExploreMolecule => exploreMolecule(data, id).molecule!;

describe("Explore in 3D styles", () => {
  it("space-filling draws each atom at its Bondi van der Waals radius in its Jmol colour, with no sticks", () => {
    expect(styles(molecule("methane"), "space-filling")).toEqual([
      { elem: "C", style: { sphere: { radius: 1.7, color: "#909090" } } },
      { elem: "H", style: { sphere: { radius: 1.2, color: "#FFFFFF" } } },
    ]);
  });

  it("ball-and-stick draws balls at 30% of the van der Waals radius, joined by sticks in the atoms' colours", () => {
    const [o, c] = styles(molecule("formaldehyde"), "ball-and-stick");
    expect(c.elem).toBe("C");
    expect(c.style.sphere.radius).toBeCloseTo(0.51, 10);
    expect(c.style.sphere.color).toBe("#909090");
    expect(c.style.stick).toEqual({ radius: 0.15, color: "#909090" });
    expect(o).toEqual({ elem: "O", style: { sphere: { radius: expect.closeTo(0.456, 10), color: "#FF0D0D" }, stick: { radius: 0.15, color: "#FF0D0D" } } });
  });

  it("writes the molecule as a molfile with our coordinates and our bond orders (3Dmol doesn't guess bonds)", () => {
    const lines = molBlock(molecule("formaldehyde")).split("\n");
    expect(lines[3]).toBe("  4  3  0  0  0  0  0  0  0  0999 V2000");
    // Formaldehyde's C=O is the one double bond.
    const bonds = lines.slice(8, 11).map((l) => l.trim().split(/\s+/).map(Number));
    expect(bonds.filter((b) => b[2] === 2)).toHaveLength(1);
    expect(lines.at(-1)).toBe("M  END");
  });

  it("describes the molecule for screen readers: its atoms and what each is bonded to", () => {
    expect(describeMolecule(molecule("methane"))).toBe("Methane: 1 carbon and 4 hydrogens. The carbon is bonded to 4 hydrogens.");
    expect(describeMolecule(molecule("formaldehyde"))).toBe(
      "Formaldehyde: 1 carbon, 2 hydrogens and 1 oxygen. The carbon is bonded to 2 hydrogens and 1 oxygen (double bond). The oxygen is bonded to 1 carbon (double bond).",
    );
    expect(describeMolecule(molecule("ethane"))).toBe("Ethane: 2 carbons and 6 hydrogens. Each carbon is bonded to 1 carbon and 3 hydrogens.");
  });
});
