// The sources sidecar (story 111): each number a render shows, cited from the
// same lookup the site uses, with its on-screen time range and a paste-ready
// description block.
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { sceneRegistry, type RegisteredScene } from "@astratron/scenes";
import { citedFor } from "../src/cited.ts";
import { sourcesSidecar } from "../src/sidecar.ts";

const model = buildContent(contentRoot).model!;

// A Scene that prints the C–H length from 2 s to 4 s and draws nothing else cited.
const flash: RegisteredScene<{}> = {
  manifest: {
    id: "flash",
    title: "Flash a bond length",
    states: {},
    describe: () => "A bond length appears, then goes.",
    reducedMotion: "Opens paused.",
    data: ["methane/r.CH"],
    duration: 6,
    poster: { t: 3 },
    video: { duration: 6, timeline: [{ at: 0, state: {} }], poster: 3, aspects: ["16:9", "9:16"] },
  },
  Component: ({ t, cited }) =>
    createElement("svg", { viewBox: "0 0 1920 1080" }, t >= 2 && t < 4 ? createElement("text", null, cited["methane/r.CH"]!.display) : null),
};

describe("citedFor", () => {
  it("looks each ref up in the course model's cited data", () => {
    const cited = citedFor(model, ["methane/r.CH"]);
    expect(cited["methane/r.CH"]!.display).toBe("1.09 Å");
    expect(cited["methane/r.CH"]!.source.citation).toMatch(/^E Hirota "Anharmonic Potential Function/);
  });

  it("names a ref that isn't in any Subject's data", () => {
    expect(() => citedFor(model, ["methane/r.XX"])).toThrow(/methane\/r\.XX/);
  });
});

describe("sourcesSidecar", () => {
  it("records when a printed number is on screen, from the rendered frames", () => {
    const sidecar = sourcesSidecar(flash, "16:9", citedFor(model, flash.manifest.data));
    expect(sidecar.file).toBe("flash-16x9.mp4");
    expect(sidecar.numbers).toHaveLength(1);
    const [ch] = sidecar.numbers;
    expect(ch).toMatchObject({
      ref: "methane/r.CH",
      label: "C–H",
      display: "1.09 Å",
      full: "1.087 Å",
      shown: "text",
      onScreen: [{ from: 2, to: 4 }],
    });
    expect(ch!.citation).toMatch(/^E Hirota "Anharmonic Potential Function and Equilibrium Structure of Methane" J\. Mol\. Spect\. 77, 213-221 \(1979\)/);
    expect(ch!.via).toMatch(/^NIST CCCBDB/);
  });

  it("writes a paste-ready description naming each number, its time range and its source", () => {
    const { description } = sourcesSidecar(flash, "9:16", citedFor(model, flash.manifest.data));
    expect(description).toContain("0:02–0:04  C–H 1.09 Å");
    expect(description).toContain("E Hirota \"Anharmonic Potential Function and Equilibrium Structure of Methane\" J. Mol. Spect. 77, 213-221 (1979)");
    // The site's Source note text, word for word, follows the timed list.
    expect(description).toContain("Geometry: experimental (gas phase). C–H 1.087 Å from E Hirota");
  });

  it("counts a cited colour the Scene draws with as on screen for the whole video", () => {
    const twist = sceneRegistry["pi-twist"]!;
    const sidecar = sourcesSidecar(twist, "16:9", citedFor(model, twist.manifest.data));
    expect(sidecar.numbers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ref: "elements/C.colour", display: "#909090", shown: "colour", onScreen: [{ from: 0, to: 8 }] }),
      ]),
    );
    expect(sidecar).toMatchObject({ scene: "pi-twist", aspect: "16:9", fps: 60, duration: 8 });
  }, 30_000); // pi-twist draws every frame of an 8 s video (slow when the machine is busy)

  it("falls back to the whole video for a cited value used in the drawing but never printed", () => {
    const hidden: RegisteredScene<{}> = { ...flash, Component: () => createElement("svg", null) };
    const [ch] = sourcesSidecar(hidden, "16:9", citedFor(model, flash.manifest.data)).numbers;
    expect(ch).toMatchObject({ shown: "drawn", onScreen: [{ from: 0, to: 6 }] });
  });
});
