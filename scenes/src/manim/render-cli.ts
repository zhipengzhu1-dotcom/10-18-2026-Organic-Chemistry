// `pnpm scenes:render [<id> ...]`: renders watch-only Scenes with Manim CE
// (via `uv run --with manim==0.22.0`, so nothing is installed into the repo),
// silent, at 60 fps, at both aspects. For each aspect it writes, under
// site/public/scenes/<id>/, the H.264 video (no audio track), the poster frame
// and the sources sidecar; then scenes/manim/renders/<id>.json with the
// inputs hash, frame counts and on-screen timings. Commit all of them.
// Needs uv and ffmpeg/ffprobe on PATH; CI never runs this (it checks the
// committed outputs against their inputs instead).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildContent, contentRoot } from "@astratron/content";
import type { Aspect, WatchSceneManifest } from "../types.ts";
import { watchSceneFiles, watchSceneManifests, aspectSlug } from "../watch.ts";
import {
  citedFor,
  FPS,
  inputsHash,
  MANIM_VERSION,
  manimDir,
  manimProps,
  publicPath,
  recordPath,
  repoRoot,
  sourcesSidecar,
  type RenderRecord,
  type Timings,
} from "./pipeline.ts";

function run(cmd: string, args: string[], env: Record<string, string> = {}): string {
  const result = spawnSync(cmd, args, { cwd: repoRoot, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(`${cmd} ${args.join(" ")} failed (${result.error?.message ?? `exit ${result.status}`})`);
  }
  return result.stdout;
}

function findMp4(dir: string): string {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      const found = findMp4(path);
      if (found) return found;
    } else if (name.endsWith(".mp4") && !path.includes("partial_movie_files")) return path;
  }
  return "";
}

function renderAspect(m: WatchSceneManifest, cited: Parameters<typeof manimProps>[1], aspect: Aspect, work: string) {
  const props = manimProps(m, cited, aspect);
  const propsFile = join(work, `${aspectSlug(aspect)}.props.json`);
  const timingsFile = join(work, `${aspectSlug(aspect)}.timings.json`);
  writeFileSync(propsFile, JSON.stringify(props, null, 2));
  const media = join(work, `media-${aspectSlug(aspect)}`);
  console.log(`  ${aspect}: Manim ${MANIM_VERSION}, ${props.width}×${props.height}, ${FPS} fps …`);
  run(
    "uv",
    [
      "run", "--no-project", "--with", `manim==${MANIM_VERSION}`,
      "manim", "render", join(manimDir, m.render.script), m.render.sceneClass,
      "--fps", String(FPS), "-r", `${props.width},${props.height}`,
      "--disable_caching", "--media_dir", media, "-o", m.id, "--progress_bar", "none",
    ],
    { SCENE_PROPS: propsFile, TIMINGS_OUT: timingsFile },
  );
  const raw = findMp4(media);
  if (!raw) throw new Error(`Manim wrote no video under ${media}`);

  const files = watchSceneFiles(m.id, aspect);
  const video = join(repoRoot, publicPath(files.video));
  mkdirSync(dirname(video), { recursive: true });
  // Web delivery: H.264, yuv420p, moov atom first, and no audio track (the Scenes are silent).
  run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", video]);
  const streams = run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", video]).trim().split("\n");
  if (streams.join(",") !== "video") throw new Error(`${files.video} should hold one video stream and no audio; found ${streams.join(", ")}`);
  const frames = Number(
    run("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", video]).trim(),
  );
  const posterFrame = Math.min(Math.round(m.poster * FPS), frames - 1);
  run("ffmpeg", ["-y", "-v", "error", "-i", video, "-vf", `select=eq(n\\,${posterFrame})`, "-frames:v", "1", "-q:v", "3", join(repoRoot, publicPath(files.poster))]);

  const timings = JSON.parse(readFileSync(timingsFile, "utf8")) as Timings;
  writeFileSync(join(repoRoot, publicPath(files.sources)), `${JSON.stringify(sourcesSidecar(m, cited, aspect, timings), null, 2)}\n`);
  console.log(`  ${aspect}: ${frames} frames (${(frames / FPS).toFixed(2)} s) → ${publicPath(files.video)}`);
  return { frames, timings };
}

const ids = process.argv.slice(2).filter((a) => a !== "--");
const unknown = ids.filter((id) => !watchSceneManifests.some((m) => m.id === id));
if (unknown.length) {
  console.error(`No watch-only Scene ${unknown.join(", ")}. Known: ${watchSceneManifests.map((m) => m.id).join(", ")}`);
  process.exit(1);
}
const { model, errors } = buildContent(contentRoot);
if (!model) {
  console.error(`Content build failed:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
const data = Object.assign({}, ...model.subjects.map((s) => s.data));

for (const m of watchSceneManifests.filter((w) => !ids.length || ids.includes(w.id))) {
  console.log(`Rendering ${m.id}`);
  const { cited, missing } = citedFor(m, data);
  if (missing.length) throw new Error(`${m.id} cites ${missing.join(", ")}, not in the cited data`);
  const work = mkdtempSync(join(tmpdir(), `manim-${m.id}-`));
  try {
    const record: RenderRecord = { scene: m.id, manim: MANIM_VERSION, fps: FPS, inputs: inputsHash(m, cited), aspects: {} };
    for (const aspect of m.aspects) record.aspects[aspect] = renderAspect(m, cited, aspect, work);
    mkdirSync(join(repoRoot, dirname(recordPath(m.id))), { recursive: true });
    writeFileSync(join(repoRoot, recordPath(m.id)), `${JSON.stringify(record, null, 2)}\n`);
    console.log(`  wrote ${recordPath(m.id)}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
