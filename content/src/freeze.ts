// The Step-id freeze (ADR 0003). Links to Steps end in the Step id, and videos
// that carry those links can't be edited, so once a Lesson's ids are frozen in
// its Subject's step-ids.lock.yaml:
//   - every frozen id stays in the Lesson, as a Step or under deletedSteps;
//   - a deleted Step's id is never reused;
//   - a new Step takes the next unused id, above every frozen one.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { buildContent } from "./build.ts";
import type { LessonFile } from "./schema.ts";

export const LOCK_FILE = "step-ids.lock.yaml";

const num = (id: string) => Number(id.slice(1));
const stepId = (n: number) => `s${String(n).padStart(2, "0")}`;
const byNumber = (a: string, b: string) => num(a) - num(b);

/** Rules every Lesson keeps, frozen or not: deleted ids point at live Steps and are never reused. */
export function checkDeletedSteps(lesson: LessonFile): string[] {
  const errors: string[] = [];
  const live = new Set(lesson.steps.map((s) => s.id));
  const deleted = Object.entries(lesson.deletedSteps ?? {});
  for (const [id, target] of deleted) {
    if (!live.has(target)) errors.push(`deleted Step id ${id} points at ${target}, which is not one of its Steps`);
  }
  for (const [id] of deleted) {
    if (live.has(id))
      errors.push(`Step id ${id} belongs to a deleted Step; ids are never reused (the next unused id is ${nextId(lesson, [])})`);
  }
  return errors;
}

/** Rules for a Lesson whose ids are frozen. */
export function checkFrozenIds(lesson: LessonFile, frozen: string[]): string[] {
  const errors: string[] = [];
  const kept = new Set([...lesson.steps.map((s) => s.id), ...Object.keys(lesson.deletedSteps ?? {})]);
  for (const id of frozen) {
    if (!kept.has(id))
      errors.push(
        `frozen Step id ${id} is missing; a deleted Step's id stays under deletedSteps, pointing at the Step its links now open`,
      );
  }
  const highest = Math.max(0, ...frozen.map(num));
  const locked = new Set(frozen);
  for (const step of lesson.steps) {
    if (!locked.has(step.id) && num(step.id) < highest)
      errors.push(`new Step id ${step.id} is below frozen ids; a new Step takes the next unused id (${nextId(lesson, frozen)})`);
  }
  return errors;
}

function nextId(lesson: LessonFile, frozen: string[]): string {
  const ids = [...frozen, ...lesson.steps.map((s) => s.id), ...Object.keys(lesson.deletedSteps ?? {})];
  return stepId(Math.max(0, ...ids.map(num)) + 1);
}

/**
 * `pnpm content:freeze`: adds every Lesson's current Step ids to its Subject's lock file.
 * Ids already frozen stay frozen. Refuses to run on content that doesn't build.
 */
export function freezeStepIds(root: string): void {
  const { model, errors } = buildContent(root);
  if (!model) throw new Error(`Content build failed; fix it before freezing:\n  ${errors.join("\n  ")}`);
  for (const subject of model.subjects) {
    const file = join(root, subject.slug, LOCK_FILE);
    const lock: Record<string, string[]> = existsSync(file) ? (parse(readFileSync(file, "utf8")) ?? {}) : {};
    for (const lesson of subject.courses.flatMap((c) => c.units.flatMap((u) => u.lessons))) {
      const ids = [...(lock[lesson.id] ?? []), ...lesson.steps.map((s) => s.id), ...Object.keys(lesson.deletedSteps ?? {})];
      lock[lesson.id] = [...new Set(ids)].sort(byNumber);
    }
    const lines = Object.keys(lock)
      .sort()
      .map((id) => `${id}: [ ${lock[id].join(", ")} ]`);
    writeFileSync(
      file,
      `# Frozen Step ids per Lesson (ADR 0003). Written by \`pnpm content:freeze\`; don't edit by hand.\n${lines.join("\n")}\n`,
    );
  }
}
