// The video module (ADR 0001): renders interactive Scenes from the registry
// through Remotion, writes sources sidecars, prints Step links. Never shipped
// to Students; nothing in site/ or scenes/ imports it. Commands: cli.ts.
export { FPS, videoJobs, type VideoJob } from "./jobs.ts";
export { citedFor } from "./cited.ts";
export { sourcesSidecar, type Sidecar, type SidecarNumber } from "./sidecar.ts";
export { formatLinks, lessonLinks, promptOpening, type StepLink } from "./links.ts";
export { remotionDependencies, remotionInFiles } from "./site-check.ts";
