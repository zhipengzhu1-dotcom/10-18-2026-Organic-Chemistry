// The Problem Bank in the course model: every Problem tagged with a Unit, with
// what the Practice Set draw needs (Lesson, difficulty, status, Check or not, On-ramp or not).
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { lesson, problem, validTree, writeTree, type Tree } from "./tree.ts";

/** validTree plus an On-ramp Lesson (l0) with its own Check Problems, and two Practice Problems. */
function bankTree(): Tree {
  const tree = validTree();
  const steps = lesson().steps.map((s) =>
    "problem" in s ? { ...s, problem: s.problem === "p1" ? "r1" : "r2" } : s,
  );
  tree["chem/lessons/l0.yaml"] = lesson({ id: "l0", slug: "on-ramp", onRamp: true, steps });
  tree["chem/problems/r1.yaml"] = problem("r1", { lesson: "l0" });
  tree["chem/problems/r2.yaml"] = problem("r2", { lesson: "l0" });
  tree["chem/problems/x1.yaml"] = problem("x1", { difficulty: 2 });
  tree["chem/problems/x2.yaml"] = problem("x2", { difficulty: 3, status: "draft" });
  (tree["chem/courses/chem-1.yaml"] as { units: { lessons?: string[] }[] }).units[0].lessons = ["l0", "l1"];
  return tree;
}

describe("the Problem Bank", () => {
  it("lists every Problem tagged with the Unit, with its Lesson, difficulty, status, and whether it is a Check Problem or an On-ramp's", () => {
    const { model, errors } = buildContent(writeTree(bankTree()));
    expect(errors).toEqual([]);
    const unit = model!.subjects[0].courses[0].units[0];
    expect(
      unit.bank.map(({ id, lesson, difficulty, status, check, onRamp }) => ({ id, lesson, difficulty, status, check, onRamp })),
    ).toEqual([
      { id: "p1", lesson: "l1", difficulty: 1, status: "approved", check: true, onRamp: false },
      { id: "p2", lesson: "l1", difficulty: 1, status: "approved", check: true, onRamp: false },
      { id: "r1", lesson: "l0", difficulty: 1, status: "approved", check: true, onRamp: true },
      { id: "r2", lesson: "l0", difficulty: 1, status: "approved", check: true, onRamp: true },
      { id: "x1", lesson: "l1", difficulty: 2, status: "approved", check: false, onRamp: false },
      { id: "x2", lesson: "l1", difficulty: 3, status: "draft", check: false, onRamp: false },
    ]);
    expect(model!.subjects[0].courses[0].units[1].bank).toEqual([]);
  });

  it("carries each Problem as a playable Step: its id, its interaction and its Source line", () => {
    const { model } = buildContent(writeTree(bankTree()));
    const x1 = model!.subjects[0].courses[0].units[0].bank.find((p) => p.id === "x1")!;
    expect(x1.source).toBe("Original");
    expect(x1.step).toMatchObject({
      id: "x1",
      phase: "check",
      problemId: "x1",
      type: "multiple-choice",
      prompt: "Question x1",
      answer: ["a"],
      reveal: "It is a, because.",
    });
  });

  it("a Problem tagged with an unknown Unit, or a Lesson outside its Unit, fails the build", () => {
    const tree = bankTree();
    tree["chem/problems/x1.yaml"] = problem("x1", { unit: "u9" });
    tree["chem/problems/x2.yaml"] = problem("x2", { lesson: "l7" });
    expect(buildContent(writeTree(tree)).errors).toEqual([
      'chem/problems/x1.yaml: Unit "u9" is not in any course manifest',
      'chem/problems/x2.yaml: Lesson "l7" is not a Lesson of Unit u1',
    ]);
  });

  it("a Lesson can't take the slug practice: the Practice Set's page has it", () => {
    const tree = bankTree();
    tree["chem/lessons/l1.yaml"] = lesson({ slug: "practice" });
    expect(buildContent(writeTree(tree)).errors).toEqual([
      'chem/lessons/l1.yaml: slug "practice" is reserved for the Practice Set page',
    ]);
  });
});
