// The Remotion root (ADR 0001: Remotion is only the video renderer). One
// composition per registered Scene × aspect, from videoJobs, so the renders
// and the CLI agree. Each frame is the Scene at t = frame / 60 with the state
// its stored timeline gives at t: no input, nothing else.
import { AbsoluteFill, Composition, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { useEffect, useState, type CSSProperties } from "react";
import type { Cited } from "@astratron/content/data";
import { sceneRegistry, stateAt, type Aspect } from "@astratron/scenes";
import { sceneManifests } from "@astratron/scenes/manifests";
import { videoJobs } from "../jobs.ts";
// The site's own design tokens (the Paper Notebook :root block, #118) and self-hosted fonts: numbers and
// formulas render in JetBrains Mono, as on the site (story 93), never a copied colour or system font.
import "../../../site/src/styles/tokens.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "@fontsource-variable/nunito/index.css";

export interface FrameProps extends Record<string, unknown> {
  sceneId: string;
  aspect: Aspect;
  /** The Scene's cited values, looked up in Node by the render CLI (the bundle has no file access). */
  cited: Record<string, Cited>;
}

const frameStyle: CSSProperties = { background: "var(--at-paper)", fontFamily: "var(--at-font-text)" };

/** Holds the frame until both fonts are loaded, so no frame is drawn in a fallback face. */
function useFonts() {
  const [handle] = useState(() => delayRender("Loading Nunito and JetBrains Mono"));
  useEffect(() => {
    const faces = ['400 32px "Nunito Variable"', '700 32px "Nunito Variable"', '400 32px "JetBrains Mono Variable"', '700 32px "JetBrains Mono Variable"'];
    Promise.all(faces.map((f) => document.fonts.load(f))).then(() => continueRender(handle));
  }, [handle]);
}

export function SceneFrame({ sceneId, aspect, cited }: FrameProps) {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = sceneRegistry[sceneId];
  if (!scene) throw new Error(`No Scene "${sceneId}" in the registry`);
  const t = frame / fps;
  const { Component, manifest } = scene;
  return (
    <AbsoluteFill style={frameStyle}>
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
