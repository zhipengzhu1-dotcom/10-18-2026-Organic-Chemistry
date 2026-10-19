// The homepage Push hero (#73): OH⁻ + H⁺, live. The visitor drags the O lone
// pair onto H⁺ (or Tab, Enter, Enter) and water forms. Graded in the browser by
// `@astratron/content/arrows` on the Subject's hero task; no Lesson, no engine.
import { useState } from "react";
import type { HeroPush } from "@astratron/content";
import { arrowsAct, arrowsStart, arrowsView } from "@astratron/content/arrows";
import DrawArrows from "./DrawArrows.tsx";

export default function PushHero({ task }: { task: HeroPush }) {
  const [state, setState] = useState(arrowsStart);
  const view = arrowsView(task, state);
  const miss = state.last?.kind === "wrong" ? state.last.hint : undefined;

  return (
    <div className="push-hero">
      <DrawArrows
        start={task.start}
        pushes={state.pushes}
        structure={view.structure}
        flags={view.flags}
        last={state.last}
        locked={state.done}
        onPush={(push) => setState((s) => arrowsAct(task, s, { push }))}
        onUndo={() => setState((s) => arrowsAct(task, s, { undo: true }))}
      />
      <p className="push-hero-msg" role="status">
        {state.done ? (
          <>
            <b className="push-hero-done">✓ You just made water.</b> That drag was a curved arrow. All of organic chemistry is
            built from moves like it.
          </>
        ) : miss ? (
          miss
        ) : (
          <>
            <b>Try it:</b> drag an electron pair from <span className="data">O</span> onto <span className="data">H⁺</span>.
          </>
        )}
      </p>
    </div>
  );
}
