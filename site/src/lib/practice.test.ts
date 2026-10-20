import { expect, it } from "vitest";
import { buildContent } from "@astratron/content";
import { lesson, problem, validTree, writeTree } from "../../../content/test/tree.ts";
import { lessonNext, splitPractice } from "./practice.ts";

it("a Lesson ends on the next Lesson; the Unit's capstone ends on the Unit's Practice Set (Lesson 8)", () => {
  const tree = validTree();
  tree["chem/lessons/l1.yaml"] = lesson();
  tree["chem/lessons/l2.yaml"] = lesson({ id: "l2", slug: "second-lesson", title: "Second", capstone: true });
  tree["chem/lessons/l3.yaml"] = lesson({ id: "l3", slug: "third-lesson", title: "Third" });
  (tree["chem/courses/chem-1.yaml"] as { units: { lessons?: string[] }[] }).units[0].lessons = ["l1", "l2", "l3"];
  const { model, errors } = buildContent(writeTree(tree));
  expect(errors).toEqual([]);
  const u = model!.subjects[0].courses[0].units[0];
  expect(lessonNext(u, 0)).toEqual({ href: u.lessons[1].url, label: "Next Lesson" });
  expect(lessonNext(u, 1)).toEqual({ href: `${u.url}/practice`, label: `Unit ${u.number} Practice Set` });
  expect(lessonNext(u, 2)).toBeUndefined();
});

function unit() {
  const tree = validTree();
  tree["chem/problems/x1.yaml"] = problem("x1", { difficulty: 2 });
  tree["chem/problems/x2.yaml"] = problem("x2", { status: "draft" });
  const { model, errors } = buildContent(writeTree(tree));
  expect(errors).toEqual([]);
  return model!.subjects[0].courses[0].units[0];
}

it("the Practice Set page carries only drawable Problems, and no draft ever leaves the build", () => {
  const { problems, key } = splitPractice(unit());
  expect(problems.map((p) => p.entry)).toEqual([
    { id: "p1", lesson: "l1", difficulty: 1, status: "approved", check: true, onRamp: false },
    { id: "p2", lesson: "l1", difficulty: 1, status: "approved", check: true, onRamp: false },
    { id: "x1", lesson: "l1", difficulty: 2, status: "approved", check: false, onRamp: false },
  ]);
  expect(JSON.stringify({ problems, key })).not.toContain("x2");
});

it("the page carries no answers, Hints, Correct lines or reveals; the key has them by Problem id", () => {
  const { problems, key } = splitPractice(unit());
  const json = JSON.stringify(problems);
  for (const secret of ["Right, because.", "Hint for b.", "Generic hint.", "It is a, because.", '"answer"']) {
    expect(json).not.toContain(secret);
  }
  expect(problems[2].step).toMatchObject({ id: "x1", problemId: "x1", prompt: "Question x1", select: "one" });
  expect(key.x1).toMatchObject({ answer: ["a"], correct: "Right, because.", reveal: "It is a, because." });
});
