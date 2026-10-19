// The Unit page's Level select: full-width Lesson rows grouped into acts, the
// On-ramp marked optional, the capstone styled as a boss level and the Practice
// Set as the final row. Rendered to static HTML at build time (no client JS).
import type { Lesson, Phase, Unit } from "@astratron/content";

/** Step type names as the GLOSSARY and the Lesson specs write them. */
const STEP_TYPE_NAMES: Record<string, string> = { numeric: "Numeric input", rank: "Rank / order" };

/** A Step type as a Student reads it: "multiple-choice" → "Multiple choice". */
export const stepTypeName = (type: string) =>
  STEP_TYPE_NAMES[type] ?? type[0].toUpperCase() + type.slice(1).replace(/-/g, " ");

const PHASES: Phase[] = ["hook", "build", "check", "wrap"];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

interface Act {
  title?: string;
  lessons: Lesson[];
}

/** Consecutive Lessons with the same act form one group. */
function acts(lessons: Lesson[]): Act[] {
  const out: Act[] = [];
  for (const lesson of lessons) {
    const last = out.at(-1);
    if (last && last.title === lesson.act) last.lessons.push(lesson);
    else out.push({ title: lesson.act, lessons: [lesson] });
  }
  return out;
}

function PhaseBar({ phases }: { phases: Lesson["phases"] }) {
  const label = PHASES.map((p) => `${cap(p)} ${plural(phases[p], "Step")}`).join(", ");
  return (
    <div className="phase-bar" role="img" aria-label={label}>
      {PHASES.map((p) => (
        <span key={p} className={`phase phase-${p}`} style={{ flexGrow: phases[p] }} />
      ))}
    </div>
  );
}

function LessonRow({ lesson, firstCore }: { lesson: Lesson; firstCore?: Lesson }) {
  const kind = lesson.onRamp ? "on-ramp" : lesson.capstone ? "boss" : "core";
  const number = lesson.onRamp
    ? "On-ramp · optional"
    : `Lesson ${lesson.number}${lesson.capstone ? " · boss level" : ""}`;
  const steps = lesson.steps.length;
  return (
    <li className={`level level-${kind}`} data-lesson-id={lesson.id} data-on-ramp={lesson.onRamp || undefined}>
      <span className="level-number">{number}</span>
      {/* Filled in from the browser's progress record (progress/unit-page.ts). */}
      <span className="level-status" data-status="not-started">
        Not started
      </span>
      <h3 className="level-title">
        <a href={lesson.url}>{lesson.title}</a>
      </h3>
      <p className="level-goal">{lesson.goal}</p>
      <span className="chip">{stepTypeName(lesson.signature)}</span>
      <span className="chip count">{plural(steps, "Step")}</span>
      <PhaseBar phases={lesson.phases} />
      {lesson.onRamp && firstCore && (
        <a className="skip" href={firstCore.url}>
          Skip the on-ramp
        </a>
      )}
    </li>
  );
}

export default function LevelSelect({ unit }: { unit: Unit }) {
  const firstCore = unit.lessons.find((l) => !l.onRamp);
  const groups = acts(unit.lessons);
  const core = unit.lessons.filter((l) => !l.onRamp).length;
  return (
    <div className="level-select">
      {/* The On-ramp doesn't count toward the Unit; the browser fills in n from the progress record. */}
      <p className="unit-progress" data-unit-progress>
        0 of {core} Lessons
      </p>
      {groups.map((group, i) => (
        <section key={i} className="act">
          {group.title && <h2 className="act-title">{group.title}</h2>}
          <ol className="levels">
            {group.lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} firstCore={firstCore} />
            ))}
          </ol>
        </section>
      ))}
      <section className="act">
        <h2 className="act-title">Final round</h2>
        <ol className="levels">
          {/* The Practice Set page arrives with the Problem Bank (#74); link it here then. */}
          <li className="level level-practice">
            <span className="level-number">Unit review</span>
            <h3 className="level-title">Practice Set</h3>
            <p className="level-goal">10 Problems from the Unit's Bank, easy to hard, covering every Lesson.</p>
            <span className="chip">Mixed</span>
            <span className="chip count">10 Problems</span>
            <span className="level-soon">Opens soon</span>
          </li>
        </ol>
      </section>
    </div>
  );
}
