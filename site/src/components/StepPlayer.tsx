// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
import { useReducer, useState } from "react";
import type { Lesson } from "@astratron/content";
import { act, start, type Action, type Screen } from "../engine/player.ts";
import StructureTap from "./StructureTap.tsx";
import "./structure.css";

interface Props {
  /** The Lesson with text fields already rendered to HTML at build time. */
  lesson: Lesson;
  exitHref: string;
}

const html = (text: string) => ({ dangerouslySetInnerHTML: { __html: text } });

export default function StepPlayer({ lesson, exitHref }: Props) {
  const [screen, dispatch] = useReducer((s: Screen, a: Action) => act(lesson, s, a), lesson, start);
  const [chosen, setChosen] = useState<string[]>([]);
  const { step, feedback } = screen;
  const single = step.type === "multiple-choice" && step.answer.length === 1;
  const revealed = feedback?.kind === "reveal" ? feedback.answer : [];

  function pick(id: string) {
    setChosen((c) => (single ? [id] : c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }
  function check() {
    dispatch({ type: "answer", choice: chosen });
    setChosen([]);
  }
  function next() {
    dispatch({ type: "continue" });
    setChosen([]);
  }

  return (
    <div className="player" id={step.id}>
      <header className="player-bar">
        <a href={exitHref} aria-label="Leave the Lesson" className="exit">
          ✕
        </a>
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
        ) : step.type === "tap-to-identify" ? (
          <>
            <p className="prompt" {...html(step.prompt)} />
            <StructureTap step={step} picked={chosen} answer={revealed} locked={screen.canContinue} onToggle={pick} />
          </>
        ) : (
          <>
            <p className="prompt" {...html(step.prompt)} />
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
          </>
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
          </div>
        )}
      </main>

      <footer className="player-action">
        {screen.done ? (
          <a className="button" href={exitHref}>
            Finish
          </a>
        ) : screen.canContinue ? (
          <button type="button" className="button" onClick={next}>
            Continue
          </button>
        ) : (
          <button type="button" className="button" onClick={check} disabled={chosen.length === 0}>
            Check
          </button>
        )}
      </footer>
    </div>
  );
}
