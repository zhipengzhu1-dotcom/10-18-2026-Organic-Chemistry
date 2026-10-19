// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
// The page carries the Lesson without its answers (spec story 99); the answer
// key is fetched from its own built file, and nothing is checked until it arrives.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { NumericStep, RankStep } from "@astratron/content";
import { act, start, type Action, type Answer, type LessonProgress, type Screen } from "../engine/player.ts";
import { withKey, type AnswerKey, type PageLesson } from "../lib/answer-key.ts";
import { recordProblem, saveLesson, streakOn } from "../progress/record.ts";
import { readRecord, writeRecord } from "../progress/store.ts";
import SourceNote from "./SourceNote.tsx";
import StructureTap from "./StructureTap.tsx";
import "./structure.css";

interface Props {
  /** The Lesson without answers, text fields already rendered to HTML at build time. */
  lesson: PageLesson;
  /** URL of the Lesson's answer key. */
  keyUrl: string;
  /** The Unit page: ✕ and "Back to Unit" go here. */
  exitHref: string;
  /** The next Lesson in the Unit, for the Lesson-end screen. */
  nextHref?: string;
}

/**
 * Island-only action: (re)open a Step, replaying saved answers. With no `stepId` it opens
 * where the progress says; with no `saved` it keeps the progress on screen.
 */
type PlayerAction = Action | { type: "open"; stepId?: string; saved?: LessonProgress };

const html = (text: string) => ({ dangerouslySetInnerHTML: { __html: text } });

/** Every number is set in JetBrains Mono (design token --at-font-data). */
const dataFont = { fontFamily: "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)" };

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

export default function StepPlayer({ lesson: page, keyUrl, exitHref, nextHref }: Props) {
  const [key, setKey] = useState<AnswerKey>();
  const lesson = useMemo(() => withKey(page, key), [page, key]);
  const [screen, dispatch] = useReducer(
    (s: Screen, a: PlayerAction) =>
      a.type === "open"
        ? start(lesson, a.stepId, a.saved ?? s.progress)
        : act(lesson, { ...s, step: lesson.steps[s.index] }, a),
    lesson,
    (l) => start(l),
  );
  const [linked, setLinked] = useState(false);
  /** Streak days, when reaching this Wrap earned today's Streak day. */
  const [streakTick, setStreakTick] = useState<number | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [ranked, setRanked] = useState<{ stepId: string; order: string[] } | null>(null);
  const { step, feedback } = screen;
  const pageStep = page.steps[screen.index];
  const single = pageStep.type === "multiple-choice" && pageStep.select === "one";

  useEffect(() => {
    let live = true;
    fetch(keyUrl)
      .then((r) => r.json() as Promise<AnswerKey>)
      .then((k) => live && setKey(k));
    return () => {
      live = false;
    };
  }, [keyUrl]);

  // The Lesson resumes where the Student left it; a Step link opens its Step instead.
  // The address then follows the Step on screen.
  useEffect(() => {
    const linkedStep = () => (location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : undefined);
    const saved = readRecord().lessons[page.id];
    dispatch({ type: "open", stepId: linkedStep(), saved });
    setLinked(true);
    const openLinked = () => {
      const stepId = linkedStep();
      if (stepId) dispatch({ type: "open", stepId });
      setChosen([]);
    };
    addEventListener("hashchange", openLinked);
    return () => removeEventListener("hashchange", openLinked);
  }, [page.id]);

  // Saved answers are graded again once the key arrives.
  useEffect(() => {
    if (key) dispatch({ type: "open" });
  }, [key]);

  // Every move is saved. A Check Step's Problem result counts toward the Streak.
  useEffect(() => {
    if (!linked) return;
    const now = new Date();
    let { record, earned } = saveLesson(readRecord(), page.id, screen.progress, now);
    if (key && screen.step.type !== "explain" && "problemId" in screen.step && screen.step.problemId && screen.canContinue) {
      const result = { tries: screen.tries, correct: screen.feedback?.kind === "correct" };
      const solved = recordProblem(record, screen.step.problemId, result, now);
      record = solved.record;
      earned ||= solved.earned;
    }
    writeRecord(record);
    if (earned && screen.done) setStreakTick(streakOn(record, now).count);
  }, [linked, key, page.id, screen]);
  useEffect(() => {
    const moved = location.hash || screen.index > 0;
    if (linked && moved && location.hash !== `#${step.id}`) history.replaceState(null, "", `#${step.id}`);
  }, [linked, step.id, screen.index]);

  const order =
    step.type !== "rank" ? [] : ranked?.stepId === step.id ? ranked.order : step.items.map((item) => item.id);

  const answer: Answer | null =
    step.type === "multiple-choice" || step.type === "tap-to-identify"
      ? chosen.length > 0 ? { choice: chosen } : null
      : step.type === "numeric"
        ? Number.isFinite(parseNumber(draft)) ? { value: parseNumber(draft) } : null
        : step.type === "rank"
          ? { order }
          : null;

  function pick(id: string) {
    setChosen((c) => (single ? [id] : c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }
  function check() {
    if (!answer || screen.canContinue) return;
    dispatch({ type: "answer", ...answer });
    setChosen([]);
  }
  function next() {
    dispatch({ type: "continue" });
    setChosen([]);
    setDraft("");
  }
  function back() {
    dispatch({ type: "back" });
    setChosen([]);
    setDraft("");
  }

  return (
    <div className="player" id={step.id}>
      <header className="player-bar">
        <a href={exitHref} aria-label="Leave the Lesson" className="exit">
          ✕
        </a>
        <button type="button" className="back" aria-label="Previous Step" disabled={screen.index === 0} onClick={back}>
          ‹
        </button>
        <ol className="story-bars" aria-hidden="true">
          {lesson.steps.map((s, i) => (
            <li key={s.id} className={i <= screen.index ? "seen" : ""} />
          ))}
        </ol>
        <span className="count">
          Step {screen.index + 1} of {screen.total}
        </span>
      </header>

      <main className="step">
        {step.type === "explain" ? (
          <div className="explain" {...html(step.text)} />
        ) : (
          <p className="prompt" {...html(step.prompt)} />
        )}

        {step.type === "tap-to-identify" && (
          <StructureTap
            step={step}
            picked={chosen}
            answer={feedback?.kind === "reveal" && Array.isArray(feedback.answer) ? feedback.answer : []}
            locked={screen.canContinue}
            onToggle={pick}
          />
        )}

        {step.type === "multiple-choice" && (
          <div className="options" role="group" aria-label="Choices">
            {step.options.map((o) =>
              o.structure ? (
                // A structure card: the drawing is pre-rendered SVG; its text is the screen-reader label.
                <button
                  key={o.id}
                  type="button"
                  className="structure-card"
                  aria-label={o.text}
                  aria-pressed={chosen.includes(o.id)}
                  disabled={screen.canContinue}
                  onClick={() => pick(o.id)}
                >
                  <span aria-hidden="true" {...html(o.structure.drawn?.svg ?? "")} />
                </button>
              ) : (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={chosen.includes(o.id)}
                  disabled={screen.canContinue}
                  onClick={() => pick(o.id)}
                  {...html(o.text)}
                />
              ),
            )}
          </div>
        )}

        {step.type === "numeric" && (
          <NumericBox step={step} value={draft} onChange={setDraft} onSubmit={check} locked={screen.canContinue} />
        )}

        {step.type === "rank" && (
          <RankCards
            key={step.id}
            step={step}
            order={order}
            onChange={(o) => setRanked({ stepId: step.id, order: o })}
            locked={screen.canContinue}
          />
        )}

        {feedback && (
          <div className={`feedback ${feedback.kind}`} role="status">
            {feedback.kind === "correct" && <span>✓ Correct. </span>}
            {feedback.kind === "hint" && <span>✗ Not quite. </span>}
            {feedback.kind === "reveal" && <span>→ Answer: </span>}
            <span {...html(feedback.text)} />
          </div>
        )}

        {screen.done && (
          <div className="key-idea">
            <h2>Key idea</h2>
            <p {...html(lesson.keyIdea)} />
            {streakTick !== null && (
              <p className="streak-tick" style={dataFont}>
                ✓ Streak: {streakTick} {streakTick === 1 ? "day" : "days"}
              </p>
            )}
          </div>
        )}

        {/* Keyed per Step so a new Step opens its Source note collapsed. */}
        <SourceNote key={`source-note-${step.id}`} cited={step.citations ?? []} />
      </main>

      <footer className="player-action">
        {screen.done ? (
          // The Lesson-end screen: Next Lesson first, Back to Unit second. No donate prompt here.
          <>
            {nextHref && (
              <a className="button" href={nextHref}>
                Next Lesson
              </a>
            )}
            <a className={nextHref ? "button-secondary" : "button"} href={exitHref}>
              Back to Unit
            </a>
          </>
        ) : screen.canContinue ? (
          <button type="button" className="button" onClick={next}>
            Continue
          </button>
        ) : (
          <button type="button" className="button" onClick={check} disabled={!key || !answer}>

            Check
          </button>
        )}
      </footer>
    </div>
  );
}

/** Reads what the Student typed: accepts a comma decimal and a typographic minus; NaN when it isn't a number. */
function parseNumber(text: string): number {
  const t = text.trim().replace(/−/g, "-").replace(",", ".");
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : Number.NaN;
}

interface NumericBoxProps {
  step: NumericStep;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  locked: boolean;
}

/** A number box with the fixed unit beside it; the unit is never typed. Enter checks. */
function NumericBox({ step, value, onChange, onSubmit, locked }: NumericBoxProps) {
  return (
    <form
      className="numeric"
      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        type="text"
        // The decimal keypad has no minus sign, so a negative answer gets the full keyboard.
        inputMode={step.answer < 0 ? "text" : "decimal"}
        autoComplete="off"
        aria-label="Answer"
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...dataFont, fontSize: 20, minHeight: 48, width: "8em", padding: "0 0.5rem", boxSizing: "border-box" }}
      />
      {step.unitSymbol && <span style={{ ...dataFont, fontSize: 20 }}>{step.unitSymbol}</span>}
    </form>
  );
}

interface RankCardsProps {
  step: RankStep;
  order: string[];
  onChange: (order: string[]) => void;
  locked: boolean;
}

/** Cards in one column: drag a card (mouse or touch), or focus it and press ↑/↓ to move it. */
function RankCards({ step, order, onChange, locked }: RankCardsProps) {
  const list = useRef<HTMLOListElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const text = (id: string) => step.items.find((item) => item.id === id)?.text ?? id;

  function moveTo(id: string, to: number, announce: boolean) {
    const from = order.indexOf(id);
    if (to < 0 || to >= order.length || to === from) return;
    const rest = order.filter((x) => x !== id);
    onChange([...rest.slice(0, to), id, ...rest.slice(to)]);
    if (announce) setSaid(`${plain(text(id))} moved to position ${to + 1} of ${order.length}.`);
  }

  // Reordering moves the card's DOM node, which drops focus; put it back.
  useEffect(() => {
    if (focusId) list.current?.querySelector<HTMLButtonElement>(`[data-id="${focusId}"]`)?.focus();
  }, [order, focusId]);

  // While dragging, the card goes to the slot under the pointer.
  useEffect(() => {
    if (!dragging) return;
    function move(e: PointerEvent) {
      const others = [...(list.current?.querySelectorAll<HTMLElement>("[data-id]") ?? [])].filter(
        (el) => el.dataset.id !== dragging,
      );
      const to = others.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 <= e.clientY;
      }).length;
      moveTo(dragging!, to, false);
    }
    function drop() {
      const at = order.indexOf(dragging!);
      setSaid(`${plain(text(dragging!))} dropped at position ${at + 1} of ${order.length}.`);
      setDragging(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", drop);
    };
  });

  return (
    <>
      <p id={`${step.id}-rank-help`} style={visuallyHidden}>
        Drag a card, or focus it and press the up and down arrow keys to move it.
      </p>
      <ol ref={list} className="options rank" aria-label="Order" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {order.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              data-id={id}
              aria-describedby={`${step.id}-rank-help`}
              aria-disabled={locked}
              className={dragging === id ? "dragging" : undefined}
              style={{ width: "100%", touchAction: "none", userSelect: "none", cursor: locked ? "default" : "grab" }}
              onFocus={() => setFocusId(id)}
              onBlur={() => setFocusId((f) => (f === id ? null : f))}
              onPointerDown={(e) => {
                if (locked || e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.focus();
                setDragging(id);
              }}
              onKeyDown={(e) => {
                if (locked) return;
                const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : null;
                if (to === null) return;
                e.preventDefault();
                moveTo(id, to, true);
              }}
              {...html(text(id))}
            />
          </li>
        ))}
      </ol>
      <p aria-live="polite" style={visuallyHidden}>
        {said}
      </p>
    </>
  );
}

/** Item text is HTML (rendered Markdown); announcements want plain words. */
function plain(htmlText: string): string {
  return htmlText.replace(/<[^>]*>/g, "");
}
