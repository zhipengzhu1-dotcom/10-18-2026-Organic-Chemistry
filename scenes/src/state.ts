import type { SceneManifest, SceneState } from "./types.ts";

/** Every settable state at its manifest default. */
export function defaultState<S extends SceneState>(m: SceneManifest<S>): S {
  return Object.fromEntries(Object.entries(m.states).map(([k, spec]) => [k, (spec as { default: unknown }).default])) as S;
}
