// Replays a Scene's stored video timeline (ADR 0001): the state at any time,
// so the video module renders a Scene with no input.
import { defaultState } from "./state.ts";
import type { SceneManifest, SceneState } from "./types.ts";

/**
 * The state at `t` seconds into the video. Each state starts at its default;
 * a keyframe sets it from its `at`. Range states ease linearly from one
 * keyframe that sets them to the next; choice states hold until the next.
 */
export function stateAt<S extends SceneState>(manifest: SceneManifest<S>, t: number): S {
  const state: SceneState = { ...defaultState(manifest) };
  for (const name of Object.keys(manifest.states)) {
    const keys = manifest.video.timeline.filter((k) => k.state[name] !== undefined);
    const before = keys.filter((k) => k.at <= t).at(-1);
    if (!before) continue;
    const from = before.state[name]!;
    const after = keys.find((k) => k.at > t);
    state[name] =
      after && manifest.states[name].kind === "range" && typeof from === "number"
        ? from + ((Number(after.state[name]) - from) * (t - before.at)) / (after.at - before.at)
        : from;
  }
  return state as S;
}
