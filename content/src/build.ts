// The content build: reads a content tree, validates every file against its
// schema, checks the Lesson shape rules, resolves Check Steps to Problems and
// returns the course model, or the full list of errors.
//
// Tree layout (paths relative to the content root):
//   <subject>/subject.yaml            the Subject; its folder name is its slug
//   <subject>/courses/<course>.yaml   one course manifest per Course; file name is its slug
//   <subject>/lessons/<lesson id>.yaml
//   <subject>/problems/<problem id>.yaml
//   <subject>/data/<data id>.yaml|.json  cited data (ADR 0002); see data-load.ts
//   <subject>/structures/<structure id>.yaml   2D structures, written by `pnpm structure`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import {
  courseFile,
  lessonFile,
  problemFile,
  stepIdLock,
  structureFile,
  subjectFile,
  type LessonFile,
  type ProblemFile,
  type StructureFile,
} from "./schema.ts";
import { checkDeletedSteps, checkFrozenIds, LOCK_FILE } from "./freeze.ts";
import type { Aside, BuildResult, Course, Figure, GradedStep, Lesson, Option, Step, Structure, StructureView, Subject, TapTarget } from "./model.ts";

/** The Practice Set page sits at `<unit url>/practice`, so no Lesson may take that slug. */
export const PRACTICE_SLUG = "practice";
import { checkInteraction, checkLessonShape } from "./shape.ts";
import { citeIn, type Cited, type CitedData } from "./data.ts";
import { dataFile, resolveDataFile } from "./data-load.ts";
import type { SceneCatalog, SceneUse } from "./model.ts";
import { checkStepScene, resolveSceneUse, type SceneUseFile } from "./scenes.ts";
import { checkStructure, resolveFigure, resolveOptions, resolveTap } from "./structures.ts";

/** What a graded Step or Problem gains once its structures are resolved, keyed by "<lesson id>#<step id>" or "problem:<id>". */
type StructureFields = { options?: Option[]; structure?: StructureView; targets?: TapTarget[]; figures?: Figure[]; aside?: Aside };
type Structured = Map<string, StructureFields | undefined>;

export interface BuildOptions {
  /**
   * The registered Scenes (from the scenes module's manifests). With it, every
   * Scene a Step uses is checked (id, settable states, cited data, a
   * Manipulate Step's control and answer) and resolved; without it, Scene ids
   * go unchecked and states get no defaults. The site build and
   * `pnpm content:build` always pass it.
   */
  scenes?: SceneCatalog;
}

export function buildContent(root: string, options: BuildOptions = {}): BuildResult {
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

  /** Loads and checks a Subject's cited data files. */
  function loadData(dir: string): CitedData {
    const data: CitedData = {};
    for (const rel of yamlFiles(root, dir, [".yaml", ".json"])) {
      const file = load(rel, dataFile);
      if (!file) continue;
      if (file.id !== basename(rel).replace(/\.(yaml|json)$/, "")) {
        errors.push(`${rel}: id "${file.id}" must match the file name`);
        continue;
      }
      const { set, errors: broken } = resolveDataFile(file);
      for (const message of broken) errors.push(`${rel}: ${message}`);
      data[file.id] = set;
    }
    return data;
  }

  const subjects: Subject[] = [];
  for (const slug of subdirs(root)) {
    if (!existsSync(join(root, slug, "subject.yaml"))) continue;
    const subject = load(`${slug}/subject.yaml`, subjectFile);
    const data = loadData(`${slug}/data`);
    const lessons = loadDir<LessonFile>(`${slug}/lessons`, lessonFile);
    const problems = loadDir<ProblemFile>(`${slug}/problems`, problemFile);

    const lockRel = `${slug}/${LOCK_FILE}`;
    const lock = existsSync(join(root, lockRel)) ? load(lockRel, stepIdLock) : {};

    for (const lesson of lessons.values()) {
      if (!lesson) continue;
      const frozen = lock?.[lesson.id];
      const messages = [
        ...checkLessonShape(lesson),
        ...(frozen ? checkFrozenIds(lesson, frozen) : []),
        ...checkDeletedSteps(lesson),
        ...(lesson.slug === PRACTICE_SLUG ? [`slug "${PRACTICE_SLUG}" is reserved for the Practice Set page`] : []),
        ...(options.scenes
          ? lesson.steps.flatMap((step) =>
              checkStepScene(step, options.scenes!, data).map((message) => `step ${step.id}: ${message}`),
            )
          : []),
      ];
      for (const message of messages) errors.push(`${slug}/lessons/${lesson.id}.yaml: ${message}`);
    }
    for (const problem of problems.values()) {
      if (!problem) continue;
      const messages = [...checkInteraction(problem), ...(options.scenes ? checkStepScene(problem, options.scenes, data) : [])];
      for (const message of messages) errors.push(`${slug}/problems/${problem.id}.yaml: ${message}`);
    }
    const problemCitations = citeNumbers(slug, data, lessons, problems, errors);

    // Structure cards and Tap targets, resolved once per Step and Problem so each error is reported once.
    const structures = new Map<string, Structure | undefined>();
    for (const [name, file] of loadDir<StructureFile>(`${slug}/structures`, structureFile)) {
      const broken = file ? checkStructure(file) : [];
      for (const message of broken) errors.push(`${slug}/structures/${name}.yaml: ${message}`);
      structures.set(name, file && !broken.length ? file : undefined);
    }
    const structured: Structured = new Map();
    const resolveStructures = (key: string, item: LessonFile["steps"][number] | ProblemFile, where: string) => {
      if (item.type === "check") return;
      const found: string[] = [];
      const fields: StructureFields = {};
      if (item.type === "multiple-choice") fields.options = resolveOptions(item.options, structures, found);
      else if (item.type === "tap-to-identify") Object.assign(fields, resolveTap(item, structures, found));
      if (item.figures) fields.figures = item.figures.flatMap((f) => resolveFigure(f, structures, found) ?? []);
      if (item.aside) {
        const { table, ...aside } = item.aside;
        fields.aside = aside as Aside;
        if (table)
          fields.aside.table = {
            columns: table.columns,
            ...(table.caption ? { caption: table.caption } : {}),
            rows: table.rows.map((row) => ({
              head: row.head,
              cells: row.cells.map((cell) => (cell ? (resolveFigure(cell, structures, found) ?? null) : null)),
            })),
          };
      }
      for (const message of found) errors.push(`${where}${message}`);
      structured.set(key, found.length ? undefined : fields);
    };
    for (const lesson of lessons.values())
      for (const step of lesson?.steps ?? [])
        resolveStructures(`${lesson!.id}#${step.id}`, step, `${slug}/lessons/${lesson!.id}.yaml: step ${step.id}: `);
    for (const problem of problems.values())
      if (problem) resolveStructures(`problem:${problem.id}`, problem, `${slug}/problems/${problem.id}.yaml: `);

    const courses: Course[] = [];
    /** Unit id → the Lesson ids its manifest lists; undefined when a manifest is broken (tags then can't be checked). */
    let listed: Map<string, string[]> | undefined = new Map();
    let unitNumber = 0;
    for (const rel of yamlFiles(root, `${slug}/courses`)) {
      const course = load(rel, courseFile);
      if (!course) {
        listed = undefined;
        continue;
      }
      for (const unit of course.units) listed?.set(unit.id, unit.lessons);
      const courseSlug = basename(rel, ".yaml");
      courses.push({
        slug: courseSlug,
        title: course.title,
        units: course.units.map((unit) => {
          const url = `/${slug}/${courseSlug}/${unit.slug}`;
          let coreNumber = 0;
          return {
            ...unit,
            number: ++unitNumber,
            url,
            lessons: unit.lessons.flatMap((lessonId) => {
              const lesson = lessons.get(lessonId);
              if (!lesson) {
                if (!lessons.has(lessonId)) errors.push(`${rel}: unit ${unit.id} lists Lesson "${lessonId}", which has no file`);
                return [];
              }
              const number = lesson.onRamp ? 0 : ++coreNumber;
              const lessonRel = `${slug}/lessons/${lesson.id}.yaml`;
              const scene = (use: SceneUseFile) => resolveSceneUse(use, options.scenes, data);
              const resolved = resolveLesson(lesson, `${url}/${lesson.slug}`, number, problems, structured, scene, lessonRel, errors);
              for (const step of resolved.steps) {
                const cited = "problemId" in step && step.problemId && problemCitations.get(step.problemId);
                if (cited) step.citations = mergeCitations(cited, step.citations ?? []);
              }
              return [resolved];
            }),
            bank: [],
          };
        }),
      });
    }
    const sceneFor = (use: SceneUseFile) => resolveSceneUse(use, options.scenes, data);
    fillBanks(slug, courses, listed, lessons, problems, structured, problemCitations, sceneFor, errors);
    if (subject) subjects.push({ slug, title: subject.title, url: `/${slug}`, courses, data });
  }

  return errors.length ? { errors } : { model: { subjects }, errors };
}

function resolveLesson(
  lesson: LessonFile,
  url: string,
  number: number,
  problems: Map<string, ProblemFile | undefined>,
  structured: Structured,
  scene: (use: SceneUseFile) => SceneUse,
  rel: string,
  errors: string[],
): Lesson {
  const steps: Step[] = lesson.steps.flatMap((step): Step[] => {
    if (step.type !== "check") return withStructures(step, `${lesson.id}#${step.id}`, structured).map((st) => withScene(st, scene));
    const problem = problems.get(step.problem);
    if (!problem) {
      if (!problems.has(step.problem)) errors.push(`${rel}: step ${step.id}: Check Problem "${step.problem}" not found`);
      return [];
    }
    if (problem.status !== "approved") {
      errors.push(`${rel}: step ${step.id}: Check Problem "${step.problem}" is ${problem.status}, not approved`);
      return [];
    }
    return problemStep(problem, step.id, structured, scene);
  });
  const phases = { hook: 0, build: 0, check: 0, wrap: 0 };
  for (const step of lesson.steps) phases[step.phase]++;
  const { signature, ...rest } = lesson;
  return { ...rest, url, number, signature: signatureType(lesson), phases, steps };
}

/**
 * Swaps structure ids for the resolved structures (cards, Tap targets, figures, aside tables);
 * a Step whose structures failed is dropped (its errors are reported).
 */
function withStructures(step: Record<string, unknown> & { type: string }, key: string, structured: Structured): Step[] {
  const fields = structured.get(key);
  if (!fields) return [];
  const { tappable: _t, hide: _h, outline: _o, ...rest } = step;
  return [{ ...rest, ...fields } as unknown as Step];
}

/** Resolves every Scene the Step uses (its own, its reveal Scene, its aside's); their cited numbers join its Source note. */
function withScene(step: Step, scene: (use: SceneUseFile) => SceneUse): Step {
  const out = { ...step } as Step & { revealScene?: SceneUse };
  const uses: SceneUse[] = [];
  const resolve = (use: SceneUseFile) => {
    const resolved = scene(use);
    uses.push(resolved);
    return resolved;
  };
  if (step.scene) out.scene = resolve(step.scene);
  if ("revealScene" in step && step.revealScene) out.revealScene = resolve(step.revealScene);
  if (step.aside?.scene) out.aside = { ...step.aside, scene: resolve(step.aside.scene) };
  if (!uses.length) return step;
  out.citations = mergeCitations(step.citations ?? [], uses.flatMap((u) => Object.values(u.cited)));
  return out;
}

/** `first`, then each of `more` not already there (by ref). */
function mergeCitations(first: Cited[], more: Cited[]): Cited[] {
  const out = [...first];
  for (const c of more) if (!out.some((o) => o.ref === c.ref)) out.push(c);
  return out;
}

/** A Problem as a playable Step (a Check Step, or a Practice Set Problem): its interaction without the Bank tags. */
function problemStep(problem: ProblemFile, stepId: string, structured: Structured, scene: (use: SceneUseFile) => SceneUse): Step[] {
  const { id: problemId, unit: _u, lesson: _l, difficulty: _d, status: _s, source: _src, credit: _c, ...interaction } = problem;
  return withStructures({ id: stepId, phase: "check", problemId, ...interaction }, `problem:${problemId}`, structured).map((st) =>
    withScene(st, scene),
  );
}

/**
 * Files each Problem in its Unit's Bank, checking its Unit and Lesson tags. A Problem whose
 * structures failed to resolve is left out (its errors are already reported).
 */
function fillBanks(
  slug: string,
  courses: Course[],
  listed: Map<string, string[]> | undefined,
  lessons: Map<string, LessonFile | undefined>,
  problems: Map<string, ProblemFile | undefined>,
  structured: Structured,
  citations: Map<string, Cited[]>,
  scene: (use: SceneUseFile) => SceneUse,
  errors: string[],
): void {
  const units = new Map(courses.flatMap((c) => c.units.map((u) => [u.id, u] as const)));
  const checks = new Set<string>();
  for (const lesson of lessons.values())
    for (const step of lesson?.steps ?? []) if (step.type === "check") checks.add(step.problem);
  for (const problem of problems.values()) {
    if (!problem) continue;
    const rel = `${slug}/problems/${problem.id}.yaml`;
    const unit = units.get(problem.unit);
    if (!unit || !listed) {
      if (listed) errors.push(`${rel}: Unit "${problem.unit}" is not in any course manifest`);
      continue;
    }
    if (!listed.get(unit.id)?.includes(problem.lesson)) {
      errors.push(`${rel}: Lesson "${problem.lesson}" is not a Lesson of Unit ${unit.id}`);
      continue;
    }
    // A listed Lesson whose file is broken or missing is already reported.
    const lesson = lessons.get(problem.lesson);
    if (!lesson) continue;
    const [step] = problemStep(problem, problem.id, structured, scene) as GradedStep[];
    if (!step) continue;
    const cited = citations.get(problem.id);
    if (cited) step.citations = mergeCitations(cited, step.citations ?? []);
    const { id, difficulty, status, source, credit } = problem;
    unit.bank.push({
      id,
      lesson: problem.lesson,
      difficulty,
      status,
      source,
      ...(credit ? { credit } : {}),
      check: checks.has(id),
      onRamp: lesson.onRamp,
      step,
    });
  }
}

/** The named signature Step's type, else the first graded Build Step's, else the first Step's. */
function signatureType(lesson: LessonFile): Step["type"] {
  const named = lesson.steps.find((s) => s.id === lesson.signature);
  const graded = lesson.steps.find((s) => s.phase === "build" && s.type !== "explain");
  const type = (named ?? graded ?? lesson.steps[0]).type;
  return type === "check" ? "multiple-choice" : type;
}

/**
 * Swaps every `{{file/key}}` in Lesson Steps and Problems for its cited
 * display value (ADR 0002), in place in the loaded maps. A Step keeps what it
 * cited as `citations`; Problems' citations are returned by id for their
 * Check Steps.
 */
function citeNumbers(
  slug: string,
  data: CitedData,
  lessons: Map<string, LessonFile | undefined>,
  problems: Map<string, ProblemFile | undefined>,
  errors: string[],
): Map<string, Cited[]> {
  const missing = (where: string, refs: string[]) => {
    for (const ref of refs) errors.push(`${where}cites "${ref}", which is not in the cited data`);
  };
  for (const [name, lesson] of lessons) {
    if (!lesson) continue;
    const steps = lesson.steps.map((step) => {
      if (step.type === "check") return step;
      const { item, cited, missing: refs } = citeIn(step, data);
      missing(`${slug}/lessons/${name}.yaml: step ${step.id}: `, refs);
      return cited.length ? { ...item, citations: cited } : item;
    });
    lessons.set(name, { ...lesson, steps });
  }
  const byProblem = new Map<string, Cited[]>();
  for (const [name, problem] of problems) {
    if (!problem) continue;
    const { item, cited, missing: refs } = citeIn(problem, data);
    missing(`${slug}/problems/${name}.yaml: `, refs);
    problems.set(name, item);
    if (cited.length) byProblem.set(name, cited);
  }
  return byProblem;
}

function subdirs(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => !name.startsWith(".") && statSync(join(dir, name)).isDirectory())
    .sort();
}

function yamlFiles(root: string, dir: string, extensions = [".yaml"]): string[] {
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir))
    .filter((name) => extensions.some((ext) => name.endsWith(ext)))
    .sort()
    .map((name) => `${dir}/${name}`);
}
