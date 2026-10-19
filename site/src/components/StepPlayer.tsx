// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
// The page carries the Lesson without its answers (spec story 99); the answer
// key is fetched from its own built file, and nothing is checked until it arrives.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { NumericStep, RankStep } from "@astratron/content";
import { act, start, type Action, type Answer, type Screen } from "../engine/player.ts";
import { withKey, type AnswerKey, type PageLesson } from "../lib/answer-key.ts";
import SourceNote from "./SourceNote.tsx";
import StructureTap from "./StructureTap.tsx";
import "./structure.css";

interface Props {
  /** The Lesson without answers, text fields already rendered to HTML at build time. */
  lesson: PageLesson;
  /** URL of the Lesson's answer key. */
  keyUrl: string;
  exitHref: string;
}

/** Island-only action: open the Step a Step link names (ADR 0003). */
type PlayerAction = Action | { type: "open"; stepId: string };

const html = (text: string) => ({ dangerouslySetInnerHTML: { __html: text } });

export default function StepPlayer({ lesson: page, keyUrl, exitHref }: Props) {
  const [key, setKey] = useState<AnswerKey>();
  const lesson = useMemo(() => withKey(page, key), [page, key]);
  const [screen, dispatch] = useReducer(
    (s: Screen, a: PlayerAction) =>
      a.type === "open" ? start(lesson, a.stepId) : act(lesson, { ...s, step: lesson.steps[s.index] }, a),
    lesson,
    (l) => start(l),
  );
  const [linked, setLinked] = useState(false);
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

  // A Step link opens its Step; the address then follows the Step on screen.
  useEffect(() => {
    const openLinked = () => {
      if (location.hash.length > 1) dispatch({ type: "open", stepId: decodeURIComponent(location.hash.slice(1)) });
      setChosen([]);
    };
    openLinked();
    setLinked(true);
    addEventListener("hashchange", openLinked);
    return () => removeEventListener("hashchange", openLinked);
  }, []);
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

  const icon = feedback && { correct: "✓", hint: "✗", reveal: "→" }[feedback.kind];
  const words = feedback && { correct: "Correct.", hint: "Not quite.", reveal: "Answer:" }[feedback.kind];

  // Single focus: no site chrome, only the ✕, story bars, Step count and one
  // fixed bottom button. The feedback panel sits above that button.
  return (
    <div className="player" id={step.id}>
      <div className="player-top">
        <a href={exitHref} aria-label="Leave the Lesson" className="player-exit">
          ✕
        </a>
        <ol className="bars" aria-hidden="true">
          {lesson.steps.map((s, i) => (
            <li key={s.id} className={i < screen.index ? "done" : i === screen.index ? "cur" : ""} />
          ))}
        </ol>
        <span className="player-count">
          Step {screen.index + 1} of {screen.total}
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
            answer={feedback?.kind === "reveal" && Array.isArray(feedback.answer) ? feedback.answer : []}
            locked={screen.canContinue}
            onToggle={pick}
          />
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
          </div>
        )}

        {/* Keyed per Step so a new Step opens its Source note collapsed. */}
        <SourceNote key={`source-note-${step.id}`} cited={step.citations ?? []} />
      </main>

      <div className="player-foot">
        <div role="status">
          {feedback && (
            <div className={`fb fb-${feedback.kind}`}>
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
          <a className="btn btn-primary btn-block" href={exitHref}>
            Finish
          </a>
        ) : screen.canContinue ? (
          <button type="button" className="btn btn-primary btn-block" onClick={next}>
            Continue
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
