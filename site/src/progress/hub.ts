// The returning visitor's Hub: which Lesson the Continue card offers.
import { lessonStatus, type ProgressRecord } from "./record.ts";

/** A Lesson as the Hub knows it, in Course order (built into the home page). */
export interface CatalogLesson {
  id: string;
  title: string;
  url: string;
  /** e.g. "Unit 1 · Structure & Bonding". */
  unit: string;
  /** Step ids in order. */
  steps: string[];
  onRamp: boolean;
}

export interface ContinueCard {
  title: string;
  unit: string;
  url: string;
  /** "Step 3 of 12". */
  where: string;
  action: "Resume" | "Start" | "Replay";
}

/**
 * The last Lesson played while it isn't done; once it is, the next Lesson not yet done.
 * Null for a first-time visitor.
 */
export function continueCard(record: ProgressRecord, catalog: CatalogLesson[]): ContinueCard | null {
  if (!record.last || catalog.length === 0) return null;
  const at = catalog.findIndex((l) => l.id === record.last);
  const last = catalog[at];
  if (last && lessonStatus(record, last.id) !== "done") {
    const step = last.steps.indexOf(record.lessons[last.id]?.step ?? "");
    return card(last, Math.max(0, step), "Resume");
  }
  const notDone = (l: CatalogLesson) => lessonStatus(record, l.id) !== "done";
  const next = catalog.slice(at + 1).find(notDone) ?? catalog.find(notDone);
  if (next) return card(next, 0, "Start");
  return card(last ?? catalog[catalog.length - 1], 0, "Replay");
}

function card(lesson: CatalogLesson, step: number, action: ContinueCard["action"]): ContinueCard {
  const { title, unit, url } = lesson;
  return { title, unit, url, where: `Step ${step + 1} of ${lesson.steps.length}`, action };
}
