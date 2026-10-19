// The Scene registry, shared by the site and the video renderer (ADR 0001).
// Empty in the walking skeleton; the Scene system ticket (#64) fills it.
export const sceneRegistry: Record<string, never> = {};

export { BOND_PX, drawStructure, type Drawing, type Point, type Segment } from "./structure/render.ts";
