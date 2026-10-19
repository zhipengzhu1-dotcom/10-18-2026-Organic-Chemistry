import { expect, it } from "vitest";
import { buildContent } from "@astratron/content";
import { validTree, writeTree } from "../../../content/test/tree.ts";
import { splitLesson, withKey } from "./answer-key.ts";

const lesson = () => buildContent(writeTree(validTree())).model!.subjects[0].courses[0].units[0].lessons[0];

it("the page's Lesson carries no answers, Hints, Correct lines or reveals", () => {
  const { page } = splitLesson(lesson());
  const json = JSON.stringify(page);
  for (const secret of ["Right, because.", "Hint for b.", "Generic hint.", "It is a, because.", '"answer"']) {
    expect(json).not.toContain(secret);
  }
  expect(Object.keys(page.steps[2]).sort()).toEqual(["id", "options", "phase", "prompt", "select", "type"]);
  expect(page.steps[2]).toMatchObject({ id: "s03", prompt: "Question s03", select: "one" });
});

it("a reveal Scene shows the answer, so it travels in the key, not the page", () => {
  const base = lesson();
  const revealScene = { id: "group-spotlight", state: { view: "amoxicillin", labels: "on" }, cited: {} };
  const withReveal = { ...base, steps: base.steps.map((s, i) => (i === 2 ? { ...s, revealScene } : s)) };
  const { page, key } = splitLesson(withReveal);
  expect(JSON.stringify(page)).not.toContain("group-spotlight");
  expect(key.s03.revealScene).toEqual(revealScene);
  expect(withKey(page, key)).toEqual(withReveal);
});

it("the answer key puts the Lesson back together", () => {
  const { page, key } = splitLesson(lesson());
  expect(withKey(page, JSON.parse(JSON.stringify(key)))).toEqual(lesson());
});
