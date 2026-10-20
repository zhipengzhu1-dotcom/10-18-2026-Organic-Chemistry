// Manipulate a Scene: a slider under the Step's Scene drives one of its settable states.
import { watchScene } from "@astratron/scenes/watch";
import SceneControl from "../SceneControl.tsx";
import ScenePlayer from "../ScenePlayer.tsx";
import { StepPrompt, type View } from "./view.tsx";

export const manipulate: View<"manipulate"> = {
  Lead: StepPrompt,
  // The control's value; the reveal jumps it to the answer (and a resumed right answer shows it there too).
  choice: (step, draft, screen) =>
    screen.feedback?.kind === "reveal" || screen.feedback?.kind === "correct" ? step.answer : (draft ?? step.scene.state[step.control]),
  Scene: ({ step, screen, revealing, choice, choose }) =>
    !revealing &&
    !watchScene(step.scene.id) && (
      // Keyed per Step so entering a Step starts its Scene afresh (autoplay on entry).
      <ScenePlayer
        key={`scene-${step.id}`}
        sceneId={step.scene.id}
        state={{ ...step.scene.state, [step.control]: choice }}
        cited={step.scene.cited}
        still={step.scene.still}
      >
        {choice !== undefined && (
          <SceneControl sceneId={step.scene.id} control={step.control} value={choice} onChange={choose} locked={screen.canContinue} />
        )}
      </ScenePlayer>
    ),
};
