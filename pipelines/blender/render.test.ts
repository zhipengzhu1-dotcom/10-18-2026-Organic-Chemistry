import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { blenderProps, checkBlenderRenders, repoRoot, webpSize } from "./render.ts";

const distance = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) =>
  Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

describe("what Blender is given for a share image (only the pipeline's data)", () => {
  it("the site image is the Push hero's water, in cited Jmol colours at 30% of Bondi radii, with the wordmark", () => {
    const props = blenderProps("share-site");
    expect(props).toMatchObject({ width: 1200, height: 630 });
    expect(props.molecules.map((m) => m.id)).toEqual(["water"]);
    const water = props.molecules[0];
    expect(water.atoms.map((a) => a.element)).toEqual(["O", "H", "H"]);
    expect(water.elements.O.colour).toBe("#FF0D0D");
    expect(water.elements.O.radius).toBeCloseTo(0.456, 6); // Bondi O 1.52 Å × 0.3
    expect(water.elements.H.radius).toBeCloseTo(0.36, 6); // Bondi H 1.20 Å × 0.3
    expect(water.bonds).toHaveLength(2);
    // Turned and placed as a whole: the cited O–H length (0.958 Å) survives.
    expect(distance(water.atoms[0], water.atoms[1])).toBeCloseTo(0.958, 3);
    expect(props.text).toContainEqual(expect.objectContaining({ text: "AstraTron", font: "script", colour: "#1d1b26" }));
  });

  it("the wordmark is in Kaushan Script, 40 px and up, on both images", () => {
    for (const name of ["share-site", "share-unit-1"] as const) {
      const props = blenderProps(name);
      expect(props.fonts.script).toBe("pipelines/blender/fonts/KaushanScript-Regular.ttf");
      const wordmark = props.text.find((t) => t.text === "AstraTron")!;
      expect(wordmark.font).toBe("script");
      expect(wordmark.size).toBeGreaterThanOrEqual(40);
      expect(props.text.filter((t) => t.font === "script")).toHaveLength(1); // the script face is a signature: one use
    }
  });

  it("the ground is ruled paper with doodles, not the Arcade nebula", () => {
    const props = blenderProps("share-site");
    expect(props.palette["at-paper"]).toBe("#ffffff");
    expect(props.paper).toEqual({ rule: 32, margin: 64 });
    expect(props.doodles.length).toBeGreaterThan(0);
    for (const d of props.doodles) expect(d.path).toMatch(/^scenes\/manim\/doodles\/(flask|tubes|benzene|atom|sprig|beaker)\.svg$/);
    expect(Object.keys(props.palette).filter((k) => /space|neb|electron|ignite/.test(k))).toEqual([]);
  });

  it("the Unit 1 image shows sp3, sp2 and sp carbon and the Unit's title from the course manifest", () => {
    const props = blenderProps("share-unit-1");
    expect(props.molecules.map((m) => m.id)).toEqual(["methane", "ethylene", "acetylene"]);
    const acetylene = props.molecules[2];
    expect(acetylene.bonds.find((b) => b.a === 0 && b.b === 1)?.order).toBe(3);
    expect(props.text.map((t) => t.text)).toEqual(expect.arrayContaining(["Unit 1", "Structure & Bonding"]));
    expect(props.text.find((t) => t.text === "Unit 1")?.font).toBe("data");
  });
});

describe("the committed renders", () => {
  it("are current: every recorded input still hashes the same", () => {
    expect(checkBlenderRenders()).toEqual([]);
  });

  it("are the sizes the spec asks for", () => {
    expect(webpSize(readFileSync(join(repoRoot, "site/public/share/site.webp")))).toEqual({ width: 1200, height: 630 });
    expect(webpSize(readFileSync(join(repoRoot, "site/public/share/unit-1.webp")))).toEqual({ width: 1200, height: 630 });
    const matcap = readFileSync(join(repoRoot, "site/public/matcaps/studio.webp"));
    expect(webpSize(matcap)).toEqual({ width: 512, height: 512 });
    expect(matcap.length).toBeLessThan(16_000); // ~10 KB
  });
});

describe("the staleness gate (no Blender needed)", () => {
  let root: string;
  const copy = () => {
    root = mkdtempSync(join(tmpdir(), "blender-check-"));
    for (const dir of ["content", "pipelines/blender", "site/public/share", "site/public/matcaps", "site/src/styles", "scenes/manim/fonts", "scenes/manim/doodles"])
      cpSync(join(repoRoot, dir), join(root, dir), { recursive: true });
    return root;
  };
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("flags a render whose script changed", () => {
    copy();
    const script = join(root, "pipelines/blender/make_matcap.py");
    writeFileSync(script, readFileSync(script, "utf8") + "\n# changed\n");
    expect(checkBlenderRenders(root)).toEqual([expect.stringMatching(/^matcap: .*make_matcap\.py changed.*pnpm blender render matcap/)]);
  });

  it("flags a share image whose cited data changed", () => {
    copy();
    const elements = join(root, "content/subjects/organic/data/elements.yaml");
    writeFileSync(elements, readFileSync(elements, "utf8").replace('O.colour: { label: O colour, quantity: colour, value: "#FF0D0D"', 'O.colour: { label: O colour, quantity: colour, value: "#FF0E0E"'));
    expect(checkBlenderRenders(root)).toEqual([expect.stringMatching(/^share-site: .*props.*changed/)]);
  });

  it("ignores cited data a render doesn't use", () => {
    copy();
    const elements = join(root, "content/subjects/organic/data/elements.yaml");
    writeFileSync(elements, readFileSync(elements, "utf8").replace('value: "#A62929"', 'value: "#A62928"')); // Br
    expect(checkBlenderRenders(root)).toEqual([]);
  });

  it("flags an output edited by hand", () => {
    copy();
    writeFileSync(join(root, "site/public/share/unit-1.webp"), "not the render");
    expect(checkBlenderRenders(root)).toEqual([expect.stringMatching(/^share-unit-1: .*unit-1\.webp.*not the recorded render/)]);
  });
});
