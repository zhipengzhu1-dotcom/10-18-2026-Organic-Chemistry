// The Manim render pipeline for watch-only Scenes (#66): the renderer is fed
// from the cited-data lookup, every render writes a sources sidecar, and the
// committed outputs are checked against their inputs without running Manim.
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    expect(props.palette["at-space"]).toBe("#0d0626");
    expect(manimProps(starForge, cited, "16:9")).toMatchObject({ aspect: "16x9", width: 1920, height: 1080 });
  });
});

describe("sources sidecar", () => {
  const sidecar = sourcesSidecar(starForge, cited, "16:9", {
    "nuclides/He-4.A": [[2, 7.1]],
    "nuclides/C-12.A": [[5.4, 9.3]],
  });

  it("has the same shape as the video module's (#65) sidecars: each number, its citation and its on-screen time ranges", () => {
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

  it("ends with a paste-ready description block", () => {
    const lines = sidecar.description.split("\n");
    expect(lines.slice(0, 7)).toEqual([
      "Forged in a star",
      "",
      "Numbers on screen:",
      "0:00–0:13  helium-4 protons 2",
      "0:02–0:08  helium-4 mass number 4",
      "0:00–0:13  carbon-12 protons 6",
      "0:05–0:10  carbon-12 mass number 12",
    ]);
    expect(lines[8]).toBe("Sources:");
    expect(sidecar.description).toContain("NUBASE2020");
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
});
