// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
// What Steps share is drawn here; the rest comes from the Step's view, one per
// Step type (./steps/). The page carries the Lesson without its answers (spec
// story 99); the answer key is fetched from its own built file, and nothing is
// checked until it arrives.
import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { act, start, type Action, type LessonProgress, type PlayableLesson, type Screen } from "../engine/player.ts";
import { answeredCitations } from "@astratron/content/model";
import { answerOf, secretFields, type ChoiceOf, type StepType } from "@astratron/content/step-types";
import { withKey, type AnswerKey, type PageLesson } from "../lib/answer-key.ts";
import { mistakeTarget, reportMistakeHref } from "../lib/submit-links.ts";
import { recordProblem, saveLesson, streakOn } from "../progress/record.ts";
import { readRecord, writeRecord } from "../progress/store.ts";
import SourceNote from "./SourceNote.tsx";
import ScenePlayer from "./ScenePlayer.tsx";
import WatchScenePlayer from "./WatchScenePlayer.tsx";
import { watchScene } from "@astratron/scenes/watch";
import MoleculeCard from "../molecule/MoleculeCard.tsx";
import MoleculeSwitch from "../molecule/MoleculeSwitch.tsx";
import { AsideButton, Figures } from "./StepVisuals.tsx";
import ExploreIn3D from "../explore/ExploreIn3D.tsx";
import { viewOf, type ViewProps } from "./steps/index.ts";
import { html } from "./steps/view.tsx";
import "./structure.css";

/** The Tutor (spec #104): dev only. Behind `import.meta.env.DEV` the build drops it and its chunk. */
const Tutor = import.meta.env.DEV ? lazy(() => import("../tutor/TutorPanel.tsx")) : null;

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
  /** Its words: "Next Lesson", or the capstone's "Unit 1 Practice Set". */
  nextLabel?: string;
  /**
   * Set when playing a Practice Set round: Problems instead of Steps, no resume, no Step links,
   * and after the last Problem a "See results" button hands the round's progress back.
   */
  practice?: { onFinish: (round: PlayableLesson, progress: LessonProgress) => void };
}

/**
 * Island-only action: (re)open a Step, replaying saved answers. With no `stepId` it opens
 * where `saved` says, or reopens the Step on screen; with no `saved` it keeps the progress on screen.
 */
type PlayerAction = Action | { type: "open"; stepId?: string; saved?: LessonProgress };

export default function StepPlayer({ lesson: page, keyUrl, exitHref, unitId, nextHref, nextLabel = "Next Lesson", practice }: Props) {
  const [key, setKey] = useState<AnswerKey>();
  const lesson = useMemo(() => withKey(page, key), [page, key]);
  const [screen, dispatch] = useReducer(
    (s: Screen, a: PlayerAction) =>
      a.type === "open"
        ? start(lesson, a.stepId ?? (a.saved ? undefined : s.step.id), a.saved ?? s.progress)
        : act(lesson, { ...s, step: lesson.steps[s.index] }, a),
    lesson,
    (l) => start(l),
  );
  const [linked, setLinked] = useState(false);
  /** Streak days, when reaching this Wrap earned today's Streak day. */
  const [streakTick, setStreakTick] = useState<number | null>(null);
  /** What the Student has done on a Step so far, before Check (picks, typed text, a card order…); a new Step opens without. */
  const [draft, setDraft] = useState<{ stepId: string; choice: ChoiceOf<StepType> } | null>(null);
  /** The graded Step whose watch-only video is playing now (its prompt waits until it stops). */
  const [introPlaying, setIntroPlaying] = useState<string | null>(null);
  const { feedback } = screen;
  // Drawn from the keyed Lesson, not `screen.step`: when the key arrives, `screen` still holds the
  // keyless Step for one render (until the "open" effect below replays it), and a keyless graded Step
  // has no reveal Scene, so its Source note would mount for that render and unmount on the next.
  // (That flicker hung CI's design walk: it saw the note, then clicked a note that was gone.)
  const step = lesson.steps[screen.index];
  const view = viewOf(step.type);

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
      setDraft(null);
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
    // A Step opened ahead by a link saves nothing and earns nothing (story 17).
    if (key && !screen.ahead && "problemId" in screen.step && screen.step.problemId && screen.canContinue) {
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

  // A new Step on screen (Continue, back, a Step link) takes focus, so a screen reader announces it.
  const body = useRef<HTMLElement>(null);
  const shownStep = useRef(step.id);
  useEffect(() => {
    if (shownStep.current === step.id) return;
    shownStep.current = step.id;
    body.current?.focus({ preventScroll: true });
  }, [step.id]);

  const revealScene = "revealScene" in step && screen.canContinue ? step.revealScene : undefined;
  /** A 3D Step card is on screen (phones lay these Steps out tighter: see .player.has-card). */
  const hasCard = "molecule" in step && !!step.molecule?.card && !revealScene;

  const choice = view.choice?.(step, draft?.stepId === step.id ? draft.choice : undefined, screen);
  const answer = choice === undefined ? null : answerOf(step.type, choice);

  function check() {
    if (!answer || screen.canContinue) return;
    dispatch({ type: "answer", ...answer });
    if (view.fresh) setDraft(null);
  }
  function next() {
    dispatch({ type: "continue" });
    setDraft(null);
  }
  function back() {
    dispatch({ type: "back" });
    setDraft(null);
  }
  const viewProps: ViewProps<StepType> = {
    step,
    page: page.steps[screen.index],
    screen,
    state: screen.state,
    keyed: !!key,
    revealing: !!revealScene,
    waiting: introPlaying === step.id,
    choice: choice!,
    choose: (c) => setDraft({ stepId: step.id, choice: c }),
    submit: (c) => {
      const a = answerOf(step.type, c);
      if (a) dispatch({ type: "answer", ...a });
    },
    check,
    nudge: (kind) => dispatch({ type: kind === "early" ? "continue" : "idle" }),
  };
  /** Every Step type but Explain asks something: its video shrinks once played, and holds back the prompt while it plays. */
  const asks = !view.tells;

  const icon = feedback && { correct: "✓", hint: "✗", reveal: "→", shown: "→" }[feedback.kind];
  // Draw arrows' shown push already reads "Here is that push: …".
  const words = feedback && { correct: "Correct.", hint: "Not quite.", reveal: "Answer:", shown: "" }[feedback.kind];

  // Single focus: no site chrome, only the ✕, story bars, Step count and one
  // fixed bottom button. The feedback panel sits above that button.
  return (
    <div
      className={playerClass({
        revealing: !!revealScene,
        card: hasCard,
        // A view's own case (a Tap Step with figures, #78) or a 3D Step (#81), once answered: phones drop the prompt.
        answered: (!!feedback && !!view.dropsPrompt?.(step)) || (hasCard && screen.canContinue),
      })}
      id={step.id}
      // "loaded" once the answer key is in and nothing more will change a Step's shape on its own.
      data-key={key ? "loaded" : "loading"}
      // The browser tests answer each Step by its type (site/e2e/site.ts).
      data-type={step.type}
    >
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
        {Tutor && (
          <Suspense fallback={null}>
            <Tutor lesson={page} screen={screen} draft={draft?.stepId === step.id ? draft.choice : undefined} />
          </Suspense>
        )}
      </div>

      <main className="player-body" ref={body} tabIndex={-1} aria-label={`${practice ? "Problem" : "Step"} ${screen.index + 1} of ${screen.total}`}>
        {/* The prompt (an Explain's text). While a Hook's video plays, its question waits (still read to screen readers), as the spec has it. */}
        <view.Lead {...viewProps} />

        {/* Once a reveal Scene plays, it shows the answer in place of the question's widgets. */}
        {step.figures && !revealScene && !(hasCard && "molecule" in step && step.molecule?.toggle) && <Figures figures={step.figures} />}

        {view.Drawing && <view.Drawing {...viewProps} />}

        {revealScene &&
          // Once the Step is answered its reveal Scene takes the Scene's place and plays.
          (watchScene(revealScene.id) ? (
            <WatchScenePlayer key={`reveal-scene-${step.id}`} sceneId={revealScene.id} cited={revealScene.cited} />
          ) : (
            <ScenePlayer
              key={`reveal-scene-${step.id}`}
              sceneId={revealScene.id}
              state={revealScene.state}
              cited={revealScene.cited}
            />
          ))}

        {!revealScene && step.scene && watchScene(step.scene.id) && (!view.sceneOnceDone || screen.canContinue) && (
          // A watch-only Scene (#66): the committed video, keyed per Step so it autoplays on entry.
          <WatchScenePlayer
            key={`scene-${step.id}`}
            sceneId={step.scene.id}
            cited={step.scene.cited}
            shrinkWhenDone={asks}
            onPlaying={(playing) => setIntroPlaying(playing && asks ? step.id : null)}
          />
        )}

        {view.Scene ? (
          <view.Scene {...viewProps} />
        ) : (
          !revealScene &&
          step.scene &&
          !watchScene(step.scene.id) &&
          (!view.sceneOnceDone || screen.canContinue) && (
            // Keyed per Step so entering a Step starts its Scene afresh (autoplay on entry).
            <ScenePlayer key={`scene-${step.id}`} sceneId={step.scene.id} state={step.scene.state} cited={step.scene.cited} still={step.scene.still} />
          )
        )}

        {"molecule" in step &&
          step.molecule?.card &&
          !revealScene &&
          // The 3D Step card (#68), keyed per Step so each Step opens in its own start view. A toggle
          // switches molecules (Lesson 3); a page sheet offers Snap to page after a wrong try and
          // settles on the page once the Step is answered.
          (step.molecule.toggle ? (
            <MoleculeSwitch
              key={`molecule-${step.id}`}
              molecule={step.molecule}
              snap={screen.tries > 0}
              settled={screen.canContinue}
              beside={step.figures && <Figures figures={step.figures} />}
            />
          ) : (
            <MoleculeCard key={`molecule-${step.id}`} molecule={step.molecule} snap={screen.tries > 0} settled={screen.canContinue} />
          ))}

        {view.Answer && <view.Answer {...viewProps} />}

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

        {"molecule" in step && step.molecule && <ExploreIn3D key={`explore-${step.id}`} molecule={step.molecule} />}

        {/* The aside, Source note and report link share rows at the bottom, so a Step fits a phone. */}
        <div className="step-meta">
          {step.aside && <AsideButton key={`aside-${step.id}`} aside={step.aside} stepId={step.id} />}

          {/* Keyed per Step so a new Step opens its Source note collapsed. Numbers cited only in the answer
              (its Hints, reveal or reveal Scene) join the note once it's answered. A Step whose reveal Scene
              prints numbers (Lesson 7's C–N lengths) shows its note only then, which also keeps it on one phone screen. */}
          {/* A graded Step's note waits for the answer key, which says whether it has a reveal Scene (no flicker). */}
          {/* A Step with no secrets (Explain) has nothing to wait for. */}
          {(!secretFields(step.type).length || key) && !("revealScene" in step && step.revealScene && Object.keys(step.revealScene.cited).length && !screen.canContinue) && (
            <SourceNote key={`source-note-${step.id}`} cited={screen.canContinue ? answeredCitations(step) : (step.citations ?? [])} note={step.sourceNote} />
          )}

          <p className="report">
            <a href={reportMistakeHref(unitId, mistakeTarget(lesson.id, step))}>Report a mistake</a>
          </p>
        </div>
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
                {/* Numbers in the data face ("Unit 1 Practice Set"). */}
                {nextLabel.split(/(\d+)/).map((part, i) => (i % 2 ? <span key={i} className="data">{part}</span> : part))}
              </a>
            )}
            <a className={`btn btn-block ${nextHref ? "btn-secondary" : "btn-primary"}`} href={exitHref}>
              Back to Unit
            </a>
          </div>
        ) : screen.ahead && screen.canContinue && screen.index + 1 === screen.total ? (
          // A Step link opened this Wrap ahead of the Student's place: it doesn't finish the Lesson (story 17).
          <button type="button" className="btn btn-primary btn-block" onClick={() => dispatch({ type: "open", stepId: screen.progress.step })}>
            Go to my place
          </button>
        ) : practice && screen.canContinue && screen.index + 1 === screen.total ? (
          <button type="button" className="btn btn-primary btn-block" onClick={() => practice.onFinish(lesson, screen.progress)}>
            See results
          </button>
        ) : screen.canContinue ? (
          <button type="button" className="btn btn-primary btn-block" onClick={next}>
            Continue
          </button>
        ) : view.Foot ? (
          // A Step with no Check: goal-state Manipulate's Continue, Draw arrows' Undo.
          <view.Foot {...viewProps} />
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={check} disabled={!key || !answer}>
            Check
          </button>
        )}
      </div>
    </div>
  );
}

/** The player's classes: a reveal Scene playing, a 3D card on screen, and the Step answered (see global.css). */
function playerClass(on: { revealing: boolean; card: boolean; answered: boolean }): string {
  return ["player", on.revealing && "revealing", on.card && "has-card", on.answered && "answered"].filter(Boolean).join(" ");
}
