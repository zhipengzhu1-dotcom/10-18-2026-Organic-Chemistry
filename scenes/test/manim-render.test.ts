// The Manim render pipeline for watch-only Scenes (#66): the renderer is fed
// from the cited-data lookup, every render writes a sources sidecar, and the
// committed outputs are checked against their inputs without running Manim.
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { cite } from "@astratron/content/data";
import { checkWatchRenders, manimProps, repoRoot, sourcesSidecar } from "../src/manim/pipeline.ts";
import { watchSceneManifests } from "../src/watch.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const starForge = watchSceneManifests.find((m) => m.id === "star-forge")!;
const cited = Object.fromEntries(starForge.data.map((ref) => [ref, cite(organic.data, ref)]));

describe("Manim render inputs", () => {
  it("hand the renderer the cited values, its words, 60 fps and the frame size of the aspect", () => {
    const props = manimProps(starForge, cited, "9:16");
    expect(props).toMatchObject({
      scene: "star-forge",
      aspect: "9x16",
      fps: 60,
      width: 1080,
      height: 1920,
      duration: 13,
      values: { "nuclides/He-4.Z": 2, "nuclides/He-4.A": 4, "nuclides/C-12.Z": 6, "nuclides/C-12.A": 12 },
      text: { card: ["Every carbon atom", "in you was forged", "in a star."] },
    });
    expect(manimProps(starForge, cited, "16:9")).toMatchObject({ aspect: "16x9", width: 1920, height: 1080 });
  });

  it("draw on Paper Notebook: white paper, pen ink and marker fills from tokens.css, no Arcade colours", () => {
    const { palette } = manimProps(starForge, cited, "16:9");
    expect(palette).toMatchObject({
      "at-paper": "#ffffff",
      "at-rule": "#e3ecfa",
      "at-ink": "#1d1b26",
      "at-blue": "#0a64c2",
      "at-orange": "#a94a00",
      "at-blue-fill": "#4dabff",
      "at-yellow-fill": "#ffd84d",
    });
    expect(Object.keys(palette).filter((k) => /space|neb|electron|ignite|boss|star-core/.test(k))).toEqual([]);
  });

  it("doodles (shared with the Blender share images) are pen ink and marker fills only: token colours, no red", () => {
    const { palette } = manimProps(starForge, cited, "16:9");
    const allowed = new Set([palette["at-ink"], ...Object.entries(palette).filter(([k]) => k.endsWith("-fill")).map(([, v]) => v)]);
    const dir = join(repoRoot, "scenes/manim/doodles");
    const names = readdirSync(dir).sort();
    expect(names).toEqual(["atom.svg", "beaker.svg", "benzene.svg", "flask.svg", "sprig.svg", "tubes.svg"]);
    for (const name of names)
      for (const [hex] of readFileSync(join(dir, name), "utf8").matchAll(/#[0-9a-fA-F]{6}\b/g)) expect(allowed, `${name} ${hex}`).toContain(hex.toLowerCase());
  });

  it("follow tokens.css: a changed paper colour reaches the props", () => {
    const root = mkdtempSync(join(tmpdir(), "watch-tokens-"));
    try {
      cpSync(join(repoRoot, "site/src/styles/tokens.css"), join(root, "site/src/styles/tokens.css"));
      const css = readFileSync(join(root, "site/src/styles/tokens.css"), "utf8");
      writeFileSync(join(root, "site/src/styles/tokens.css"), css.replace("--at-paper: #ffffff", "--at-paper: #fffdf5"));
      expect(manimProps(starForge, cited, "16:9", root).palette["at-paper"]).toBe("#fffdf5");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("sources sidecar", () => {
  const sidecar = sourcesSidecar(starForge, cited, "16:9", {
    "nuclides/He-4.A": [[2, 7.1]],
    "nuclides/C-12.A": [[5.4, 9.3]],
  });

  it("takes each number's on-screen time ranges from the script's timings (@astratron/content/sidecar's shape)", () => {
    expect(sidecar).toMatchObject({ scene: "star-forge", title: "Forged in a star", aspect: "16:9", file: "star-forge-16x9.mp4", fps: 60, duration: 13 });
    expect(sidecar.numbers.find((n) => n.ref === "nuclides/C-12.A")).toEqual({
      ref: "nuclides/C-12.A",
      label: "carbon-12 mass number",
      quantity: "count",
      value: 12,
      display: "12",
      full: "12",
      citation:
        'Kondev et al., "The NUBASE2020 evaluation of nuclear physics properties", Chinese Phys. C 45, 030001 (2021), doi:10.1088/1674-1137/abddae',
      licence: "Published values, cited (facts from the literature)",
      shown: "text",
      onScreen: [{ from: 5.4, to: 9.3 }],
    });
    // A value the video draws without printing it (the proton count sets the nucleons) counts as on screen throughout.
    expect(sidecar.numbers.find((n) => n.ref === "nuclides/C-12.Z")).toMatchObject({ shown: "drawn", onScreen: [{ from: 0, to: 13 }] });
  });

  it("throws on a ref missing from the cited data, naming the Scene and the ref", () => {
    expect(() => checkWatchRenders([{ ...starForge, data: ["nuclides/Xx.Z"] }], organic.data)).toThrow(
      'Scene "star-forge" cites "nuclides/Xx.Z", which is not in the cited data',
    );
  });
});

describe("committed renders", () => {
  it("every watch-only Scene's shipped files are there and up to date with their inputs", () => {
    expect(checkWatchRenders(watchSceneManifests, organic.data)).toEqual([]);
  });

  it("flag a render whose inputs changed since it was made, and a missing file", () => {
    const root = mkdtempSync(join(tmpdir(), "watch-renders-"));
    try {
      for (const dir of ["scenes/manim", "site/public/scenes/star-forge", "site/src/styles/tokens.css"]) cpSync(join(repoRoot, dir), join(root, dir), { recursive: true });
      writeFileSync(join(root, "scenes/manim", starForge.render.script), "# edited\n", { flag: "a" });
      rmSync(join(root, "site/public/scenes/star-forge/star-forge-9x16.poster.jpg"));
      expect(checkWatchRenders([starForge], organic.data, root)).toEqual([
        "scenes/star-forge: its inputs changed since the committed render; run `pnpm scenes:render star-forge`",
        "scenes/star-forge: site/public/scenes/star-forge/star-forge-9x16.poster.jpg is missing; run `pnpm scenes:render star-forge`",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flag a render when the shared paper drawing (paper.py, a doodle) changes", () => {
    for (const file of ["paper.py", "doodles/flask.svg"]) {
      const root = mkdtempSync(join(tmpdir(), "watch-renders-"));
      try {
        for (const dir of ["scenes/manim", "site/public/scenes/star-forge", "site/src/styles/tokens.css"]) cpSync(join(repoRoot, dir), join(root, dir), { recursive: true });
        writeFileSync(join(root, "scenes/manim", file), "\n", { flag: "a" });
        expect(checkWatchRenders([starForge], organic.data, root)).toEqual([
          "scenes/star-forge: its inputs changed since the committed render; run `pnpm scenes:render star-forge`",
        ]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });
});
