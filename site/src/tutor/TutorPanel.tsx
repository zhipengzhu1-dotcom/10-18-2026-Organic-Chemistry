// The Tutor panel (spec #104): the Ask button in the Step player's top bar and the Tutor it
// opens, a sheet on phones and a side panel from 720 px. Dev only: StepPlayer loads it with a
// dynamic import behind `import.meta.env.DEV`, so the build carries none of it.
// It sees the Step only through the Tutor context (./context.ts). It moves the stage only through
// the player's own controls (./stage.ts) and never dispatches engine Actions.
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { PageLesson } from "../lib/answer-key.ts";
import { tutorContext, type TutorScreen } from "./context.ts";
import { MAX_MESSAGE, PANEL_CLASS, TUTOR_PATH, type TutorChoices } from "./contract.ts";
import { chipsFor, digitRuns, enterStep, historyOf, patchLast, type Line } from "./flow.ts";
import { pairOf, parsePick, storedOn, storedPick, storeOn, storePick } from "./settings.ts";
import { clearRings, moveStage, readStage } from "./stage.ts";
import { askTutor } from "./stream.ts";
import "./tutor.css";

/** Text with each digit run in the data face (testing.md: any text with a digit is JetBrains Mono). */
const Digits = ({ text }: { text: string }) => (
  <>
    {digitRuns(text).map((run, i) =>
      run.data ? (
        <span key={i} className="data">
          {run.text}
        </span>
      ) : (
        run.text
      ),
    )}
  </>
);

/** A swipe down the sheet's header closes it past this share of its height… */
const SWIPE_SHARE = 0.3;
/** …or on a flick faster than this (px per ms) at release. */
const FLICK_SPEED = 0.5;
/** A finger still for longer than this (ms) before release isn't a flick. */
const FLICK_WINDOW = 100;

const reducedMotion = () => document.documentElement.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;
/** The sheet is a sheet only on phones; from 720px the panel sits beside the Step and doesn't swipe. */
const isSheet = () => !matchMedia("(min-width: 720px)").matches;

interface Props {
  /** The Lesson as the page carries it (no Answer key). */
  lesson: PageLesson;
  screen: TutorScreen;
  /** What the Student has chosen on this Step so far (picked ids, typed text…). */
  draft?: unknown;
}

export default function TutorPanel({ lesson, screen, draft }: Props) {
  /** The Tutor on/off switch (remembered); off hides the Ask button and the panel. */
  const [on, setOn] = useState(true);
  /** The route's models and efforts (`GET`), and the chosen `model|effort` pair (remembered). */
  const [choices, setChoices] = useState<TutorChoices | null>(null);
  const [pick, setPick] = useState("");
  const [open, setOpen] = useState(false);
  /** Opened from the keyboard (⌘K / Ctrl+K): it appears at once, with no slide or fade. */
  const [instant, setInstant] = useState(false);
  /** The Step shows a Scene (read from the stage once it is on the page). */
  const [scene, setScene] = useState(false);
  const [thread, setThread] = useState<Line[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  /** The finished reply, read once by screen readers (the streaming text isn't). */
  const [announce, setAnnounce] = useState("");
  const askButton = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const threadEnd = useRef<HTMLLIElement>(null);
  const panel = useRef<HTMLElement>(null);
  /** A swipe on the sheet's header: the pointer, where it started, how far down it is, its last move. */
  const swipe = useRef<{ pointer: number; startY: number; dy: number; lastY: number; lastT: number; speed: number } | null>(null);
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortal(document.body);
    setOn(storedOn());
    fetch(TUTOR_PATH)
      .then((r) => r.json() as Promise<TutorChoices>)
      .then((c) => {
        setChoices(c);
        setPick(storedPick(c));
      })
      .catch(() => {});
  }, []);
  // Each new Step: a divider and a scripted intro (no model call).
  const step = lesson.steps[screen.index];
  useEffect(() => {
    setThread((t) => enterStep(t, { number: screen.index + 1, phase: step.phase, type: step.type }));
  }, [step.id]);
  useEffect(() => {
    setScene(readStage().scene);
  }, [step.id, screen.canContinue]);
  // ⌘K / Ctrl+K opens the Tutor (or returns to it) with the field focused; not while it is switched off.
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      setInstant(true);
      setOpen(true);
      field.current?.focus({ preventScroll: true });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [on]);
  useEffect(() => {
    document.documentElement.dataset.tutor = open ? "open" : "closed";
    if (open) field.current?.focus({ preventScroll: true });
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.tutor;
    },
    [],
  );
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "end" });
  }, [thread]);
  // The Tutor's rings belong to the Step they were drawn on.
  useEffect(() => {
    clearRings();
  }, [screen.index]);
  useEffect(
    () => () => {
      clearRings();
    },
    [],
  );

  function close() {
    setOpen(false);
    askButton.current?.focus({ preventScroll: true });
  }

  /** Swipe-to-close on the phone sheet (spec story 2): the sheet follows the finger down from its header. */
  function grab(e: PointerEvent<HTMLElement>) {
    if (!e.isPrimary || e.button !== 0 || !isSheet() || (e.target as Element).closest("button, select, input")) return;
    swipe.current = { pointer: e.pointerId, startY: e.clientY, dy: 0, lastY: e.clientY, lastT: e.timeStamp, speed: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    panel.current!.dataset.dragging = "true";
  }
  function drag(e: PointerEvent<HTMLElement>) {
    const s = swipe.current;
    if (!s || e.pointerId !== s.pointer) return;
    const dt = e.timeStamp - s.lastT;
    if (dt > 0) s.speed = (e.clientY - s.lastY) / dt;
    [s.lastY, s.lastT, s.dy] = [e.clientY, e.timeStamp, Math.max(0, e.clientY - s.startY)];
    // Reduced motion: the sheet stays put under the finger; past the threshold it fades out.
    if (!reducedMotion()) panel.current!.style.transform = `translateY(${s.dy}px)`;
  }
  /** Releases a swipe: past the threshold or on a downward flick it closes, else it settles back. */
  function release(e: PointerEvent<HTMLElement>, cancelled = false) {
    const s = swipe.current;
    if (!s || e.pointerId !== s.pointer) return;
    swipe.current = null;
    const sheet = panel.current!;
    delete sheet.dataset.dragging;
    sheet.style.transform = "";
    const flick = e.timeStamp - s.lastT < FLICK_WINDOW && s.speed > FLICK_SPEED;
    if (!cancelled && s.dy > 0 && (s.dy > sheet.offsetHeight * SWIPE_SHARE || flick)) close();
  }

  /** Switches the Tutor on or off; off closes it, and focus goes to the switch left in the top bar. */
  function switchTo(next: boolean) {
    setOn(next);
    storeOn(next);
    if (!next) setOpen(false);
    requestAnimationFrame(() => askButton.current?.focus({ preventScroll: true }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    send(question);
  }

  async function send(asked: string) {
    const message = asked.trim();
    if (!message || busy) return;
    // The stage as the question shows it: the reply's highlights index this, not the stage when it lands.
    const stage = readStage();
    const context = tutorContext({ lesson, screen, draft, stage });
    const history = historyOf(thread);
    setThread((t) => [...t, { role: "student", text: message }, { role: "tutor", text: "", live: true }]);
    setQuestion("");
    setBusy(true);
    const patch = (line: Partial<Line>) => setThread((t) => patchLast(t, line));
    try {
      await askTutor({ ...parsePick(pick), message, history, context }, (event) => {
        if (event.type === "reply") patch({ text: event.text });
        if (event.type === "done") {
          patch({ text: event.reply, live: false, meta: { model: event.model, effort: event.effort, ms: event.ms } });
          setAnnounce(`Tutor: ${event.reply}`);
          void moveStage(event.actions, stage);
        }
        if (event.type === "error") {
          patch({ text: event.message, live: false, error: true });
          setAnnounce(`Tutor: ${event.message}`);
        }
      });
    } catch {
      const text = "The Tutor couldn't be reached. Is pnpm dev running, with claude signed in?";
      patch({ text, live: false, error: true });
      setAnnounce(text);
    } finally {
      setBusy(false);
    }
  }

  if (!on)
    return (
      <span className="switch tutor-wake">
        <button ref={askButton} type="button" role="switch" aria-checked="false" aria-label="Tutor" title="Switch the Tutor on" onClick={() => switchTo(true)} />
      </span>
    );

  return (
    <>
      <button
        ref={askButton}
        type="button"
        className="tutor-ask label"
        aria-expanded={open}
        aria-controls="tutor"
        onClick={() => {
          if (open) return close();
          setInstant(false);
          setOpen(true);
        }}
      >
        Ask
      </button>
      {portal &&
        createPortal(
          <>
            <div className="tutor-scrim" data-open={open} data-instant={instant} onClick={close} aria-hidden="true" />
            <section ref={panel} id="tutor" className={PANEL_CLASS} data-open={open} data-instant={instant} inert={!open} aria-label="Tutor">
              <header className="tutor-head" onPointerDown={grab} onPointerMove={drag} onPointerUp={(e) => release(e)} onPointerCancel={(e) => release(e, true)}>
                <h2 className="label">Tutor</h2>
                {choices && (
                  <select
                    className="tutor-pick"
                    aria-label="Model and effort"
                    value={pick}
                    onChange={(e) => {
                      setPick(e.target.value);
                      storePick(e.target.value);
                    }}
                  >
                    {Object.entries(choices.models).flatMap(([id, label]) =>
                      choices.efforts.map((effort) => (
                        <option key={pairOf(id, effort)} value={pairOf(id, effort)}>
                          {label} · {effort}
                        </option>
                      )),
                    )}
                  </select>
                )}
                <span className="switch tutor-switch">
                  <span id="tutor-switch-l" className="sr">
                    Tutor on
                  </span>
                  <button type="button" role="switch" aria-checked="true" aria-labelledby="tutor-switch-l" onClick={() => switchTo(false)} />
                </span>
                <button type="button" className="tutor-close" aria-label="Close the Tutor" onClick={close}>
                  ✕
                </button>
              </header>
              <ol className="tutor-thread" aria-label="Conversation">
                {thread.map((t, i) =>
                  t.role === "divider" ? (
                    <li key={i} className="tutor-divider label">
                      <Digits text={t.text} />
                    </li>
                  ) : (
                    <li key={i} className={`tutor-turn ${t.role}${t.error ? " error" : ""}`}>
                      <span className="tutor-who label">{t.role === "student" ? "You" : t.error ? "! Tutor problem" : "Tutor"}</span>
                      <p>
                        <Digits text={t.text || (t.live ? "Writing…" : "")} />
                      </p>
                      {t.meta && (
                        <small className="tutor-meta">
                          <Digits text={t.meta.model} /> · {t.meta.effort} effort · <span className="data">{(t.meta.ms / 1000).toFixed(1)}</span> s
                        </small>
                      )}
                    </li>
                  ),
                )}
                <li ref={threadEnd} className="tutor-end" aria-hidden="true" />
              </ol>
              <p className="sr" aria-live="polite">
                {announce}
              </p>
              <div className="tutor-chips" role="group" aria-label="Suggestions">
                {chipsFor({ type: step.type, revealed: screen.canContinue, scene }).map((chip) => (
                  <button key={chip} type="button" className="tutor-chip" disabled={busy} onClick={() => send(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
              <form className="tutor-form" onSubmit={submit}>
                <input
                  ref={field}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={MAX_MESSAGE}
                  placeholder="Ask about this Step…"
                  aria-label="Ask the Tutor"
                />
                <button type="submit" className="btn btn-primary" disabled={busy || !question.trim()}>
                  Send
                </button>
              </form>
            </section>
          </>,
          portal,
        )}
    </>
  );
}
