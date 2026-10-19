// The Remotion root (ADR 0001: Remotion is only the video renderer). One
// composition per registered Scene × aspect, from videoJobs, so the renders
// and the CLI agree. Each frame is the Scene at t = frame / 60 with the state
// its stored timeline gives at t: no input, nothing else.
import { AbsoluteFill, Composition, useCurrentFrame, useVideoConfig } from "remotion";
import type { CSSProperties } from "react";
import type { Cited } from "@astratron/content/data";
import { sceneRegistry, stateAt, type Aspect } from "@astratron/scenes";
import { sceneManifests } from "@astratron/scenes/manifests";
import { videoJobs } from "../jobs.ts";

export interface FrameProps extends Record<string, unknown> {
  sceneId: string;
  aspect: Aspect;
  /** The Scene's cited values, looked up in Node by the render CLI (the bundle has no file access). */
  cited: Record<string, Cited>;
}

// The dark Arcade Cosmos tokens Scenes read through CSS variables (design tokens, #59).
const tokens = {
  "--at-space": "#0d0626",
  "--at-surface": "#1a0f3d",
  "--at-line": "#6a4bd1",
  "--at-ink": "#ffffff",
  "--at-ink-muted": "#b9a8e8",
  "--at-electron": "#3ee8ff",
  "--at-ignite": "#ff9a1f",
  "--at-boss": "#ff5fd8",
  "--at-font-text": '"Space Grotesk", system-ui, sans-serif',
  "--at-font-data": '"JetBrains Mono", ui-monospace, monospace',
  background: "var(--at-space)",
  // The site's text font; until its font files are bundled here, the system sans stands in.
  fontFamily: "var(--at-font-text)",
} as CSSProperties;

export function SceneFrame({ sceneId, aspect, cited }: FrameProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = sceneRegistry[sceneId];
  if (!scene) throw new Error(`No Scene "${sceneId}" in the registry`);
  const t = frame / fps;
  const { Component, manifest } = scene;
  return (
    <AbsoluteFill style={tokens}>
      <Component t={t} state={stateAt(manifest, t)} aspect={aspect} reducedMotion={false} cited={cited} />
    </AbsoluteFill>
  );
}

export function Root() {
  return (
    <>
      {videoJobs(sceneManifests).map((job) => (
        <Composition
          key={job.id}
          id={job.id}
          component={SceneFrame}
          width={job.width}
          height={job.height}
          fps={job.fps}
          durationInFrames={job.durationInFrames}
          defaultProps={{ sceneId: job.sceneId, aspect: job.aspect, cited: {} } satisfies FrameProps}
        />
      ))}
    </>
  );
}
