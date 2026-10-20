// The Tutor's conversation flow (ticket #108): what the thread shows on each new Step, and the
// suggestion chips for the moment.
import { describe, expect, it } from "vitest";
import { chipsFor, enterStep, type Line } from "./flow.ts";

const intro = (thread: Line[]) => thread.filter((l) => l.role === "tutor").at(-1)!.text;

describe("enterStep", () => {
  it("opens the thread on the current Step with a scripted intro (a resumed Lesson starts here, not at Step 1)", () => {
    const thread = enterStep([], { number: 4, phase: "build", type: "multiple-choice" });
    expect(thread).toEqual([{ role: "tutor", text: expect.stringMatching(/^Step 4 · Build\. Have a go first/) }]);
  });

  it("replaces an untouched intro instead of stacking stale ones", () => {
    const first = enterStep([], { number: 4, phase: "build", type: "multiple-choice" });
    const thread = enterStep(first, { number: 5, phase: "check", type: "multiple-choice" });
    expect(thread).toHaveLength(1);
    expect(intro(thread)).toMatch(/^Step 5 · Check\./);
  });

  it("adds a divider and the intro once the Student has spoken, keeping the conversation", () => {
    const talked: Line[] = [...enterStep([], { number: 1, phase: "hook", type: "explain" }), { role: "student", text: "Why?" }, { role: "tutor", text: "Look at the charge." }];
    const thread = enterStep(talked, { number: 2, phase: "build", type: "multiple-choice" });
    expect(thread.slice(0, 3)).toEqual(talked);
    expect(thread.slice(3)).toEqual([
      { role: "divider", text: "Step 2" },
      { role: "tutor", text: expect.stringMatching(/^Step 2 · Build\./) },
    ]);
  });

  it("invites reading on an Explain Step", () => {
    expect(intro(enterStep([], { number: 1, phase: "hook", type: "explain" }))).toMatch(/Read this one through/);
  });
});

describe("chipsFor", () => {
  it("offers a nudge and where to look before an answer", () => {
    expect(chipsFor({ type: "multiple-choice", revealed: false, scene: false })).toEqual(["Give me a nudge", "What should I look at?"]);
  });

  it("adds a simulation when the Step has a Scene", () => {
    expect(chipsFor({ type: "manipulate", revealed: false, scene: true })).toEqual(["Give me a nudge", "What should I look at?", "Simulate it with me"]);
  });

  it("asks why once the answer is revealed", () => {
    expect(chipsFor({ type: "multiple-choice", revealed: true, scene: true })).toEqual(["Why is that the answer?", "Simulate it with me"]);
    expect(chipsFor({ type: "multiple-choice", revealed: true, scene: false })).toEqual(["Why is that the answer?"]);
  });

  it("asks for another angle on an Explain Step, which has no answer", () => {
    expect(chipsFor({ type: "explain", revealed: false, scene: false })).toEqual(["Explain it another way", "What should I look at?"]);
  });
});
