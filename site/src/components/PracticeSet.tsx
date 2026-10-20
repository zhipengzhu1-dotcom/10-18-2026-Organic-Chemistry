// The Practice Set island: draws a Set in the browser (a retake avoids the last
// draw), plays it in the Step player, then shows the summary with Retry missed,
// Next Unit and Suggest a Problem. The rules live in engine/practice-set.ts.
import { useEffect, useState } from "react";
import { drawSet, pinnedSet, roundOf, summarize, type Summary } from "../engine/practice-set.ts";
import type { PageLesson } from "../lib/answer-key.ts";
import type { PageProblem } from "../lib/practice.ts";
import { suggestProblemHref } from "../lib/submit-links.ts";
import { finishPractice, practiceOf, startPractice } from "../progress/record.ts";
import { readRecord, writeRecord } from "../progress/store.ts";
import StepPlayer from "./StepPlayer.tsx";

interface Props {
  unitId: string;
  /** The drawable Problems, without answers. */
  problems: PageProblem[];
  /** The Unit's core Lesson ids in order. */
  coreLessons: string[];
  /** The Practice Set answer key, by Problem id. */
  keyUrl: string;
  unitHref: string;
  nextUnitHref: string;
}

type Phase =
  | { kind: "drawing" }
  /** `round` counts rounds, so each one mounts a fresh player. */
  | { kind: "playing"; ids: string[]; round: number }
  | { kind: "summary"; summary: Summary; round: number };

export default function PracticeSet({ unitId, problems, coreLessons, keyUrl, unitHref, nextUnitHref }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "drawing" });

  // The draw is random and avoids the last one, so it happens in the browser. `?problems=…` pins it.
  useEffect(() => {
    const record = readRecord();
    const entries = problems.map((p) => p.entry);
    const ids =
      pinnedSet(window.location.search, entries.map((e) => e.id)) ??
      drawSet(entries, coreLessons, { previous: practiceOf(record, unitId).draw });
    writeRecord(startPractice(record, unitId, ids));
    setPhase({ kind: "playing", ids, round: 1 });
  }, [problems, coreLessons, unitId]);

  if (phase.kind === "drawing") {
    return (
      <div className="player">
        <main className="player-body">
          <p role="status">Drawing your Problems…</p>
        </main>
      </div>
    );
  }

  if (phase.kind === "playing") {
    const round: PageLesson = {
      ...PRACTICE_LESSON,
      id: `practice-${unitId}`,
      steps: roundOf(problems.map((p) => p.step), phase.ids).steps,
    };
    return (
      <StepPlayer
        key={phase.round}
        lesson={round}
        keyUrl={keyUrl}
        exitHref={unitHref}
        unitId={unitId}
        practice={{
          onFinish: (played, progress) => {
            writeRecord(finishPractice(readRecord(), unitId));
            setPhase({ kind: "summary", summary: summarize(played, progress), round: phase.round });
          },
        }}
      />
    );
  }

  const { summary } = phase;
  const { total, firstTry, firstTryPercent, eventuallyCorrect, missed } = summary;
  // The summary keeps the player's shape: the results card in the body, the actions in the foot.
  return (
    <section className="player practice-summary" aria-labelledby="practice-results">
      <main className="player-body">
        <div className="card">
          <h1 id="practice-results">Practice Set results</h1>
          <ul className="practice-stats">
            <li className="data">
              First try: {firstTry}/{total} ({firstTryPercent}%)
            </li>
            <li className="data">
              Eventually correct: {eventuallyCorrect}/{total}
            </li>
          </ul>
          <p>
            {missed.length === 0 ? (
              "Nothing missed. Nice work."
            ) : (
              <>
                <span className="data">{missed.length}</span> missed. Retry them now, or come back later for a fresh Set.
              </>
            )}
          </p>
        </div>
        <p className="suggest">
          Know a good Problem for this Unit? <a href={suggestProblemHref(unitId)}>Suggest a Problem</a>
        </p>
      </main>
      <div className="player-foot">
        <div className="player-end">
          {missed.length > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => setPhase({ kind: "playing", ids: missed, round: phase.round + 1 })}
            >
              Retry missed <span className="data">({missed.length})</span>
            </button>
          )}
          <a className={`btn btn-block ${missed.length > 0 ? "btn-secondary" : "btn-primary"}`} href={nextUnitHref}>
            Next Unit
          </a>
          <a className="btn btn-secondary btn-block" href={unitHref}>
            Back to Unit
          </a>
        </div>
      </div>
    </section>
  );
}

/** The Lesson fields the Step player doesn't use for a Practice Set round. */
const PRACTICE_LESSON: Omit<PageLesson, "id" | "steps"> = {
  slug: "practice",
  title: "Practice Set",
  goal: "",
  keyIdea: "",
  onRamp: false,
  number: 0,
  capstone: false,
  signature: "multiple-choice",
  phases: { hook: 0, build: 0, check: 0, wrap: 0 },
  url: "",
};
