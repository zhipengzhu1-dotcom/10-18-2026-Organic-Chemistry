// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
// The page carries the Lesson without its answers (spec story 99); the answer
// key is fetched from its own built file, and nothing is checked until it arrives.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { NumericStep, RankStep, SceneValue } from "@astratron/content";
import { act, start, type Action, type Answer, type LessonProgress, type PlayableLesson, type Screen } from "../engine/player.ts";
import { withKey, type AnswerKey, type PageLesson } from "../lib/answer-key.ts";
import { mistakeTarget, reportMistakeHref } from "../lib/submit-links.ts";
import { recordProblem, saveLesson, streakOn } from "../progress/record.ts";
import { readRecord, writeRecord } from "../progress/store.ts";
import SourceNote from "./SourceNote.tsx";
import ScenePlayer from "./ScenePlayer.tsx";
import SceneControl from "./SceneControl.tsx";
import StructureTap from "./StructureTap.tsx";
import DrawArrows from "./DrawArrows.tsx";
import { PushReplayPlayer } from "./PushReplayPlayer.tsx";
import "./structure.css";

interface Props {
  /** The Lesson without answers, text fields already rendered to HTML at build time. */
  lesson: PageLesson;
  /** URL of the Lesson's answer key. */
  keyUrl: string;
  /** The Unit page: ✕ and "Back to Unit" go here. */
  exitHref: string;
  /** The Unit id, for the "Report a mistake" link. */
  unitId: string;
  /** The next Lesson in the Unit, for the Lesson-end screen. */
  nextHref?: string;
  /**
   * Set when playing a Practice Set round: Problems instead of Steps, no resume, no Step links,
   * and after the last Problem a "See results" button hands the round's progress back.
   */
  practice?: { onFinish: (round: PlayableLesson, progress: LessonProgress) => void };
}

/**
 * Island-only action: (re)open a Step, replaying saved answers. With no `stepId` it opens
 * where the progress says; with no `saved` it keeps the progress on screen.
 */
type PlayerAction = Action | { type: "open"; stepId?: string; saved?: LessonProgress };

const html = (text: string) => ({ dangerouslySetInnerHTML: { __html: text } });

export default function StepPlayer({ lesson: page, keyUrl, exitHref, unitId, nextHref, practice }: Props) {
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
  const [manipulated, setManipulated] = useState<{ stepId: string; value: SceneValue } | null>(null);
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
    if (practice) {
      setLinked(true);
      return;
    }
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
    // A Practice Set isn't a Lesson: only its Problems' results are saved.
    let { record, earned } = practice
      ? { record: readRecord(), earned: false }
      : saveLesson(readRecord(), page.id, screen.progress, now);
    if (key && screen.step.type !== "explain" && "problemId" in screen.step && screen.step.problemId && screen.canContinue) {
      const result = { tries: screen.tries, correct: screen.feedback?.kind === "correct" };
      const solved = recordProblem(record, screen.step.problemId, result, now);
      record = solved.record;
      earned ||= solved.earned;
    }
    writeRecord(record);
    if (earned && screen.done) setStreakTick(streakOn(record, now).count);
  }, [linked, key, page.id, screen, practice]);
  useEffect(() => {
    if (practice) return;
    const moved = location.hash || screen.index > 0;
    if (linked && moved && location.hash !== `#${step.id}`) history.replaceState(null, "", `#${step.id}`);
  }, [linked, step.id, screen.index, practice]);

  const order =
    step.type !== "rank" ? [] : ranked?.stepId === step.id ? ranked.order : step.items.map((item) => item.id);

  // Manipulate a Scene: the control's value; the reveal jumps it to the answer (and a resumed
  // right answer shows it there too).
  const setting: SceneValue | undefined =
    step.type !== "manipulate"
      ? undefined
      : feedback?.kind === "reveal" || feedback?.kind === "correct"
        ? step.answer
        : manipulated?.stepId === step.id
          ? manipulated.value
          : step.scene.state[step.control];
  const sceneState =
    step.type === "manipulate" && setting !== undefined ? { ...step.scene.state, [step.control]: setting } : step.scene?.state;

  const answer: Answer | null =
    step.type === "multiple-choice" || step.type === "tap-to-identify"
      ? chosen.length > 0 ? { choice: chosen } : null
      : step.type === "numeric"
        ? Number.isFinite(parseNumber(draft)) ? { value: parseNumber(draft) } : null
        : step.type === "rank"
          ? { order }
          : step.type === "draw-arrows"
            ? null // pushes are dispatched one by one by the Draw-arrows view
            : setting !== undefined
            ? { setting }
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

  const icon = feedback && { correct: "✓", hint: "✗", reveal: "→", shown: "→" }[feedback.kind];
  // Draw arrows' shown push already reads "Here is that push: …".
  const words = feedback && { correct: "Correct.", hint: "Not quite.", reveal: "Answer:", shown: "" }[feedback.kind];

  // Single focus: no site chrome, only the ✕, story bars, Step count and one
  // fixed bottom button. The feedback panel sits above that button.
  return (
    <div className="player" id={step.id}>
      <div className="player-top">
        <a href={exitHref} aria-label={practice ? "Leave the Practice Set" : "Leave the Lesson"} className="player-exit">
          ✕
        </a>
        <button type="button" className="player-back" aria-label="Previous Step" disabled={screen.index === 0} onClick={back}>
          ‹
        </button>
        <ol className="bars" aria-hidden="true">
          {lesson.steps.map((s, i) => (
            <li key={s.id} className={i < screen.index ? "done" : i === screen.index ? "cur" : ""} />
          ))}
        </ol>
        <span className="player-count">
          {practice ? "Problem" : "Step"} {screen.index + 1} of {screen.total}
        </span>
      </div>

      <main className="player-body">
        {step.type === "explain" ? (
          <p {...html(step.text)} />
        ) : (
          <p className="player-prompt" {...html(step.prompt)} />
        )}

        {step.type === "tap-to-identify" && (
          <StructureTap
            step={step}
            picked={chosen}
            answer={feedback?.kind === "reveal" && Array.isArray(feedback.answer) ? (feedback.answer as string[]) : []}
            locked={screen.canContinue}
            onToggle={pick}
          />
        )}

        {step.type === "draw-arrows" && screen.arrows && !screen.canContinue && (
          <DrawArrows
            key={`arrows-${step.id}`}
            start={step.start.structure}
            hide={step.start.hide}
            pushes={screen.arrows.pushes}
            structure={screen.arrows.structure}
            flags={screen.arrows.flags}
            last={screen.arrows.last}
            target={step.target}
            locked={screen.canContinue || !key}
            onPush={(push) => dispatch({ type: "answer", push })}
            onUndo={() => dispatch({ type: "answer", undo: true })}
          />
        )}

        {/* Draw arrows: on success (or the reveal) the Step's Scene plays in place of the card, else push-replay of the arrows. */}
        {step.type === "draw-arrows" && screen.canContinue && !step.scene && screen.arrows && (
          <PushReplayPlayer key={`replay-${step.id}`} start={step.start.structure} hide={step.start.hide} pushes={screen.arrows.pushes.map((p) => p.push)} />
        )}

        {step.scene && sceneState && (step.type !== "draw-arrows" || screen.canContinue) && (
          // Keyed per Step so entering a Step starts its Scene afresh (autoplay on entry).
          <ScenePlayer
            key={`scene-${step.id}`}
            sceneId={step.scene.id}
            state={sceneState}
            cited={step.scene.cited}
            loop={step.type === "manipulate"}
          >
            {step.type === "manipulate" && setting !== undefined && (
              <SceneControl
                sceneId={step.scene.id}
                control={step.control}
                value={setting}
                onChange={(value) => setManipulated({ stepId: step.id, value })}
                locked={screen.canContinue}
              />
            )}
          </ScenePlayer>
        )}

        {step.type === "multiple-choice" && (
          <div className="opts" role="group" aria-label="Choices">
            {step.options.map((o) =>
              o.structure ? (
                // A structure card: the drawing is pre-rendered SVG; its text is the screen-reader label.
                <button
                  key={o.id}
                  type="button"
                  className="opt structure-card"
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
                  className="opt"
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

        {screen.done && (
          <div className="card">
            <h2>Key idea</h2>
            <p {...html(lesson.keyIdea)} />
            {streakTick !== null && (
              <p className="streak-tick data">
                ✓ Streak: {streakTick} {streakTick === 1 ? "day" : "days"}
              </p>
            )}
          </div>
        )}

        {/* Keyed per Step so a new Step opens its Source note collapsed. */}
        <SourceNote key={`source-note-${step.id}`} cited={step.citations ?? []} />

        <p className="report">
          <a href={reportMistakeHref(unitId, mistakeTarget(lesson.id, step))}>Report a mistake</a>
        </p>
      </main>

      <div className="player-foot">
        <div role="status">
          {feedback && (
            <div className={`fb fb-${feedback.kind === "shown" ? "reveal fb-shown" : feedback.kind}`}>
              <span className="ic" aria-hidden="true">
                {icon}
              </span>{" "}
              <p>
                <strong>{words}</strong> <span {...html(feedback.text)} />
              </p>
            </div>
          )}
        </div>
        {screen.done ? (
          // The Lesson-end screen: Next Lesson first, Back to Unit second. No donate prompt here.
          <div className="player-end">
            {nextHref && (
              <a className="btn btn-primary btn-block" href={nextHref}>
                Next Lesson
              </a>
            )}
            <a className={`btn btn-block ${nextHref ? "btn-secondary" : "btn-primary"}`} href={exitHref}>
              Back to Unit
            </a>
          </div>
        ) : practice && screen.canContinue && screen.index + 1 === screen.total ? (
          <button type="button" className="btn btn-primary btn-block" onClick={() => practice.onFinish(lesson, screen.progress)}>
            See results
          </button>
        ) : screen.canContinue ? (
          <button type="button" className="btn btn-primary btn-block" onClick={next}>
            Continue
          </button>
        ) : step.type === "draw-arrows" ? (
          // No Check button: each push is graded the moment it lands. The one bottom button undoes.
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => dispatch({ type: "answer", undo: true })}
            disabled={!key || !screen.arrows?.pushes.length}
          >
            Undo arrow
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={check} disabled={!key || !answer}>
            Check
          </button>
        )}
      </div>
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
        className="numeric-box"
      />
      {step.unitSymbol && <span className="numeric-unit">{step.unitSymbol}</span>}
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
      <p id={`${step.id}-rank-help`} className="sr">
        Drag a card, or focus it and press the up and down arrow keys to move it.
      </p>
      <ol ref={list} className="opts rank" aria-label="Order">
        {order.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              data-id={id}
              aria-describedby={`${step.id}-rank-help`}
              aria-disabled={locked}
              className={dragging === id ? "opt dragging" : "opt"}
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
      <p aria-live="polite" className="sr">
        {said}
      </p>
    </>
  );
}

/** Item text is HTML (rendered Markdown); announcements want plain words. */
function plain(htmlText: string): string {
  return htmlText.replace(/<[^>]*>/g, "");
}
