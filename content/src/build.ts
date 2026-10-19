// The content build: reads a content tree, validates every file against its
// schema, checks the Lesson shape rules, resolves Check Steps to Problems and
// returns the course model, or the full list of errors.
//
// Tree layout (paths relative to the content root):
//   <subject>/subject.yaml            the Subject; its folder name is its slug
//   <subject>/courses/<course>.yaml   one course manifest per Course; file name is its slug
//   <subject>/lessons/<lesson id>.yaml
//   <subject>/problems/<problem id>.yaml
//   <subject>/structures/<structure id>.yaml   2D structures, written by `pnpm structure`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import {
  courseFile,
  lessonFile,
  problemFile,
  structureFile,
  subjectFile,
  type LessonFile,
  type ProblemFile,
  type StructureFile,
} from "./schema.ts";
import type { BuildResult, Course, Lesson, Step, Structure, Subject } from "./model.ts";
import { checkInteraction, checkLessonShape } from "./shape.ts";
import { checkStructure, resolveOptions, resolveTap } from "./structures.ts";

type StepFile = LessonFile["steps"][number];
/** A graded Step or Problem as written, before its structures are resolved. */
type Interactive = Extract<StepFile | ProblemFile, { type: "multiple-choice" | "tap-to-identify" }>;
/** The resolved interaction fields of a graded Step or Problem. */
type Resolved = DistributiveOmit<Extract<Step, { type: "multiple-choice" | "tap-to-identify" }>, "id" | "phase" | "problemId">;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export function buildContent(root: string): BuildResult {
  const errors: string[] = [];

  function load<T>(rel: string, schema: z.ZodType<T>): T | undefined {
    let raw: unknown;
    try {
      raw = parse(readFileSync(join(root, rel), "utf8"));
    } catch (e) {
      errors.push(`${rel}: not valid YAML: ${(e as Error).message.split("\n")[0]}`);
      return undefined;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const where = issue.path.length ? issue.path.join(".") : "(file)";
        errors.push(`${rel}: ${where}: ${issue.message}`);
      }
      return undefined;
    }
    return parsed.data;
  }

  /** Loads every file in a folder. A file that fails maps to `undefined`, so references to it don't report twice. */
  function loadDir<T extends { id: string }>(dir: string, schema: z.ZodType<T>): Map<string, T | undefined> {
    const out = new Map<string, T | undefined>();
    for (const rel of yamlFiles(root, dir)) {
      const name = basename(rel, ".yaml");
      let file = load(rel, schema);
      if (file && file.id !== name) {
        errors.push(`${rel}: id "${file.id}" must match the file name`);
        file = undefined;
      }
      out.set(name, file);
    }
    return out;
  }

  const subjects: Subject[] = [];
  for (const slug of subdirs(root)) {
    if (!existsSync(join(root, slug, "subject.yaml"))) continue;
    const subject = load(`${slug}/subject.yaml`, subjectFile);
    const lessons = loadDir<LessonFile>(`${slug}/lessons`, lessonFile);
    const problems = loadDir<ProblemFile>(`${slug}/problems`, problemFile);
    const structures = new Map<string, Structure | undefined>();
    for (const [name, file] of loadDir<StructureFile>(`${slug}/structures`, structureFile)) {
      const problems = file ? checkStructure(file) : [];
      for (const message of problems) errors.push(`${slug}/structures/${name}.yaml: ${message}`);
      structures.set(name, file && !problems.length ? file : undefined);
    }

    /** Resolves each graded Step and Problem once, so its errors are reported once. */
    const resolved = new Map<Interactive, Resolved | undefined>();
    function resolveInteractive(item: Interactive, where: string): void {
      const found: string[] = [];
      let out: Resolved | undefined;
      const { type, prompt, answer, correct, hints, reveal } = item;
      if (type === "multiple-choice") {
        const options = resolveOptions(item.options, structures, found);
        const prediction = "prediction" in item && item.prediction ? { prediction: true } : {};
        out = { type, prompt, options, answer, correct, hints, reveal, ...prediction };
      } else {
        const tap = resolveTap(item, structures, found);
        if (tap) out = { type, prompt, ...tap, answer, correct, hints, reveal, ...(item.tapOnly && { tapOnly: item.tapOnly }) };
      }
      for (const message of found) errors.push(`${where}${message}`);
      resolved.set(item, found.length ? undefined : out);
    }

    for (const lesson of lessons.values()) {
      if (!lesson) continue;
      const rel = `${slug}/lessons/${lesson.id}.yaml`;
      for (const message of checkLessonShape(lesson)) errors.push(`${rel}: ${message}`);
      for (const step of lesson.steps)
        if (step.type === "multiple-choice" || step.type === "tap-to-identify") resolveInteractive(step, `${rel}: step ${step.id}: `);
    }
    for (const problem of problems.values()) {
      if (!problem) continue;
      const rel = `${slug}/problems/${problem.id}.yaml: `;
      if (problem.type === "multiple-choice") for (const message of checkInteraction(problem)) errors.push(rel + message);
      resolveInteractive(problem, rel);
    }

    const courses: Course[] = [];
    for (const rel of yamlFiles(root, `${slug}/courses`)) {
      const course = load(rel, courseFile);
      if (!course) continue;
      const courseSlug = basename(rel, ".yaml");
      courses.push({
        slug: courseSlug,
        title: course.title,
        units: course.units.map((unit) => ({
          ...unit,
          lessons: unit.lessons.flatMap((lessonId) => {
            const lesson = lessons.get(lessonId);
            if (!lesson) {
              if (!lessons.has(lessonId)) errors.push(`${rel}: unit ${unit.id} lists Lesson "${lessonId}", which has no file`);
              return [];
            }
            const url = `/${slug}/${courseSlug}/${unit.slug}/${lesson.slug}`;
            return [resolveLesson(lesson, url, problems, resolved, `${slug}/lessons/${lesson.id}.yaml`, errors)];
          }),
        })),
      });
    }
    if (subject) subjects.push({ slug, title: subject.title, courses });
  }

  return errors.length ? { errors } : { model: { subjects }, errors };
}

function resolveLesson(
  lesson: LessonFile,
  url: string,
  problems: Map<string, ProblemFile | undefined>,
  resolved: Map<Interactive, Resolved | undefined>,
  rel: string,
  errors: string[],
): Lesson {
  const steps: Step[] = lesson.steps.flatMap((step): Step[] => {
    if (step.type === "explain") return [step];
    if (step.type !== "check") {
      const fields = resolved.get(step);
      return fields ? [{ id: step.id, phase: step.phase, ...fields } as Step] : [];
    }
    const problem = problems.get(step.problem);
    if (!problem) {
      if (!problems.has(step.problem)) errors.push(`${rel}: step ${step.id}: Check Problem "${step.problem}" not found`);
      return [];
    }
    if (problem.status !== "approved") {
      errors.push(`${rel}: step ${step.id}: Check Problem "${step.problem}" is ${problem.status}, not approved`);
      return [];
    }
    const fields = resolved.get(problem);
    return fields ? [{ id: step.id, phase: "check", problemId: problem.id, ...fields } as Step] : [];
  });
  return { ...lesson, url, steps };
}

function subdirs(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => !name.startsWith(".") && statSync(join(dir, name)).isDirectory())
    .sort();
}

function yamlFiles(root: string, dir: string): string[] {
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir))
    .filter((name) => name.endsWith(".yaml"))
    .sort()
    .map((name) => `${dir}/${name}`);
}
