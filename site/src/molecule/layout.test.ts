// Where the 3D card puts atoms on screen (#68): the same orthographic projection the WebGL
// canvas uses, so letters, picks and taps land on the drawn atoms. Expected values come from
// the methane geometry (C–H 1.087 Å) and plain arithmetic.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { viewMatrix } from "@astratron/content/molecule";
import { atomAt, BALL, fitScale, placeAtoms, placePoints, planeCorners } from "./layout.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const elements = { C: { colour: "#909090", vdw: 1.7 }, H: { colour: "#FFFFFF", vdw: 1.2 } };
const methane = { atoms: data.methane.atoms!.list, elements };
const facing = viewMatrix(methane.atoms);

describe("the 3D card's screen layout", () => {
  it("ball-and-stick atoms are 30% of their van der Waals radius", () => {
    expect(BALL).toBe(0.3);
    const ball = placeAtoms(methane, facing, { width: 300, height: 300, scale: 50, trueScale: false });
    expect(ball[0].r).toBeCloseTo(1.7 * 0.3 * 50, 6);
    const full = placeAtoms(methane, facing, { width: 300, height: 300, scale: 50, trueScale: true });
    expect(full[1].r).toBeCloseTo(1.2 * 50, 6);
  });

  it("centres the molecule; x grows right and y grows down, at `scale` px per Å", () => {
    const placed = placeAtoms(methane, facing, { width: 300, height: 200, scale: 50, trueScale: false });
    expect(placed[0]).toMatchObject({ x: 150, y: 100 });
    // H1 sits at (+0.6276, +0.6276, +0.6276) Å from the carbon: right, up and toward the viewer.
    expect(placed[1].x).toBeCloseTo(150 + 0.6276 * 50, 6);
    expect(placed[1].y).toBeCloseTo(100 - 0.6276 * 50, 6);
  });

  it("the fit leaves the whole true-scale molecule inside the frame in any rotation", () => {
    // Farthest atom edge from the centre: 1.087 Å + H's 1.2 Å radius = 2.287 Å.
    const s = fitScale(methane, 300, 200);
    expect(s * 2.287 * 2).toBeLessThanOrEqual(200);
    expect(s * 2.287 * 2).toBeGreaterThan(200 * 0.8);
  });

  it("a letter shows only when no nearer atom covers it", () => {
    const placed = placeAtoms(methane, facing, { width: 300, height: 300, scale: 50, trueScale: true });
    // True scale, file axes: every H sits 0.89 Å off the carbon's centre on screen. H1 and H4 are
    // nearer the viewer, so their 1.2 Å spheres cover the carbon's letter; H2 and H3 are behind the
    // carbon's 1.7 Å sphere. In ball-and-stick nothing is covered.
    const hidden = placed.filter((a) => !a.labelled).map((a) => a.index);
    expect(hidden).toEqual([0, 2, 3]);
    const ball = placeAtoms(methane, facing, { width: 300, height: 300, scale: 50, trueScale: false });
    expect(ball.every((a) => a.labelled)).toBe(true);
  });

  it("places a point given in the molecule file's frame (an orbital lobe's label) with the atoms' projection", () => {
    const frame = { width: 300, height: 200, scale: 50, trueScale: false };
    const [onCarbon, offset] = placePoints(methane, facing, frame, [
      [0, 0, 0],
      [0.5, -1, 0.25],
    ]);
    expect(onCarbon).toMatchObject({ x: 150, y: 100, z: 0 });
    expect(offset).toMatchObject({ x: 150 + 0.5 * 50, y: 100 + 1 * 50, z: 0.25 });
  });

  it("a tap picks the nearest atom drawn under it, or none", () => {
    const placed = placeAtoms(methane, facing, { width: 300, height: 300, scale: 50, trueScale: false });
    expect(atomAt(placed, placed[1].x + 2, placed[1].y - 2)).toBe(1);
    expect(atomAt(placed, 150, 150)).toBe(0);
    expect(atomAt(placed, 5, 5)).toBeUndefined();
  });
});

describe("the plane sheet (Lesson 4, #82)", () => {
  const ethylene = { atoms: data.ethylene.atoms!.list, elements };

  it("lies in the plane of its three atoms and covers every atom in it, with a margin", () => {
    // Ethylene's six atoms all lie in the file's yz plane (x = 0).
    const corners = planeCorners(ethylene, [2, 0, 3], 0.5);
    expect(corners).toHaveLength(4);
    for (const c of corners) expect(c[0]).toBeCloseTo(0, 9);
    const ys = corners.map((c) => c[1]);
    const zs = corners.map((c) => c[2]);
    // The H's reach 0.9289 Å either side in y and 1.2321 Å in z (ethylene.json), plus the margin.
    expect(Math.max(...ys)).toBeCloseTo(0.9289 + 0.5, 6);
    expect(Math.min(...zs)).toBeCloseTo(-1.2321 - 0.5, 6);
  });
});
