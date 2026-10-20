// Draw arrows: the Student pushes electrons on the start, one arrow at a time, each graded as it
// lands; no Check. On success (or the reveal) the Step's Scene plays in place of the drawing,
// else push-replay of the arrows.
import DrawArrows from "../DrawArrows.tsx";
import { PushReplayPlayer } from "../PushReplayPlayer.tsx";
import { StepPrompt, type View } from "./view.tsx";

export const drawArrows: View<"draw-arrows"> = {
  Lead: StepPrompt,
  sceneOnceDone: true,
  Drawing: ({ step, screen, state, keyed, submit }) =>
    screen.canContinue ? (
      !step.scene && (
        <PushReplayPlayer key={`replay-${step.id}`} start={step.start.structure} hide={step.start.hide} pushes={state.arrows.pushes.map((p) => p.push)} />
      )
    ) : (
      <DrawArrows
        key={`arrows-${step.id}`}
        start={step.start.structure}
        hide={step.start.hide}
        marks={step.start.highlight?.marks}
        pushes={state.arrows.pushes}
        structure={state.arrows.structure}
        flags={state.arrows.flags}
        last={state.arrows.last}
        target={step.target}
        locked={screen.canContinue || !keyed}
        onPush={submit}
        onUndo={() => submit("undo")}
      />
    ),
  // The one foot button undoes the last arrow.
  Foot: ({ state, keyed, submit }) => (
    <button type="button" className="btn btn-secondary btn-block" onClick={() => submit("undo")} disabled={!keyed || !state.arrows.pushes.length}>
      Undo arrow
    </button>
  ),
};
