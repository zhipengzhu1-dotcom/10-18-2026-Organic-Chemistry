// push-replay in a Step: the pushes played on the start in the site's Scene
// frame (autoplay once; under reduced motion it waits on the result for Play).
import type { Hidden, Push, Structure } from "@astratron/content";
import { describeReplay, PushReplay, replayDuration } from "@astratron/scenes";
import { ClockedFrame } from "./ScenePlayer.tsx";

interface Props {
  start: Structure;
  pushes: Push[];
  hide?: Hidden[];
}

export function PushReplayPlayer({ start, pushes, hide }: Props) {
  const duration = replayDuration(pushes);
  return (
    <ClockedFrame
      duration={duration}
      // The poster is the end: the result with every arrow drawn on the way.
      posterT={duration}
      describe={(t) => describeReplay(start, pushes, t)}
      render={(t, reducedMotion) => <PushReplay t={t} start={start} pushes={pushes} hide={hide} reducedMotion={reducedMotion} />}
    />
  );
}
