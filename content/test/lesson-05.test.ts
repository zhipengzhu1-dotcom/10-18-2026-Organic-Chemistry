// Lesson 5: Functional Groups (#83), checked against its merged spec's shape
// checks and drawing rules (docs/specs/unit-1/lesson-05-functional-groups.md).
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot, type Lesson, type Step, type StructureView } from "../src/index.ts";

const unit = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.courses[0].units[0];
const lesson: Lesson = unit.lessons.find((l) => l.id === "u1-l05")!;
const step = (id: string) => lesson.steps.find((s) => s.id === id)!;

/** Every structure a Step draws: its figure, its cards, its Tap structure. */
function views(s: Step): StructureView[] {
  if (s.type === "multiple-choice") return [...(s.figures ?? []).map((f) => f.view), ...s.options.flatMap((o) => (o.structure ? [o.structure] : []))];
  if (s.type === "tap-to-identify") return [s.structure];
  return [];
}

describe("Lesson 5 shape", () => {
  it("has 14 Steps: Hook 1, Build 9, Check 3, Wrap 1, with Explain Steps at 2, 4, 7 and 14", () => {
    expect(lesson.steps).toHaveLength(14);
    expect(lesson.phases).toEqual({ hook: 1, build: 9, check: 3, wrap: 1 });
    expect(lesson.steps.flatMap((s, i) => (s.type === "explain" ? [i + 1] : []))).toEqual([2, 4, 7, 14]);
  });

  it("plays its three Check Problems in the spec's order, and its signature is the amoxicillin Tap", () => {
    expect(lesson.steps.filter((s) => s.phase === "check").map((s) => (s as { problemId?: string }).problemId)).toEqual([
      "u1-fg-ketone",
      "u1-fg-capsaicin",
      "u1-fg-amoxicillin",
    ]);
    expect(step("s13")).toMatchObject({ type: "tap-to-identify", problemId: "u1-fg-amoxicillin" });
    expect(lesson.signature).toBe("tap-to-identify");
  });

  it("files its Check Problems in Unit 1's Bank as approved", () => {
    for (const id of ["u1-fg-ketone", "u1-fg-capsaicin", "u1-fg-amoxicillin"])
      expect(unit.bank.find((p) => p.id === id)).toMatchObject({ lesson: "u1-l05", status: "approved", check: true });
  });

  it("gives every Step but the Wrap a Source note", () => {
    expect(lesson.steps.filter((s) => !s.sourceNote).map((s) => s.id)).toEqual(["s14"]);
  });

  it("shows no chemistry numbers, so cites no data", () => {
    expect(lesson.steps.flatMap((s) => s.citations ?? [])).toEqual([]);
  });
});

describe("Lesson 5 drawings", () => {
  it("draws every structure line-angle with lone pairs hidden and no charges", () => {
    for (const s of lesson.steps)
      for (const v of views(s)) {
        expect(v.structure.style, `${s.id} ${v.structure.id}`).toBe("line-angle");
        expect(v.hide, `${s.id} ${v.structure.id}`).toContain("lone-pairs");
        expect(v.structure.atoms.filter((a) => a.charge)).toEqual([]);
      }
  });

  it("credits each drawn molecule's PubChem CID in its Step's Source note", () => {
    for (const s of lesson.steps)
      for (const v of views(s)) {
        const cid = v.structure.source?.match(/PubChem CID (\d+)/)?.[1];
        expect(cid, `${v.structure.id} has a PubChem source`).toBeDefined();
        expect(s.sourceNote, `${s.id} credits CID ${cid}`).toContain(cid);
      }
  });

  it("keeps Tap regions apart: no atom in two regions", () => {
    for (const s of lesson.steps) {
      if (s.type !== "tap-to-identify") continue;
      const atoms = s.targets.flatMap((t) => t.atoms ?? []);
      expect(new Set(atoms).size, s.id).toBe(atoms.length);
    }
  });

  it("gives amoxicillin ten regions, six of them the answer", () => {
    const tap = step("s13");
    if (tap.type !== "tap-to-identify") throw new Error("s13 is not a Tap");
    expect(tap.targets).toHaveLength(10);
    expect(tap.answer).toEqual(["phenol", "amine", "side-amide", "lactam", "sulfide", "acid"]);
  });

  it("shows the spotlight with the answer on s01, s06, s09 and the capsaicin and amoxicillin Problems", () => {
    const reveals = lesson.steps.flatMap((s) => ("revealScene" in s && s.revealScene ? [[s.id, s.revealScene.id, s.revealScene.state.view]] : []));
    expect(reveals).toEqual([
      ["s01", "group-spotlight", "acid-pair"],
      ["s06", "group-spotlight", "ethinylestradiol"],
      ["s09", "group-spotlight", "aspartame"],
      ["s12", "group-spotlight", "capsaicin"],
      ["s13", "group-spotlight", "amoxicillin"],
    ]);
  });
});
