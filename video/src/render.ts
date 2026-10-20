// Renders Scenes through Remotion (ADR 0001): `render` writes each Scene's
// video (H.264, 60 fps) and its `<scene>-<aspect>.sources.json` sidecar;
// `stills` renders the poster frame only (the CI gate: one frame of every
// Scene at both aspect ratios). Output goes to video/out/, never committed.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { buildContent, contentRoot } from "@astratron/content";
import { sceneRegistry } from "@astratron/scenes";
import { sceneCatalog } from "@astratron/scenes/check";
import { sceneManifests } from "@astratron/scenes/manifests";
import { watchSceneManifests } from "@astratron/scenes/watch";
import { citedFor } from "./cited.ts";
import { videoJobs, type VideoJob } from "./jobs.ts";
import { sourcesSidecar } from "./sidecar.ts";
import { browserOptions } from "./browser.ts";
import type { FrameProps } from "./remotion/Root.tsx";

export const outDir = fileURLToPath(new URL("../out", import.meta.url));
const entryPoint = fileURLToPath(new URL("./remotion/index.ts", import.meta.url));
// Software GL, and REMOTION_BROWSER_EXECUTABLE to use a local browser (browser.ts).
const browser = browserOptions();

export interface RenderOptions {
  mode: "video" | "still";
  /** Scene ids; all registered Scenes when empty. */
  scenes?: string[];
  /** Video renders only: write the sidecar but skip the video (for quick checks). */
  sidecarOnly?: boolean;
  out?: string;
  log?: (line: string) => void;
}

/** Renders the chosen Scenes at every aspect; returns the files written. */
export async function renderScenes({ mode, scenes = [], sidecarOnly = false, out = outDir, log = console.log }: RenderOptions) {
  const unknown = scenes.filter((id) => !sceneRegistry[id]);
  if (unknown.length) throw new Error(`Unknown Scene(s): ${unknown.join(", ")}. Scenes: ${Object.keys(sceneRegistry).join(", ")}`);
  const jobs = videoJobs(sceneManifests).filter((j) => !scenes.length || scenes.includes(j.sceneId));

  // Watch-only Scenes (#66) are in the catalog so Lessons that show them build; Manim renders them (`pnpm scenes:render`).
  const { model, errors } = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
  if (!model) throw new Error(`Content build failed:\n  ${errors.join("\n  ")}`);
  mkdirSync(out, { recursive: true });

  const needsBrowser = mode === "still" || !sidecarOnly;
  const serveUrl = needsBrowser ? await bundle({ entryPoint }) : "";
  const written: string[] = [];

  for (const job of jobs) {
    const scene = sceneRegistry[job.sceneId]!;
    const cited = citedFor(model, scene.manifest.data);
    const inputProps: FrameProps = { sceneId: job.sceneId, aspect: job.aspect, cited };

    if (needsBrowser) {
      const composition = await selectComposition({ serveUrl, id: job.id, inputProps, ...browser });
      check(job, composition);
      if (mode === "still") {
        const output = join(out, `${job.id}.png`);
        await renderStill({ serveUrl, composition, frame: job.posterFrame, output, inputProps, ...browser });
        written.push(output);
        log(`still  ${job.id}  frame ${job.posterFrame}  ${job.width}×${job.height}  → ${output}`);
        continue;
      }
      const output = join(out, `${job.id}.mp4`);
      await renderMedia({ serveUrl, composition, codec: "h264", crf: 18, outputLocation: output, inputProps, ...browser });
      written.push(output);
      log(`video  ${job.id}  ${job.durationInFrames} frames @ ${job.fps} fps  → ${output}`);
    }

    const sidecar = join(out, `${job.id}.sources.json`);
    writeFileSync(sidecar, `${JSON.stringify(sourcesSidecar(scene, job.aspect, cited), null, 2)}\n`);
    written.push(sidecar);
    log(`sources  ${job.id}  → ${sidecar}`);
  }
  return written;
}

/** The bundle's composition must be the job (same registry, same numbers). */
function check(job: VideoJob, c: { width: number; height: number; fps: number; durationInFrames: number }) {
  if (c.width !== job.width || c.height !== job.height || c.fps !== job.fps || c.durationInFrames !== job.durationInFrames)
    throw new Error(`${job.id}: composition ${c.width}×${c.height} @ ${c.fps} fps, ${c.durationInFrames} frames does not match the job`);
}
