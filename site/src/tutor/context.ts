// The Tutor context (spec #104): the only path Step data takes to the model. It reads the
// Lesson as the page carries it (no Answer key), the Screen and the Student's draft choice.
// It never reads `screen.step` (the keyed Step): the reveal reaches it only through the
// engine's feedback, and only once the Step can continue.
import { outline, type PageStep } from "@astratron/content/step-types";
import type { Screen } from "../engine/player.ts";
import type { PageLesson } from "../lib/answer-key.ts";

/** What is on the stage now, read from the page (the Tutor panel's stage reader). */
export interface Stage {
  /** The Step shows a Scene (or video) with its own controls. */
  scene: boolean;
  /** The Scene control (a slider or − / + stepper): its label, range and value now. */
  control: { label: string; min: number; max: number; value: number } | null;
  /** Each labelled atom on the drawings, with the drawing it is in; a highlight indexes this list. */
  atoms: { label: string; in: "working drawing" | "target (look only)" | "figure" }[];
}

export interface TutorContext {
  lesson: { title: string; goal: string };
  step: { number: number; of: number; type: PageStep["type"]; phase: PageStep["phase"]; prompt: string; options?: string[] };
  student: { picked?: string[] | string; tries: number; feedback: { kind: string; text: string } | null };
  /** The Step can continue: only now may the Tutor explain the answer. */
  revealed: boolean;
  /** The Lesson's key idea, once on the Wrap. */
  keyIdea?: string;
  stage: Stage;
}

/** The parts of a Screen the Tutor may read: never its `step` or play `state`, which carry the key. */
export type TutorScreen = Pick<Screen, "index" | "total" | "tries" | "feedback" | "canContinue" | "done">;

const NO_STAGE: Stage = { scene: false, control: null, atoms: [] };

const ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Page text as plain words: tags and Markdown marks dropped, entities decoded, spaces collapsed. */
export function plain(text = ""): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[*`]/g, "")
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENTITY[e] ?? m),
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** What the Student has chosen so far, as the words on screen. */
function pickedOf(step: PageStep, draft: unknown): string[] | string | undefined {
  if (typeof draft === "string") return step.type === "numeric" ? draft : undefined;
  if (!Array.isArray(draft) || !draft.every((d) => typeof d === "string")) return undefined;
  const items: { id: string; text?: string; label?: string }[] =
    "options" in step ? step.options : "items" in step ? step.items : "targets" in step ? step.targets : [];
  const words = draft.map((id) => items.find((i) => i.id === id)).map((i) => plain(i?.text ?? i?.label));
  return words.filter(Boolean);
}

export function tutorContext({ lesson, screen, draft, stage = NO_STAGE }: { lesson: PageLesson; screen: TutorScreen; draft?: unknown; stage?: Stage }): TutorContext {
  const step = lesson.steps[screen.index];
  const { lead, choices } = outline(step);
  const { feedback } = screen;
  // A Hint (or a shown push) is on screen before the Step is done; the Correct line and the reveal only after.
  const shown = feedback && (screen.canContinue || feedback.kind === "hint" || feedback.kind === "shown");
  const picked = draft === undefined ? undefined : pickedOf(step, draft);
  return {
    lesson: { title: plain(lesson.title), goal: plain(lesson.goal) },
    step: {
      number: screen.index + 1,
      of: screen.total,
      type: step.type,
      phase: step.phase,
      prompt: plain(lead),
      ...(choices.length ? { options: choices.map(plain) } : {}),
    },
    student: { ...(picked === undefined ? {} : { picked }), tries: screen.tries, feedback: shown ? { kind: feedback.kind, text: plain(feedback.text) } : null },
    revealed: screen.canContinue,
    ...(screen.done && lesson.keyIdea ? { keyIdea: plain(lesson.keyIdea) } : {}),
    stage,
  };
}
