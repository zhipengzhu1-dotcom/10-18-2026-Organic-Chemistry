// The Sources sidecar (story 111) both video paths write: Remotion measures
// on-screen ranges from rendered markup, Manim from its script's timings, and
// each hands them here. Fake ranges stand in for both measurements.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { resolveSceneUse } from "../src/scenes.ts";
import { citedFor, sourcesSidecar } from "../src/sidecar.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const refs = ["methane/r.CH", "elements/C.colour", "nuclides/C-12.Z"];
const cited = citedFor("flash", refs, data);
const video = { scene: "flash", title: "Flash a bond length", aspect: "16:9", file: "flash-16x9.mp4", fps: 60, duration: 6, refs };

describe("sourcesSidecar", () => {
  // As Remotion measures (frame runs in seconds) and as Manim's timings give them (unrounded seconds).
  const sidecar = sourcesSidecar(video, cited, {
    "methane/r.CH": [{ from: 2, to: 4 }, { from: 4.51666666, to: 5.0333333 }],
    "elements/C.colour": [{ from: 0, to: 6 }],
  });

  it("lists each ref in order with its citation, how it was shown and its rounded on-screen ranges", () => {
    expect(Object.keys(sidecar)).toEqual(["scene", "title", "aspect", "file", "fps", "duration", "numbers", "description"]);
    expect(sidecar).toMatchObject({ scene: "flash", aspect: "16:9", file: "flash-16x9.mp4", fps: 60, duration: 6 });
    const [ch, colour, protons] = sidecar.numbers;
    expect(ch).toMatchObject({
      ref: "methane/r.CH",
      label: "C–H",
      display: "1.09 Å",
      full: "1.087 Å",
      shown: "text",
      onScreen: [{ from: 2, to: 4 }, { from: 4.517, to: 5.033 }],
    });
    expect(ch!.citation).toMatch(/^E Hirota "Anharmonic Potential Function and Equilibrium Structure of Methane"/);
    expect(ch!.via).toMatch(/^NIST CCCBDB/);
    expect(colour).toMatchObject({ ref: "elements/C.colour", display: "#909090", shown: "colour", onScreen: [{ from: 0, to: 6 }] });
    // Cited but never measured on screen (it only shapes the drawing): on screen for the whole video.
    expect(protons).toMatchObject({ ref: "nuclides/C-12.Z", shown: "drawn", onScreen: [{ from: 0, to: 6 }] });
  });

  it("writes a paste-ready description: each range as m:ss covering the value, then the site's Source note", () => {
    const lines = sidecar.description.split("\n");
    expect(lines.slice(0, 7)).toEqual([
      "Flash a bond length",
      "",
      "Numbers on screen:",
      "0:02–0:04  C–H 1.09 Å",
      "0:04–0:06  C–H 1.09 Å",
      "0:00–0:06  C colour #909090",
      "0:00–0:06  carbon-12 protons 6",
    ]);
    expect(lines[8]).toBe("Sources:");
    expect(sidecar.description).toContain("Geometry: experimental (gas phase). C–H 1.087 Å from E Hirota");
    expect(sourcesSidecar({ ...video, refs: [] }, {}, {}).description).toBe("Flash a bond length\nThis video shows no cited numbers.");
  });
});

describe("an unknown ref", () => {
  it("throws, naming the Scene and the ref, in the lookup, the conversion and resolveSceneUse", () => {
    const message = 'Scene "flash" cites "methane/r.XX", which is not in the cited data';
    expect(() => citedFor("flash", ["methane/r.XX"], data)).toThrow(message);
    expect(() => sourcesSidecar({ ...video, refs: ["methane/r.XX"] }, cited, {})).toThrow(message);
    const catalog = { flash: { states: {}, data: ["methane/r.XX"] } };
    expect(() => resolveSceneUse({ id: "flash" }, catalog as never, data)).toThrow(message);
  });

  it("is looked up in each data set in turn", () => {
    expect(citedFor("flash", ["methane/r.CH"], {}, data)["methane/r.CH"]!.display).toBe("1.09 Å");
  });
});
