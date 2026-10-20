// Goal-state Manipulate: the Student works the Scene itself, stage by stage; no Check. Continue
// opens when the last stage is done; tapped before then, or after a while with no move, the
// stage's Hints answer.
import { useEffect } from "react";
import GoalScene from "../GoalScene.tsx";
import { Prompt, type View, type ViewProps } from "./view.tsx";

export const manipulateGoal: View<"manipulate-goal"> = {
  // The prompt of the stage on screen.
  Lead: ({ state, waiting }) => <Prompt text={state.goal.prompt} waiting={waiting} />,
  Scene: (props) => <WorkedScene {...props} />,
  Foot: ({ nudge }) => (
    <button type="button" className="btn btn-primary btn-block" aria-disabled="true" onClick={() => nudge("early")}>
      Continue
    </button>
  ),
};

function WorkedScene({ step, screen, state, keyed, submit, nudge }: ViewProps<"manipulate-goal">) {
  const { goal } = state;
  // After `idleSeconds` with no move, the stage's idle Hint (the second also nudges).
  const idle = !screen.canContinue && keyed ? step.idleSeconds : 0;
  useEffect(() => {
    if (!idle) return;
    const timer = setTimeout(() => nudge("idle"), idle * 1000);
    return () => clearTimeout(timer);
  }, [idle, step.id, goal.state, goal.idle, goal.stage]);

  return (
    // Keyed per Step.
    <GoalScene
      key={`goal-${step.id}`}
      sceneId={step.scene.id}
      state={goal.state}
      cited={step.scene.cited}
      nudge={goal.idle >= 2}
      locked={screen.canContinue || !keyed}
      onMove={submit}
    />
  );
}
