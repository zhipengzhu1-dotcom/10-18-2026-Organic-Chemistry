// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
// The page carries the Lesson without its answers (spec story 99); the answer
// key is fetched from its own built file, and nothing is checked until it arrives.
import { useEffect, useMemo, useReducer, useState } from "react";
import { act, start, type Action, type Screen } from "../engine/player.ts";
import { withKey, type AnswerKey, type PageLesson } from "../lib/answer-key.ts";

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
        ) : (
          <>
            <p className="prompt" {...html(step.prompt)} />
            <div className="options" role="group" aria-label="Choices">
              {step.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={chosen.includes(o.id)}
                  disabled={screen.canContinue}
                  onClick={() => pick(o.id)}
                  {...html(o.text)}
                />
              ))}
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
          <button type="button" className="button" onClick={check} disabled={!key || chosen.length === 0}>
            Check
          </button>
        )}
      </footer>
    </div>
  );
}
