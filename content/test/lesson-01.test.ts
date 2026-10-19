// Lesson 1 (Bonds, Polarity & Formal Charge): the build-time sanity checks its
// spec asks of the cited electronegativities. If one fails, the Step is
// rewritten, never the data.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { cite } from "../src/data.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const en = (el: string) => Number(cite(organic.data, `electronegativity-pauling/${el}`).value);
/** ΔEN of a bond written "C–H". */
const delta = (bond: string) => {
  const [a, b] = bond.split("–");
  return Math.abs(en(a) - en(b));
};
const byPolarity = (bonds: string[]) => [...bonds].sort((p, q) => delta(p) - delta(q));

describe("Lesson 1 electronegativity checks", () => {
  it("every element the Lesson shows has a cited Pauling value, shown to 2 decimals", () => {
    const shown = ["H", "B", "C", "N", "O", "F", "Cl", "Br"].map(
      (el) => cite(organic.data, `electronegativity-pauling/${el}`).display,
    );
    expect(shown).toEqual(["2.20", "2.04", "2.55", "3.04", "3.44", "3.98", "3.16", "2.96"]);
  });

  it("the s04 bonds rank C–H < N–H < O–H < C–F", () => {
    expect(byPolarity(["C–F", "O–H", "C–H", "N–H"])).toEqual(["C–H", "N–H", "O–H", "C–F"]);
  });

  it("the u1-bond-polarity-rank bonds rank C–H < C–Cl < C–O < O–H", () => {
    expect(byPolarity(["C–O", "C–H", "O–H", "C–Cl"])).toEqual(["C–H", "C–Cl", "C–O", "O–H"]);
  });

  it("carbon is above hydrogen, so carbon is the (slightly) δ− end of C–H", () => {
    expect(en("C")).toBeGreaterThan(en("H"));
  });
});
