// The content build: reads a content tree, validates every file against its
// schema, checks the Lesson shape rules, resolves Check Steps to Problems and
// returns the course model, or the full list of errors.
//
// Tree layout (paths relative to the content root):
//   <subject>/subject.yaml            the Subject; its folder name is its slug
//   <subject>/courses/<course>.yaml   one course manifest per Course; file name is its slug
//   <subject>/lessons/<lesson id>.yaml
//   <subject>/problems/<problem id>.yaml
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import { courseFile, lessonFile, problemFile, subjectFile, type LessonFile, type ProblemFile } from "./schema.ts";
import type { BuildResult, Course, Lesson, Step, Subject } from "./model.ts";
import { checkInteraction, checkLessonShape } from "./shape.ts";

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

    for (const lesson of lessons.values()) {
      if (lesson)
        for (const message of checkLessonShape(lesson)) errors.push(`${slug}/lessons/${lesson.id}.yaml: ${message}`);
    }
    for (const problem of problems.values()) {
      if (problem)
        for (const message of checkInteraction(problem)) errors.push(`${slug}/problems/${problem.id}.yaml: ${message}`);
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
            return [resolveLesson(lesson, url, problems, `${slug}/lessons/${lesson.id}.yaml`, errors)];
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
  rel: string,
  errors: string[],
): Lesson {
  const steps: Step[] = lesson.steps.flatMap((step): Step[] => {
    if (step.type !== "check") return [step];
    const problem = problems.get(step.problem);
    if (!problem) {
      if (!problems.has(step.problem)) errors.push(`${rel}: step ${step.id}: Check Problem "${step.problem}" not found`);
      return [];
    }
    if (problem.status !== "approved") {
      errors.push(`${rel}: step ${step.id}: Check Problem "${step.problem}" is ${problem.status}, not approved`);
      return [];
    }
    const { id: problemId, unit: _u, lesson: _l, difficulty: _d, status: _s, source: _src, credit: _c, ...interaction } = problem;
    return [{ id: step.id, phase: "check", problemId, ...interaction }];
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
