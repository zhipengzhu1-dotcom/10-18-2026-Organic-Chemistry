// Lesson 4's hybrid-orbital model (#82): the shapes every "model" Scene draws.
import { describe, expect, it } from "vitest";
import { hybridDirections, lobeProfile, modelAngle, project, silhouette } from "../src/hybrid-model/model.ts";

describe("lobe profiles", () => {
  it("a p orbital has two equal lobes of opposite sign", () => {
    const plus = lobeProfile("p", "+");
    const minus = lobeProfile("p", "-");
    expect(plus.reach).toBeCloseTo(1, 6); // the p lobe sets the drawing's unit
    expect(minus.reach).toBeCloseTo(plus.reach, 6);
  });

  it("a hybrid is mostly one big lobe: it reaches past a p lobe, and its back lobe is much smaller", () => {
    for (const set of ["sp3", "sp2", "sp"] as const) {
      const front = lobeProfile(set, "+");
      const back = lobeProfile(set, "-");
      expect(front.reach).toBeGreaterThan(1);
      expect(back.reach).toBeGreaterThan(0);
      expect(back.reach).toBeLessThan(front.reach);
      expect(back.width).toBeLessThan(front.width * 0.6);
    }
  });

  it("an s orbital is one round lobe", () => {
    const s = lobeProfile("s", "+");
    const radii = s.outline.map(([u, v]) => Math.hypot(u, v));
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(1e-6);
  });
});

describe("hybrid sets", () => {
  it("point their lobes as far apart as they can: the model angles", () => {
    expect(modelAngle("sp3")).toBeCloseTo(109.47, 2);
    expect(modelAngle("sp2")).toBeCloseTo(120, 6);
    expect(modelAngle("sp")).toBeCloseTo(180, 6);
  });

  it("leave 0, 1 and 2 p orbitals at right angles to every hybrid", () => {
    for (const [set, count] of [
      ["sp3", 0],
      ["sp2", 1],
      ["sp", 2],
    ] as const) {
      const { hybrids, p } = hybridDirections(set);
      expect(hybrids).toHaveLength(4 - count);
      expect(p).toHaveLength(count);
      for (const q of p) for (const h of hybrids) expect(Math.abs(q[0] * h[0] + q[1] * h[1] + q[2] * h[2])).toBeLessThan(1e-9);
    }
  });
});

describe("drawing a lobe in 3D", () => {
  it("side on, its silhouette is as long as the profile; end on, it is round", () => {
    const profile = lobeProfile("p", "+");
    const side = silhouette(profile, [1, 0, 0]);
    expect(Math.max(...side.map((e) => e.cx + e.rx))).toBeCloseTo(profile.reach, 2);
    const end = silhouette(profile, [0, 0, 1]);
    for (const e of end) {
      expect(e.cx).toBeCloseTo(0, 9);
      expect(e.rx).toBeCloseTo(e.ry, 9);
    }
    expect(Math.max(...end.map((e) => e.ry))).toBeCloseTo(profile.width, 2);
  });

  it("projects with x right, y up and z toward the viewer", () => {
    expect(project([1, 0, 0], { yaw: 90, pitch: 0 })[2]).toBeCloseTo(-1, 9);
    expect(project([0, 1, 0], { yaw: 0, pitch: 90 })[2]).toBeCloseTo(1, 9);
  });
});
