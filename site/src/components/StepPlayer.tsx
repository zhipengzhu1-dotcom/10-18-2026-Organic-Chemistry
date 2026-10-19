// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
import { useReducer, useState } from "react";
import type { Lesson } from "@astratron/content";
import { act, start, type Action, type Screen } from "../engine/player.ts";

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
          <>
            <p className="player-prompt" {...html(step.prompt)} />
            <div className="opts" role="group" aria-label="Choices">
              {step.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="opt"
                  aria-pressed={chosen.includes(o.id)}
                  disabled={screen.canContinue}
                  onClick={() => pick(o.id)}
                  {...html(o.text)}
                />
              ))}
            </div>
          </>
        )}

        {screen.done && (
          <div className="card">
            <h2>Key idea</h2>
            <p {...html(lesson.keyIdea)} />
          </div>
        )}
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
          <button type="button" className="btn btn-primary btn-block" onClick={check} disabled={chosen.length === 0}>
            Check
          </button>
        )}
      </div>
    </div>
  );
}
