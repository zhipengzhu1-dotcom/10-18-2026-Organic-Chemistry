// The Tutor's conversation flow (spec #104, ticket #108): the scripted line that greets each new
// Step (no model call), the suggestion chips that fit the moment, the history a question carries
// and how a streamed reply patches the thread. Pure, so the panel only renders what these return.
import type { PageStep } from "@astratron/content/step-types";
import { HISTORY_TURNS, type Turn } from "./contract.ts";

/** Which model answered, at what effort, in how long: shown under a finished reply. */
export interface Meta {
  model: string;
  effort: string;
  ms: number;
}

/** A thread line: a Student or Tutor turn, or a Step divider; `live` while a reply is written. */
export type Line = (Turn | { role: "divider"; text: string }) & { live?: boolean; error?: boolean; meta?: Meta };

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

/** What a new question carries as history: the turns said so far (no dividers, failures or the reply being written), the last 10. */
export function historyOf(thread: Line[]): Turn[] {
  return thread.flatMap((l) => (l.role === "divider" || l.error || l.live ? [] : [{ role: l.role, text: l.text }])).slice(-HISTORY_TURNS);
}

/** The thread with its last line (the reply being written) updated. */
export const patchLast = (thread: Line[], patch: Partial<Line>): Line[] => [...thread.slice(0, -1), { ...thread[thread.length - 1], ...patch } as Line];

/** A digit run, with sub/superscript digits, charges and a decimal point: text in the data face (testing.md). */
const DIGITS = /[0-9₀-₉⁰¹²³⁴-⁹⁺⁻]+(?:\.[0-9]+)*/g;

/** Splits text into plain parts and digit runs (`data`), so the panel draws each run in the data face. */
export function digitRuns(text: string): { text: string; data?: true }[] {
  const runs: { text: string; data?: true }[] = [];
  let from = 0;
  for (const m of text.matchAll(DIGITS)) {
    if (m.index > from) runs.push({ text: text.slice(from, m.index) });
    runs.push({ text: m[0], data: true });
    from = m.index + m[0].length;
  }
  if (from < text.length) runs.push({ text: text.slice(from) });
  return runs;
}

/** The suggestion chips for the Step's type, whether its answer is revealed and whether it has a Scene. */
export function chipsFor({ type, revealed, scene }: { type: PageStep["type"]; revealed: boolean; scene: boolean }): string[] {
  const simulate = scene ? ["Simulate it with me"] : [];
  if (type === "explain") return ["Explain it another way", ...(scene ? simulate : ["What should I look at?"])];
  if (revealed) return ["Why is that the answer?", ...simulate];
  return ["Give me a nudge", "What should I look at?", ...simulate];
}
