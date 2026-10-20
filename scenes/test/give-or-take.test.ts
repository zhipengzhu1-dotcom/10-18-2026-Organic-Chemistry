// give-or-take (Lesson 0 s03): the build-time sanity check the spec asks for, the
// screen-reader text at each slider stop, and the rule that the electron affinity
// is never drawn as a cost beside the Give bar.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { ATOMS, giveOrTake, routes } from "../src/give-or-take/manifest.ts";
import GiveOrTake from "../src/give-or-take/GiveOrTake.tsx";
import { VALENCE } from "@astratron/content/valence";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const cited = Object.fromEntries(giveOrTake.data.map((ref) => [ref, find(data, ref)!]));

describe("give-or-take sanity check (spec: Data notes)", () => {
  it("electrons to move, the cheaper way, read 1, 2, 3, 4, 3, 2, 1 from Li to F", () => {
    expect(ATOMS.map((atom) => routes(atom, cited).move)).toEqual([1, 2, 3, 4, 3, 2, 1]);
  });

  it("carbon's count is 4, the largest in the row and the only one that large", () => {
    const counts = ATOMS.map((atom) => routes(atom, cited).move);
    expect(routes("C", cited).move).toBe(4);
    expect(counts.filter((n) => n === Math.max(...counts))).toEqual([4]);
  });

  it("the Give bar is the sum of the atom's first ionization energies, one per outer electron", () => {
    for (const atom of ATOMS) {
      const v = routes(atom, cited).give.count;
      const sum = Array.from({ length: v }, (_, i) => Number(find(data, `ionization-li-f/${atom}.${i + 1}`)!.value)).reduce((a, b) => a + b);
      expect(Number(cited[`ionization-li-f/${atom}.give`].value)).toBeCloseTo(sum, 6);
    }
  });

  it("only Be and N have no bound anion", () => {
    expect(ATOMS.filter((atom) => !routes(atom, cited).take.released)).toEqual(["Be", "N"]);
  });

  it("the dot drawings' outer-electron counts agree with the cited data", () => {
    for (const el of ["C", "N", "O", "F"]) expect(cited[`ionization-li-f/${el}.valence`].value).toBe(VALENCE[el]);
  });
});

describe("give-or-take screen-reader text", () => {
  const say = (atom: string) => giveOrTake.describe({ atom }, 0, cited);

  it("reads the stop the Student is on, as the spec words it", () => {
    expect(say("C")).toBe(
      "Carbon: 4 outer electrons. Give 4, costing 148.0 electron-volts, or take 4: the first one releases 1.26 electron-volts, and a lone atom won't hold more. Electrons to move, cheaper way: 4.",
    );
    expect(say("Be")).toBe(
      "Beryllium: 2 outer electrons. Give 2, costing 27.5 electron-volts, or take 6: a lone atom won't hold even one. Electrons to move, cheaper way: 2.",
    );
  });

  it("still describes a stop without the cited values (the manifest check)", () => {
    expect(giveOrTake.describe({ atom: "C" }, 0, {})).toMatch(/^Carbon/);
  });
});

describe("give-or-take drawing", () => {
  const draw = (atom: string) =>
    renderToStaticMarkup(createElement(GiveOrTake, { t: 2, state: { atom }, aspect: "16:9", reducedMotion: false, cited }));

  it("labels the bars for one atom alone, the release dashed and apart from the Give bar", () => {
    const svg = draw("C");
    expect(svg).toContain("one atom, alone in empty space");
    expect(svg).toContain("148.0 eV");
    expect(svg).toContain("1.26 eV released");
    expect(svg).toContain("a lone atom won&#x27;t hold this one");
    expect(svg).toMatch(/class="released"[^>]*stroke-dasharray/);
  });

  it("draws no released bar where the anion isn't bound", () => {
    const svg = draw("N");
    expect(svg).not.toContain('class="released"');
    expect(svg).toContain("a lone atom won&#x27;t hold even one");
  });
});
