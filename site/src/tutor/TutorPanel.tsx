// The Tutor panel (spec #104): the Ask button in the Step player's top bar and the Tutor it
// opens, a sheet on phones and a side panel from 720 px. Dev only: StepPlayer loads it with a
// dynamic import behind `import.meta.env.DEV`, so the build carries none of it.
// It sees the Step only through the Tutor context (./context.ts). It moves the stage only through
// the player's own controls (./stage.ts) and never dispatches engine Actions.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { PageLesson } from "../lib/answer-key.ts";
import { tutorContext, type TutorScreen } from "./context.ts";
import { PANEL_CLASS, type Turn } from "./contract.ts";
import { clearRings, moveStage, readStage } from "./stage.ts";
import { askTutor } from "./stream.ts";
import "./tutor.css";

interface Props {
  /** The Lesson as the page carries it (no Answer key). */
  lesson: PageLesson;
  screen: TutorScreen;
  /** What the Student has chosen on this Step so far (picked ids, typed text…). */
  draft?: unknown;
}

/** A thread line: a Student or Tutor turn; `live` while the reply is being written. */
type Line = Turn & { live?: boolean; error?: boolean };

export default function TutorPanel({ lesson, screen, draft }: Props) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<Line[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  /** The finished reply, read once by screen readers (the streaming text isn't). */
  const [announce, setAnnounce] = useState("");
  const askButton = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const threadEnd = useRef<HTMLLIElement>(null);
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortal(document.body);
  }, []);
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

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = question.trim();
    if (!message || busy) return;
    const history = thread.filter((t) => !t.error).map(({ role, text }) => ({ role, text }));
    const context = tutorContext({ lesson, screen, draft, stage: readStage() });
    setThread((t) => [...t, { role: "student", text: message }, { role: "tutor", text: "", live: true }]);
    setQuestion("");
    setBusy(true);
    const patch = (line: Partial<Line>) => setThread((t) => [...t.slice(0, -1), { ...t[t.length - 1], ...line }]);
    try {
      await askTutor({ message, history, context }, (event) => {
        if (event.type === "reply") patch({ text: event.text });
        if (event.type === "done") {
          patch({ text: event.reply, live: false });
          setAnnounce(`Tutor: ${event.reply}`);
          void moveStage(event.actions);
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

  return (
    <>
      <button
        ref={askButton}
        type="button"
        className="tutor-ask label"
        aria-expanded={open}
        aria-controls="tutor"
        onClick={() => (open ? close() : setOpen(true))}
      >
        Ask
      </button>
      {portal &&
        createPortal(
          <>
            <div className="tutor-scrim" data-open={open} onClick={close} aria-hidden="true" />
            <section id="tutor" className={PANEL_CLASS} data-open={open} inert={!open} aria-label="Tutor">
              <header className="tutor-head">
                <h2 className="label">Tutor</h2>
                <button type="button" className="tutor-close" aria-label="Close the Tutor" onClick={close}>
                  ✕
                </button>
              </header>
              <ol className="tutor-thread" aria-label="Conversation">
                {thread.length === 0 && (
                  <li className="tutor-empty">Ask about this Step. I'll point you at the evidence, not the answer.</li>
                )}
                {thread.map((t, i) => (
                  <li key={i} className={`tutor-turn ${t.role}${t.error ? " error" : ""}`}>
                    <span className="tutor-who label">{t.role === "student" ? "You" : "Tutor"}</span>
                    <p>{t.text || (t.live ? "Writing…" : "")}</p>
                  </li>
                ))}
                <li ref={threadEnd} className="tutor-end" aria-hidden="true" />
              </ol>
              <p className="sr" aria-live="polite">
                {announce}
              </p>
              <form className="tutor-form" onSubmit={send}>
                <input
                  ref={field}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={2000}
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
