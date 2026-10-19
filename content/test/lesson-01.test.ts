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

  it("the Lesson's Rank answers are the data's order (s04 and its Check Problem)", () => {
    const lesson = organic.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)).find((l) => l.id === "u1-l01")!;
    for (const id of ["s04", "s11"]) {
      const step = lesson.steps.find((s) => s.id === id)!;
      if (step.type !== "rank") throw new Error(`${id} is not a Rank Step`);
      const texts = step.answer.map((a) => step.items.find((i) => i.id === a)!.text);
      expect(byPolarity(texts), id).toEqual(texts);
    }
  });
});

describe("Lesson 1 content", () => {
  const lesson = organic.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)).find((l) => l.id === "u1-l01")!;

  it("has 14 Steps: Hook 1, Build 9, Check 3, Wrap 1, with glycine's charges as its signature Tap", () => {
    expect(lesson.phases).toEqual({ hook: 1, build: 9, check: 3, wrap: 1 });
    expect(lesson.signature).toBe("tap-to-identify");
    expect(lesson.steps.filter((s) => s.phase === "check").map((s) => "problemId" in s && s.problemId)).toEqual([
      "u1-bond-polarity-rank",
      "u1-fc-oxygen-three-bonds",
      "u1-fc-unreasonable",
    ]);
  });

  it("shows every electronegativity from the cited table, with its Source note", () => {
    // (Scene values join the Source note only in a build with the Scene catalog: see the scenes tests.)
    const s03 = lesson.steps.find((s) => s.id === "s03")!;
    expect(s03.citations?.map((c) => c.ref)).toContain("electronegativity-pauling/F");
    expect(s03.type !== "explain" && s03.reveal).toContain("F 3.98 (H 2.20)");
  });
});
