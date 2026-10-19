// The Blender side of the import (molecule_import.py), run only where Blender is installed:
// CI has no Blender, so there this suite is skipped and the committed renders are checked by hash.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLENDER, blenderProps, repoRoot } from "./render.ts";

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

describe.skipIf(!existsSync(BLENDER))("molecule_import.py in Blender", () => {
  it("builds the molecule's atoms where the props put them, and lays a data-frame orbital mesh over them", () => {
    const work = mkdtempSync(join(tmpdir(), "blender-import-"));
    try {
      const props = blenderProps("share-site");
      writeFileSync(join(work, "props.json"), JSON.stringify(props));
      // A mesh point sitting exactly on water's first H (data frame, from water.json).
      const h = { x: 0, y: 0.7572, z: -0.4692 };
      const out = execFileSync(
        BLENDER,
        ["-b", "--factory-startup", "-noaudio", "-P", join(repoRoot, "pipelines/blender/import_probe.py"), "--", join(work, "props.json"), `${h.x},${h.y},${h.z}`, work],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      const probe = JSON.parse(out.split("\n").find((l) => l.startsWith("PROBE "))!.slice(6));
      const water = props.molecules[0];
      expect(probe.atoms).toHaveLength(3);
      // Image frame (x right, y up, z toward the viewer) → Blender (x, −z, y).
      const expected = water.atoms.map((a) => [a.x, -a.z, a.y]);
      for (const atom of probe.atoms) {
        const i = expected.findIndex((e) => e.every((v, k) => Math.abs(v - atom.centre[k]) < 1e-3));
        expect(i).toBeGreaterThanOrEqual(0);
        expect(atom.radius).toBeCloseTo(water.elements[water.atoms[i].element].radius, 3);
      }
      const oxygen = probe.atoms.find((a: { radius: number }) => Math.abs(a.radius - 0.456) < 1e-3);
      expect(oxygen.colour[0]).toBeCloseTo(linear(0xff / 255), 3); // Jmol O #FF0D0D
      expect(oxygen.colour[1]).toBeCloseTo(linear(0x0d / 255), 3);
      // The mesh point on H lands on the H atom; the "hatched" node gets the hatched material.
      const h1 = expected[1];
      probe.mesh.centre.forEach((v: number, k: number) => expect(v).toBeCloseTo(h1[k], 2));
      expect(probe.mesh.material).toMatch(/hatched$/);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 60_000);
});
