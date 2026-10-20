// The Step player island: renders the engine's Screen and turns clicks into
// engine Actions. All rules live in the engine; this file only draws.
// The page carries the Lesson without its answers (spec story 99); the answer
// key is fetched from its own built file, and nothing is checked until it arrives.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { NumericStep, RankStep, SceneValue, Structure } from "@astratron/content";
import { act, start, type Action, type Answer, type LessonProgress, type PlayableLesson, type Screen } from "../engine/player.ts";
import { withKey, type AnswerKey, type PageLesson } from "../lib/answer-key.ts";
import { mistakeTarget, reportMistakeHref } from "../lib/submit-links.ts";
import { recordProblem, saveLesson, streakOn } from "../progress/record.ts";
import { readRecord, writeRecord } from "../progress/store.ts";
import SourceNote from "./SourceNote.tsx";
import ScenePlayer from "./ScenePlayer.tsx";
import WatchScenePlayer from "./WatchScenePlayer.tsx";
import GoalScene from "./GoalScene.tsx";
import { watchScene } from "@astratron/scenes/watch";
import SceneControl from "./SceneControl.tsx";
import StructureTap from "./StructureTap.tsx";
import MoleculeCard from "../molecule/MoleculeCard.tsx";
import MoleculeSwitch from "../molecule/MoleculeSwitch.tsx";
import { AsideButton, Figures } from "./StepVisuals.tsx";
import ExploreIn3D from "../explore/ExploreIn3D.tsx";
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
 * where the progress says; with no `saved` it keeps the progress on screen.
 */
type PlayerAction = Action | { type: "open"; stepId?: string; saved?: LessonProgress };

const html = (text: string) => ({ dangerouslySetInnerHTML: { __html: text } });

export default function StepPlayer({ lesson: page, keyUrl, exitHref, unitId, nextHref, nextLabel = "Next Lesson", practice }: Props) {
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
  /** The graded Step whose watch-only video is playing now (its prompt waits until it stops). */
  const [introPlaying, setIntroPlaying] = useState<string | null>(null);
  const { step, feedback } = screen;
  const pageStep = page.steps[screen.index];
  const single = (pageStep.type === "multiple-choice" || pageStep.type === "rotate-and-identify") && pageStep.select === "one";

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

  // Goal-state Manipulate: after `idleSeconds` with no move, the stage's idle Hint (the second also nudges).
  const goalIdle = step.type === "manipulate-goal" && screen.goal && !screen.canContinue && key ? step.idleSeconds : 0;
  useEffect(() => {
    if (!goalIdle) return;
    const timer = setTimeout(() => dispatch({ type: "idle" }), goalIdle * 1000);
    return () => clearTimeout(timer);
  }, [goalIdle, step.id, screen.goal?.state, screen.goal?.idle, screen.goal?.stage]);

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
  const revealScene = step.type !== "explain" && screen.canContinue ? step.revealScene : undefined;
  /** A 3D Step card is on screen (phones lay these Steps out tighter: see .player.has-card). */
  const hasCard = "molecule" in step && !!step.molecule?.card && !revealScene;
  const sceneState =
    step.type === "manipulate" && setting !== undefined ? { ...step.scene.state, [step.control]: setting } : step.scene?.state;

  const answer: Answer | null =
    step.type === "multiple-choice" || step.type === "rotate-and-identify" || step.type === "tap-to-identify"
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
    <div
      className={playerClass({
        revealing: !!revealScene,
        card: hasCard,
        // A Tap Step with figures (#78) or a 3D Step (#81), once answered: phones drop the prompt.
        answered: (!!feedback && step.type === "tap-to-identify" && !!step.figures) || (hasCard && screen.canContinue),
      })}
      id={step.id}
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
      </div>

      <main className="player-body">
        {step.type === "explain" ? (
          <p {...html(step.text)} />
        ) : (
          // A goal-state Manipulate Step shows the prompt of the stage on screen. While a Hook's
          // video plays, its question waits (still read to screen readers), as the spec has it.
          <p
            className={introPlaying === step.id ? "player-prompt sr" : "player-prompt"}
            {...html(screen.goal?.prompt ?? step.prompt)}
          />
        )}

        {/* Once a reveal Scene plays, it shows the answer in place of the question's widgets. */}
        {step.figures && !revealScene && !(hasCard && "molecule" in step && step.molecule?.toggle) && <Figures figures={step.figures} />}

        {step.type === "tap-to-identify" && step.alt && <p className="sr">{step.alt}</p>}
        {step.type === "tap-to-identify" && !revealScene && (
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
            marks={step.start.highlight?.marks}
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

        {!revealScene && step.scene && watchScene(step.scene.id) && (step.type !== "draw-arrows" || screen.canContinue) && (
          // A watch-only Scene (#66): the committed video, keyed per Step so it autoplays on entry.
          <WatchScenePlayer
            key={`scene-${step.id}`}
            sceneId={step.scene.id}
            cited={step.scene.cited}
            shrinkWhenDone={step.type !== "explain"}
            onPlaying={(playing) => setIntroPlaying(playing && step.type !== "explain" ? step.id : null)}
          />
        )}

        {step.type === "manipulate-goal" && screen.goal && (
          // Goal-state Manipulate: the Student works the Scene itself; keyed per Step.
          <GoalScene
            key={`goal-${step.id}`}
            sceneId={step.scene.id}
            state={screen.goal.state}
            cited={step.scene.cited}
            nudge={screen.goal.idle >= 2}
            locked={screen.canContinue || !key}
            onMove={(patch) => dispatch({ type: "answer", state: patch })}
          />
        )}

        {!revealScene && step.type !== "manipulate-goal" && step.scene && sceneState && !watchScene(step.scene.id) && (step.type !== "draw-arrows" || screen.canContinue) && (
          // Keyed per Step so entering a Step starts its Scene afresh (autoplay on entry).
          <ScenePlayer
            key={`scene-${step.id}`}
            sceneId={step.scene.id}
            state={sceneState}
            cited={step.scene.cited}
            loop={step.type === "manipulate"}
            still={step.scene.still}
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

        {step.type === "rotate-and-identify" && !revealScene && (
          <div className={shortOptions(step.options) ? "opts opts-pairs" : "opts"} role="group" aria-label="Choices">
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
        )}

        {step.type === "multiple-choice" && !revealScene && (
          // Short text choices sit as chips: many to a row for one-word choices, two to a row under a figure.
          <div className={["opts", chips(step)].filter(Boolean).join(" ")} role="group" aria-label="Choices">
            {step.options.map((o) =>
              o.structure ? (
                // A structure card: the drawing is pre-rendered SVG; its text is the screen-reader label.
                <button
                  key={o.id}
                  type="button"
                  className={`opt structure-card${pairCard(o.structure.structure) ? " structure-card-wide" : ""}`}
                  aria-pressed={chosen.includes(o.id)}
                  disabled={screen.canContinue}
                  onClick={() => pick(o.id)}
                >
                  {/* The name comes from this hidden text, not aria-label: the drawing's letters (N, OH…)
                      would otherwise be visible text missing from the name (WCAG 2.5.3 Label in Name). */}
                  <span className="sr">{o.text}</span>
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

        {step.type === "numeric" && !revealScene && (
          <NumericBox step={step} value={draft} onChange={setDraft} onSubmit={check} locked={screen.canContinue} />
        )}

        {step.type === "rank" && !revealScene && (
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

        {"molecule" in step && step.molecule && <ExploreIn3D key={`explore-${step.id}`} molecule={step.molecule} />}

        {/* The aside, Source note and report link share rows at the bottom, so a Step fits a phone. */}
        <div className="step-meta">
          {step.aside && <AsideButton key={`aside-${step.id}`} aside={step.aside} stepId={step.id} />}

          {/* Keyed per Step so a new Step opens its Source note collapsed. */}
          <SourceNote key={`source-note-${step.id}`} cited={step.citations ?? []} note={step.sourceNote} />

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
        ) : practice && screen.canContinue && screen.index + 1 === screen.total ? (
          <button type="button" className="btn btn-primary btn-block" onClick={() => practice.onFinish(lesson, screen.progress)}>
            See results
          </button>
        ) : screen.canContinue ? (
          <button type="button" className="btn btn-primary btn-block" onClick={next}>
            Continue
          </button>
        ) : step.type === "manipulate-goal" ? (
          // No Check: Continue opens when the last stage is done; tapped before then it gives the stage's Hint.
          <button type="button" className="btn btn-primary btn-block" aria-disabled="true" onClick={() => dispatch({ type: "continue" })}>
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

/** The player's classes: a reveal Scene playing, a 3D card on screen, and the Step answered (see global.css). */
function playerClass(on: { revealing: boolean; card: boolean; answered: boolean }): string {
  return ["player", on.revealing && "revealing", on.card && "has-card", on.answered && "answered"].filter(Boolean).join(" ");
}

/** Choices short enough (plain words, e.g. "bent", "BF₃ only") to sit two to a row. */
const SHORT_OPTION = 24;
export const shortOptions = (options: { text: string }[]) => options.every((o) => o.text.replace(/<[^>]*>/g, "").length <= SHORT_OPTION);

/** Short text for a chip, and a single word or two: under this many characters (HTML tags aside). */
const CHIP_TEXT = 42;
const WORD_TEXT = 12;

/**
 * How text choices are laid out: as word chips, as many to a row as fit (six or more one-word choices,
 * e.g. group names), or two to a row (short choices under a figure); else one to a row.
 */
function chips(step: { options: { text: string; structure?: unknown }[]; figures?: unknown[] }): string | undefined {
  if (step.options.some((o) => o.structure)) return undefined;
  const longest = Math.max(...step.options.map((o) => o.text.replace(/<[^>]*>/g, "").length));
  if (step.options.length >= 6 && longest < WORD_TEXT) return "opts-words";
  if (step.options.length >= 6 || (step.figures && longest < CHIP_TEXT)) return "opts-chips";
  return undefined;
}

/** A card that draws two molecules side by side (a "pair" card): such cards get a row each. */
function pairCard(structure: Structure): boolean {
  const seen = new Set([structure.atoms[0]?.id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const b of structure.bonds)
      if (seen.has(b.a) !== seen.has(b.b)) {
        seen.add(b.a).add(b.b);
        grew = true;
      }
  }
  return seen.size < structure.atoms.length;
}

/** Reads what the Student typed: accepts a comma decimal and a typographic minus; NaN when it isn't a number. */
function parseNumber(text: string): number {
  const t = text.trim().replace(/−/g, "-").replace(",", ".");
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : Number.NaN;
}

/** "+1" ↔ "−1", "1" → "−1", "" → "−". */
export function flipSign(text: string): string {
  const t = text.trim();
  if (/^[-−]/.test(t)) return t.slice(1);
  return `−${t.replace(/^\+/, "")}`;
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
      {step.signKey && (
        // Phone number pads have no minus sign: the ± key flips the sign of what is typed.
        <button
          type="button"
          className="btn btn-secondary numeric-sign"
          aria-label="Change sign"
          disabled={locked}
          onClick={() => onChange(flipSign(value))}
        >
          ±
        </button>
      )}
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
