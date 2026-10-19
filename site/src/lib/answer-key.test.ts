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

it("a Scene that plays once a Step is answered travels in the answer key, not the page", () => {
  const l = lesson();
  const scene = { id: "bond-dipoles", state: {}, cited: {} };
  l.steps[2] = { ...l.steps[2], revealScene: scene } as (typeof l.steps)[number];
  const { page, key } = splitLesson(l);
  expect(JSON.stringify(page.steps[2])).not.toContain("bond-dipoles");
  expect(key.s03.revealScene).toEqual(scene);
  expect(withKey(page, key).steps[2]).toMatchObject({ revealScene: scene });
});

it("a Draw-arrows Step keeps its start and shown target on the page; results, pushes and in-between copy go in the key", () => {
  const step = {
    id: "s05",
    phase: "build" as const,
    type: "draw-arrows" as const,
    prompt: "Push.",
    start: { structure: { id: "start", style: "full" as const, atoms: [], bonds: [] }, hide: [] },
    target: { structure: { id: "shown-target", style: "full" as const, atoms: [], bonds: [] }, hide: [] },
    results: [{ id: "secret-result", style: "full" as const, atoms: [], bonds: [] }],
    answer: [{ from: "b1", to: "a2" }],
    inBetween: { over: "Secret over copy." },
    correct: "Secret correct.",
    hints: [{ text: "Secret hint." }],
    reveal: "Secret reveal.",
  };
  const whole = { ...lesson(), steps: [step] };
  const { page, key } = splitLesson(whole);
  expect(Object.keys(page.steps[0]).sort()).toEqual(["id", "phase", "prompt", "start", "target", "type"]);
  expect(JSON.stringify(page)).not.toMatch(/secret|Secret/);
  expect(withKey(page, JSON.parse(JSON.stringify(key)))).toEqual(whole);
});
