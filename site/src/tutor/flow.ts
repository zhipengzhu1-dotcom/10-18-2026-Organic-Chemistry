// The Tutor's conversation flow (spec #104, ticket #108): the scripted line that greets each new
// Step (no model call) and the suggestion chips that fit the moment. Pure, so the panel only
// renders what these return.
import type { PageStep } from "@astratron/content/step-types";
import type { Turn } from "./contract.ts";

/** A thread line: a Student or Tutor turn, or a Step divider; `live` while a reply is written. */
export type Line = (Turn | { role: "divider"; text: string }) & { live?: boolean; error?: boolean };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The thread on arriving at a Step: a divider and the intro, or only the intro until the Student has spoken. */
export function enterStep(thread: Line[], step: { number: number; phase: PageStep["phase"]; type: PageStep["type"] }): Line[] {
  const head = `Step ${step.number} · ${cap(step.phase)}.`;
  const text =
    step.type === "explain"
      ? `${head} Read this one through; ask me if anything in it doesn't add up.`
      : `${head} Have a go first. If you're stuck, ask for a nudge: I'll point you at the evidence, not the answer.`;
  const intro: Line = { role: "tutor", text };
  // A resumed Lesson lands mid-way, and an untouched intro is stale: the thread starts here.
  if (!thread.some((l) => l.role === "student")) return [intro];
  return [...thread, { role: "divider", text: `Step ${step.number}` }, intro];
}

/** The suggestion chips for the Step's type, whether its answer is revealed and whether it has a Scene. */
export function chipsFor({ type, revealed, scene }: { type: PageStep["type"]; revealed: boolean; scene: boolean }): string[] {
  const simulate = scene ? ["Simulate it with me"] : [];
  if (type === "explain") return ["Explain it another way", ...(scene ? simulate : ["What should I look at?"])];
  if (revealed) return ["Why is that the answer?", ...simulate];
  return ["Give me a nudge", "What should I look at?", ...simulate];
}
