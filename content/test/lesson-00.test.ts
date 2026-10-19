// Lesson 0 (Why Carbon?, the On-ramp): built from its merged Lesson spec, with the
// build-time checks the spec asks of the cited data. If a check fails, the Step is
// rewritten, never the data. (give-or-take's electrons-to-move check lives with the
// Scene: scenes/test/give-or-take.test.ts.)
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { cite } from "../src/data.ts";
import type { Step } from "../src/model.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const unit = organic.courses[0].units.find((u) => u.id === "u1")!;
const lesson = unit.lessons.find((l) => l.id === "u1-l00")!;
const step = (id: string) => lesson.steps.find((s) => s.id === id)! as Step & Record<string, unknown>;

describe("Lesson 0: Why Carbon?", () => {
  it("is Unit 1's On-ramp: Lesson 0, first in the Unit, 9 Steps shaped Hook 1, Build 5, Check 2, Wrap 1", () => {
    expect(unit.lessons[0].id).toBe("u1-l00");
    expect(lesson).toMatchObject({ number: 0, onRamp: true, title: "Why Carbon?", signature: "manipulate" });
    expect(lesson.steps.map((s) => s.id)).toEqual(["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09"]);
    expect(lesson.phases).toEqual({ hook: 1, build: 5, check: 2, wrap: 1 });
    expect(lesson.steps.map((s) => s.type)).toEqual([
      "multiple-choice", "explain", "manipulate", "explain", "manipulate-goal", "tap-to-identify", "multiple-choice", "numeric", "explain",
    ]);
  });

  it("its Check Steps play its two Check Problems, which the Practice Set never draws", () => {
    expect(step("s07")).toMatchObject({ problemId: "u1-onramp-why-share", answer: ["a"] });
    expect(step("s08")).toMatchObject({ problemId: "u1-onramp-octet-count", answer: 8, tolerance: 0 });
    const bank = unit.bank.filter((p) => p.lesson === "u1-l00");
    expect(bank.map((p) => [p.id, p.status, p.check, p.onRamp])).toEqual([
      ["u1-onramp-octet-count", "approved", true, true],
      ["u1-onramp-why-share", "approved", true, true],
    ]);
  });

  it("every number in its text comes from the cited data", () => {
    expect(step("s01").prompt).toBe("Carbon is only 0.02% of Earth's crust. Roughly how much of *your* body's mass is carbon?");
    expect(step("s01").reveal).toContain("About **23%** of you is carbon");
    expect(step("s03").reveal).toBe("4 to give: 148.0 eV. 4 to take: carbon holds 1 extra electron, but not 4.");
    const refs = (id: string) => (step(id).citations ?? []).map((c) => c.ref);
    expect(refs("s01")).toEqual(["carbon-abundance/crust.C", "carbon-abundance/body.C"]);
    expect(refs("s03")).toEqual(["ionization-li-f/C.give"]);
    // (Scene values join the Source note in a build with the Scene catalog: scenes/test/registry.test.ts.)
  });

  it("the Hook's reveal holds: the body's carbon share is over a thousand times the crust's", () => {
    const crust = Number(cite(organic.data, "carbon-abundance/crust.C").value);
    const body = Number(cite(organic.data, "carbon-abundance/body.C").value);
    expect(body / crust).toBeGreaterThan(1000);
  });

  it("its Scenes: star-forge then crust-vs-body on s01, give-or-take on Li, build-by-sharing as a goal, ethane on the Wrap", () => {
    expect(step("s01")).toMatchObject({ scene: { id: "star-forge" }, revealScene: { id: "crust-vs-body" } });
    expect(step("s02")).toMatchObject({ scene: { id: "outer-electrons" } });
    expect(step("s03")).toMatchObject({ scene: { id: "give-or-take", state: { atom: "Li" } }, control: "atom", answer: "C" });
    expect(step("s04")).toMatchObject({ scene: { id: "water-push" } });
    expect(step("s05")).toMatchObject({
      scene: { id: "build-by-sharing" },
      idleSeconds: 30,
      stages: [{ goal: { n: "H", e: "H", s: "H", w: "H" } }, { start: { stage: "2" }, goal: { joined: "yes" } }],
    });
    expect(step("s09")).toMatchObject({ scene: { id: "build-by-sharing", state: { stage: "2", joined: "yes" } } });
  });

  it("s06 asks for exactly the A ring and the C19 methyl of testosterone, with estradiol drawn above", () => {
    expect(step("s06")).toMatchObject({ answer: ["ring-a", "c19"], structure: { structure: { id: "testosterone" } } });
    expect(step("s06").figures).toMatchObject([{ view: { structure: { id: "estradiol" } }, caption: "Estradiol", large: true }]);
  });
});
