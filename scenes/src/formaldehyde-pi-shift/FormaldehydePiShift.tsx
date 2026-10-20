// formaldehyde-pi-shift: a pure function of t; see manifest.ts. The arrow
// draws itself with a riding electron pair, the drawing updates (atoms stay
// put), then the start and the result settle side by side in brackets.
import { replay, toStructure } from "@astratron/content/arrows";
import { frameSize, safeArea } from "../frame.ts";
import { Arrow, ArrowHead, fit, ink, Placed } from "../lesson-06/draw.tsx";
import { lesson6Structures } from "../lesson-06/structures.ts";
import { easeInOut, progress } from "../motion.ts";
import { PUSH_SECONDS } from "../push-replay/PushReplay.tsx";
import { drawContributors } from "../structure/contributors.ts";
import { drawStructure } from "../structure/render.ts";
import type { SceneProps } from "../types.ts";
import { SHIFT } from "./manifest.ts";

const start = lesson6Structures.formaldehyde;
const push = { from: "b1", to: "a2" };
const result = toStructure(replay(start, [push]).at(-1)!.molecule);
const before = drawStructure(start);
const after = drawStructure(result);
const pair = drawContributors([before, after]);

export default function FormaldehydePiShift({ t, aspect, reducedMotion }: SceneProps<Record<string, never>>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const single = fit(before.width, before.height, area, 4);
  const both = fit(pair.width, pair.height, area, 4);
  const draw = reducedMotion ? (t > 0 ? 1 : 0) : easeInOut(progress(t, 0.2, 0.2 + PUSH_SECONDS * 0.7));
  const pushed = t >= 0.2 + PUSH_SECONDS;
  const settle = easeInOut(progress(t, SHIFT.pairFrom, SHIFT.pairTo));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block", color: ink }}>
      <defs>
        <ArrowHead id="formaldehyde-pi-shift-head" />
      </defs>
      {settle < 1 && (
        <g opacity={1 - settle}>
          <Placed svg={(pushed ? after : before).svg} at={single} />
          {!pushed && <Arrow drawing={before} structure={start} push={push} at={single} progress={draw} head="formaldehyde-pi-shift-head" />}
        </g>
      )}
      {settle > 0 && <Placed svg={pair.svg} at={both} opacity={settle} />}
    </svg>
  );
}
