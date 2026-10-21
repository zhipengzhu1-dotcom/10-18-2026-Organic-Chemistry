// build-by-sharing (Lesson 0 s05, s09 and the octet-count Check Problem): the rules of the
// goal-state Manipulate Scene, its screen-reader text and its layout.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildBySharing, type SharingState } from "../src/build-by-sharing/manifest.ts";
import BuildBySharing from "../src/build-by-sharing/BuildBySharing.tsx";
import { defaultState } from "../src/state.ts";
import { layoutSharing } from "../src/build-by-sharing/layout.ts";
import { frameSize } from "../src/frame.ts";

const start = defaultState(buildBySharing) as SharingState;
const drop = (state: SharingState, handle: string, target: string) => buildBySharing.interact!.drop(state, { handle, target });
const methane: SharingState = { ...start, n: "H", e: "H", s: "H", w: "H" };
const pieces: SharingState = { ...methane, stage: "2" };

describe("build-by-sharing rules", () => {
  it("opens on a carbon with four single dots", () => {
    expect(start).toMatchObject({ stage: "1", n: "dot", e: "dot", s: "dot", w: "dot", joined: "no", count: "live" });
  });

  it("an H dropped on a single dot bonds there, and the screen reader hears the new count", () => {
    expect(drop(start, "tray-1", "dot-e")).toEqual({ state: { e: "H" }, say: "H bonded to carbon. Carbon holds 5 electrons." });
    expect(drop({ ...start, e: "H", n: "H", w: "H" }, "tray-4", "dot-s")).toEqual({
      state: { s: "H" },
      say: "H bonded to carbon. Carbon holds 8 electrons.",
    });
  });

  it("an H dropped on the carbon itself snaps onto its first single dot", () => {
    expect(drop({ ...start, n: "H" }, "tray-2", "carbon")).toMatchObject({ state: { e: "H" } });
  });

  it("refuses a fifth H and an H dropped on a full H, saying why", () => {
    expect(drop(methane, "tray-5", "carbon")).toEqual({ refused: "Carbon already holds 8, and there's no single dot left. It's full." });
    expect(drop({ ...start, n: "H" }, "tray-2", "h-n")).toEqual({ refused: "That H holds 2 already. It's full." });
  });

  it("a drop on empty space does nothing (the H slides back)", () => {
    expect(drop(start, "tray-1", "")).toBeNull();
  });

  it("stage 2: one CH₃ dropped on the other's single dot joins them into ethane", () => {
    const joined = { state: { joined: "yes" }, say: "The two carbons share a pair. Each carbon holds 8 electrons." };
    expect(drop(pieces, "piece-left", "dot-right")).toEqual(joined);
    expect(drop(pieces, "piece-right", "piece-left")).toEqual(joined);
    expect(drop(pieces, "piece-left", "dot-left")).toBeNull();
  });

  it("the nudge is the next move that works, until nothing is left", () => {
    expect(buildBySharing.interact!.next({ ...start, n: "H" })).toEqual({ handle: "tray-2", target: "dot-e" });
    expect(buildBySharing.interact!.next(pieces)).toEqual({ handle: "piece-left", target: "dot-right" });
    expect(buildBySharing.interact!.next({ ...pieces, joined: "yes" })).toBeUndefined();
  });
});

describe("build-by-sharing screen-reader text", () => {
  const say = (state: SharingState) => buildBySharing.describe(state, 0, {});

  it("counts the electrons around carbon live", () => {
    expect(say(start)).toBe(
      "A carbon atom with four single outer electrons, and a tray of 6 hydrogen atoms with one electron each. Carbon holds 4 electrons.",
    );
    expect(say({ ...start, n: "H", e: "H" })).toMatch(/2 hydrogens bonded.*Carbon holds 6 electrons\./);
  });

  it("gives no count when the count is hidden (the Check Problem asks for it)", () => {
    expect(say({ ...methane, count: "hidden" })).not.toMatch(/\d/);
  });

  it("names ethane once the pieces join", () => {
    expect(say({ ...pieces, joined: "yes" })).toBe(
      "Ethane, two carbons sharing a pair, each with three hydrogens. Each carbon holds 8 electrons.",
    );
  });
});

describe("build-by-sharing layout", () => {
  for (const aspect of ["16:9", "9:16"] as const) {
    it(`at ${aspect}, every hit circle sits inside the frame, apart from the others, and stays 48 px on a phone`, () => {
      const L = layoutSharing(aspect);
      const { width, height } = frameSize(aspect);
      const stage1 = [...["carbon", "dot-n", "dot-e", "dot-s", "dot-w"].map((id) => L.targetAt(id, start)!), ...L.tray];
      const stage2 = ["dot-left", "dot-right", "piece-left", "piece-right"].map((id) => L.targetAt(id, pieces)!);
      for (const group of [stage1, stage2]) {
        for (const p of group) {
          expect(p.x - L.hit).toBeGreaterThanOrEqual(0);
          expect(p.y - L.hit).toBeGreaterThanOrEqual(0);
          expect(p.x + L.hit).toBeLessThanOrEqual(width);
          expect(p.y + L.hit).toBeLessThanOrEqual(height);
        }
        for (const a of group) for (const b of group) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * L.hit);
      }
      // The site shows 16:9 in a column about 358 px wide on a 390 px phone.
      if (aspect === "16:9") expect((2 * L.hit * 358) / width).toBeGreaterThanOrEqual(48);
    });
  }
});

describe("build-by-sharing drawing", () => {
  const draw = (state: SharingState, input?: object, aspect: "16:9" | "9:16" = "16:9") =>
    renderToStaticMarkup(createElement(BuildBySharing, { t: 0, state, aspect, reducedMotion: false, cited: {}, input }));

  it("draws handles and targets as named buttons only when the Student can work it", () => {
    expect(draw(start)).not.toContain('role="button"');
    const live = draw(start, {});
    expect(live).toContain('data-handle="tray-1"');
    expect(live).toContain('data-target="dot-n"');
    // Numbered, so a screen reader tells the tray's atoms apart (SR pass, #88).
    expect(live).toContain('aria-label="Hydrogen atom 1 of 6 in the tray"');
    expect(live).toContain('aria-label="Hydrogen atom 6 of 6 in the tray"');
    // The drawn letters and counts are hidden from screen readers; the buttons and the description say it all.
    expect(live).not.toMatch(/<text(?![^>]*aria-hidden)[^>]*>/);
    expect(live).toContain('aria-label="Carbon&#x27;s single dot, top"');
  });

  it("every shared pair is two blue dots: methane has eight dots around carbon", () => {
    expect(draw(methane).match(/class="e"/g)).toHaveLength(8);
    expect(draw({ ...pieces, joined: "yes" }, undefined, "9:16").match(/class="e"/g)).toHaveLength(14);
  });
});
