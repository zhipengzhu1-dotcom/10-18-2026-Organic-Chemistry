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

it("the answer key puts the Lesson back together", () => {
  const { page, key } = splitLesson(lesson());
  expect(withKey(page, JSON.parse(JSON.stringify(key)))).toEqual(lesson());
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

it("a Tap Step's reveal replay (it draws the answer) goes in the key", () => {
  const step = {
    id: "s05",
    phase: "check" as const,
    type: "tap-to-identify" as const,
    prompt: "Tap.",
    structure: { structure: { id: "shown", style: "full" as const, atoms: [], bonds: [] }, hide: [] },
    targets: [],
    answer: ["a1"],
    reveal: "Secret reveal.",
    replay: { start: { id: "secret-start", style: "full" as const, atoms: [], bonds: [] }, pushes: [{ from: "a3", to: "b2" }] },
  };
  const whole = { ...lesson(), steps: [step] };
  const { page, key } = splitLesson(whole);
  expect(JSON.stringify(page)).not.toMatch(/secret|Secret|pushes/);
  expect(withKey(page, JSON.parse(JSON.stringify(key)))).toEqual(whole);
});

it("a Rank Step's reveal tags (they give the order away) go in the key", () => {
  const step = {
    id: "s09",
    phase: "build" as const,
    type: "rank" as const,
    prompt: "Order.",
    items: [
      { id: "b", text: "B" },
      { id: "a", text: "A" },
    ],
    answer: ["a", "b"],
    reveal: "a, b",
    revealTags: { a: "Secret tag", b: "Secret tag too" },
  };
  const whole = { ...lesson(), steps: [step] };
  const { page, key } = splitLesson(whole);
  expect(JSON.stringify(page)).not.toMatch(/Secret/);
  expect(withKey(page, JSON.parse(JSON.stringify(key)))).toEqual(whole);
});
