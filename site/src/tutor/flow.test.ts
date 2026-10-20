// The Tutor's conversation flow (ticket #108): what the thread shows on each new Step, and the
// suggestion chips for the moment.
import { describe, expect, it } from "vitest";
import { chipsFor, digitRuns, enterStep, historyOf, patchLast, type Line } from "./flow.ts";

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

describe("historyOf", () => {
  it("sends only what was said: no dividers, error lines or the reply still being written, and no meta", () => {
    const thread: Line[] = [
      { role: "tutor", text: "Step 1 · Hook." },
      { role: "student", text: "Why?" },
      { role: "tutor", text: "Look at the charge.", meta: { model: "Sonnet 5.5", effort: "low", ms: 900 } },
      { role: "divider", text: "Step 2" },
      { role: "student", text: "And now?" },
      { role: "tutor", text: "The Tutor is busy.", error: true },
      { role: "tutor", text: "Wri", live: true },
    ];
    expect(historyOf(thread)).toEqual([
      { role: "tutor", text: "Step 1 · Hook." },
      { role: "student", text: "Why?" },
      { role: "tutor", text: "Look at the charge." },
      { role: "student", text: "And now?" },
    ]);
  });

  it("keeps the last 10 turns, the most the route passes on", () => {
    const thread: Line[] = Array.from({ length: 13 }, (_, i) => ({ role: i % 2 ? "tutor" : "student", text: `turn ${i}` }));
    expect(historyOf(thread).map((t) => t.text)).toEqual(["turn 3", "turn 4", "turn 5", "turn 6", "turn 7", "turn 8", "turn 9", "turn 10", "turn 11", "turn 12"]);
  });
});

describe("patchLast", () => {
  it("updates the last line only, leaving the thread it was given as it was", () => {
    const thread: Line[] = [
      { role: "student", text: "Why?" },
      { role: "tutor", text: "", live: true },
    ];
    expect(patchLast(thread, { text: "Look", live: false })).toEqual([
      { role: "student", text: "Why?" },
      { role: "tutor", text: "Look", live: false },
    ]);
    expect(thread[1]).toEqual({ role: "tutor", text: "", live: true });
  });
});

describe("digitRuns", () => {
  it("marks each run of digits, with its decimal point, for the data face", () => {
    expect(digitRuns("Step 12 · Sonnet 5.5")).toEqual([{ text: "Step " }, { text: "12", data: true }, { text: " · Sonnet " }, { text: "5.5", data: true }]);
  });

  it("marks sub- and superscript digits and charges too", () => {
    expect(digitRuns("CH₃⁺ ends")).toEqual([{ text: "CH" }, { text: "₃⁺", data: true }, { text: " ends" }]);
  });

  it("leaves text with no digits whole", () => {
    expect(digitRuns("Look at the charge.")).toEqual([{ text: "Look at the charge." }]);
    expect(digitRuns("")).toEqual([]);
  });
});
