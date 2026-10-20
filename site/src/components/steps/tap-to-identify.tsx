// Tap-to-identify: the Student taps atoms, bonds or regions of the drawing.
import { PushReplayPlayer } from "../PushReplayPlayer.tsx";
import StructureTap from "../StructureTap.tsx";
import { StepPrompt, toggle, type View } from "./view.tsx";

export const tapToIdentify: View<"tap-to-identify"> = {
  Lead: StepPrompt,
  choice: (_step, draft) => draft ?? [],
  fresh: true,
  // A Tap Step with figures (#78), once answered or hinted: phones drop the prompt.
  dropsPrompt: (step) => !!step.figures,
  Drawing: ({ step, screen, revealing, choice, choose }) => (
    <>
      {step.alt && <p className="sr">{step.alt}</p>}
      {/* A Tap Step whose answer comes from a push (Lesson 7): once answered, the replay takes the drawing's place. */}
      {screen.canContinue && step.replay && (
        <PushReplayPlayer key={`replay-${step.id}`} start={step.replay.start} pushes={step.replay.pushes} />
      )}
      {!revealing && !(screen.canContinue && step.replay) && (
        <StructureTap
          step={step}
          picked={choice}
          answer={screen.feedback?.kind === "reveal" && Array.isArray(screen.feedback.answer) ? (screen.feedback.answer as string[]) : []}
          locked={screen.canContinue}
          onToggle={(id) => choose(toggle(choice, id, false))}
        />
      )}
    </>
  ),
};
