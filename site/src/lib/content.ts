// Build-time access to the course model. A content error fails the site build.
import { buildContent, type Course, type CourseModel, type Figure, type Lesson, type Step, type Unit } from "@astratron/content";
import { checkManifests, checkWatchManifests, sceneCatalog } from "@astratron/scenes/check";
import { sceneManifests } from "@astratron/scenes/manifests";
import { watchSceneManifests } from "@astratron/scenes/watch";
import { marked } from "marked";
import { drawView } from "./structures.ts";
import { setSize } from "./practice.ts";

/** Set in astro.config.mjs: the real content tree. */
declare const __CONTENT_ROOT__: string;

let cached: CourseModel | undefined;

export function courseModel(): CourseModel {
  if (cached) return cached;
  // Every Scene manifest must be complete, and every Step's Scene is checked against the registry.
  const sceneErrors = [...checkManifests(sceneManifests), ...checkWatchManifests(watchSceneManifests, sceneManifests)];
  const { model, errors } = buildContent(__CONTENT_ROOT__, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
  if (!model || sceneErrors.length) throw new Error(`Content build failed:\n  ${[...sceneErrors, ...errors].join("\n  ")}`);
  return (cached = model);
}

export interface LessonPage {
  subject: string;
  course: string;
  unit: string;
  /** The Unit id (u1, ...), for Mistake reports. */
  unitId: string;
  unitTitle: string;
  unitUrl: string;
  lesson: Lesson;
  /** The next Lesson in the Unit, if any. */
  nextUrl?: string;
}

export function lessonPages(): LessonPage[] {
  return courseModel().subjects.flatMap((s) =>
    s.courses.flatMap((c) =>
      c.units.flatMap((u) =>
        u.lessons.map((lesson, i) => ({
          subject: s.slug,
          course: c.slug,
          unit: u.slug,
          unitId: u.id,
          unitTitle: u.title,
          unitUrl: u.url,
          lesson,
          nextUrl: u.lessons[i + 1]?.url,
        })),
      ),
    ),
  );
}

export interface UnitPage {
  subject: string;
  course: Course;
  unit: Unit;
}

/** Only `available` Units get a page; coming-soon Units can't be entered. */
export function unitPages(): UnitPage[] {
  return courseModel().subjects.flatMap((s) =>
    s.courses.flatMap((course) =>
      course.units.filter((u) => u.status === "available").map((unit) => ({ subject: s.slug, course, unit })),
    ),
  );
}

export interface PracticePage extends UnitPage {
  /** Where "Next Unit" goes: the next available Unit's page, else the Course map. */
  nextUnitUrl: string;
}

/** A Practice Set page for each available Unit whose Bank has something to draw. */
export function practicePages(): PracticePage[] {
  return courseModel().subjects.flatMap((s) => {
    const units = s.courses.flatMap((c) => c.units.map((unit) => ({ course: c, unit })));
    return units.flatMap(({ course, unit }, i) => {
      if (unit.status !== "available" || setSize(unit) === 0) return [];
      const next = units[i + 1]?.unit;
      return [{ subject: s.slug, course, unit, nextUnitUrl: next?.status === "available" ? next.url : s.url }];
    });
  });
}

/** Where a Lesson's answer key is built: a separate file, so answers stay out of the page's HTML. */
export const answerKeyUrl = (subject: string, lessonId: string) => `/answers/${subject}/${lessonId}.json`;


/**
 * Inline Markdown → HTML, done at build time so no Markdown parser ships to the browser.
 * Numbers and formulas get `<span class="data">` (the data face); see markData.
 */
export const md = (text: string) => markData(marked.parseInline(text, { async: false }));

// Element symbols that turn up in organic chemistry, two-letter ones first.
const EL = "(?:Cl|Br|Na|Mg|Al|Si|Li|Ca|Fe|Zn|Cu|Mn|Cr|Pd|Pt|Sn|Hg|Se|Os|Ni|Ag|Au|Ti|He|Ne|Ar|H|B|C|N|O|F|P|S|K|I)";
const CHUNK = `(?:${EL}[₀-₉]*|\\((?:${EL}[₀-₉]*)+\\)[₀-₉]*)+[⁺⁻]*`;
const DATA = new RegExp(
  `(?<![A-Za-z])${CHUNK}(?:[–=≡]${CHUNK})*(?![a-z])` + // formula: CH₄, H₃C–CH₃, C=O, OH⁻
    `|(?<![\\d.])[−+]?\\d+(?:\\.\\d+)?`, // number: 4, 1.54, −1.7, the 3 of 3D and sp3
  "g",
);
/** A formula needs a subscript, a charge or a bond; a lone capital (I, C) stays prose. */
const isData = (t: string) => /[\d₀-₉⁺⁻–=≡]/.test(t);

/** Wraps numbers and formulas in HTML text (not tags, entities or code) in the data face. */
function markData(html: string): string {
  let inCode = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<code\b/.test(part)) inCode++;
        else if (part === "</code>") inCode--;
        return part;
      }
      if (inCode) return part;
      return part
        .split(/(&[#\w]+;)/)
        .map((t) => (t.startsWith("&") ? t : t.replace(DATA, (m) => (isData(m) ? `<span class="data">${m}</span>` : m))))
        .join("");
    })
    .join("");
}

/** The Lesson with every text field turned from Markdown into HTML and every structure pre-rendered to SVG. */
export function renderLesson(lesson: Lesson): Lesson {
  return { ...lesson, keyIdea: md(lesson.keyIdea), steps: lesson.steps.map(renderStep) };
}

/** One Step (or a Practice Set Problem) with its Markdown turned into HTML and its structures pre-rendered. */
export function renderStep(s: Step): Step {
  return renderVisuals(renderText(s));
}

const renderFigure = (f: Figure): Figure => ({ ...f, view: drawView(f.view), ...(f.caption ? { caption: md(f.caption) } : {}) });

/** A Step's figures and aside table drawn, their captions and its written Source note rendered. */
function renderVisuals(s: Step): Step {
  const out = { ...s };
  if (s.figures) out.figures = s.figures.map(renderFigure);
  if (s.sourceNote) out.sourceNote = md(s.sourceNote);
  if (s.aside?.table)
    out.aside = {
      ...s.aside,
      table: {
        columns: s.aside.table.columns.map(md),
        ...(s.aside.table.caption ? { caption: md(s.aside.table.caption) } : {}),
        rows: s.aside.table.rows.map((r) => ({ head: md(r.head), cells: r.cells.map((c) => c && renderFigure(c)) })),
      },
    };
  return out;
}

function renderText(s: Step): Step {
  if (s.type === "explain") return { ...s, text: md(s.text) };
  const shared = { prompt: md(s.prompt), correct: s.correct && md(s.correct), reveal: md(s.reveal) };
  const choices = (list: { id: string; text: string }[]) => list.map((o) => ({ ...o, text: md(o.text) }));
  switch (s.type) {
    case "multiple-choice":
      return {
        ...s,
        ...shared,
        // A structure card's text is its screen-reader label: kept plain; its drawing is pre-rendered SVG.
        options: s.options.map((o) => (o.structure ? { ...o, structure: drawView(o.structure) } : { ...o, text: md(o.text) })),
        hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })),
      };
    case "tap-to-identify":
      return {
        ...s,
        ...shared,
        structure: drawView(s.structure, s.targets),
        hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })),
      };
    case "numeric":
      return { ...s, ...shared, hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })) };
    case "rank":
      return { ...s, ...shared, items: choices(s.items), hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })) };
    case "manipulate":
      return { ...s, ...shared, hints: s.hints?.map((h) => ({ ...h, text: md(h.text) })) };
  }
}
