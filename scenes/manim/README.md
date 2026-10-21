# Watch-only Scenes (Manim CE)

Watch-only Scenes are silent, plain Manim CE renders at 60 fps, with no editing pass. A Step shows one with `scene: <id>`, the same way it shows any other Scene. The site plays the committed video. Under reduced motion the Scene opens paused on its poster frame.

## Render

```sh
pnpm scenes:render              # every watch-only Scene
pnpm scenes:render star-forge   # one Scene
```

You need `uv` and `ffmpeg`/`ffprobe` on PATH. Manim 0.22.0 runs via `uv run --with manim==0.22.0`, so it is never installed into the repo. Text is plain Pango `Text` only, because LaTeX is not installed.

Each render writes these files. Commit all of them:

- `site/public/scenes/<id>/<id>-<16x9|9x16>.mp4`: H.264, yuv420p, faststart, no audio track.
- `….poster.jpg`: the frame at the manifest's `poster` time.
- `….sources.json`: the sources sidecar. It lists each cited number, its citation and the times it is on screen, plus a paste-ready description.
- `scenes/manim/renders/<id>.json`: a sha256 of the inputs (the script, the fonts, each aspect's props including the cited values and the colours from `videoPalette()` in `scenes/src/manim/pipeline.ts`, frozen to the Arcade values until #123 re-renders on paper, the Manim version and the fps), with frame counts and timings.

CI never runs Manim. `scenes/test/manim-render.test.ts` re-hashes the inputs and fails if a committed render is stale or a file is missing.

## Add a watch-only Scene

1. Write the manifest in `scenes/src/<id>/manifest.ts` as a `WatchSceneManifest`. It holds the screen-reader text `describe(cited)`, `reducedMotion`, the `data` refs, the on-screen `text`, `duration`, `poster`, both `aspects` and `render: { engine: "manim", script, sceneClass }`. Then add it to `watchSceneManifests` in `scenes/src/watch.ts`. It must not also be in `sceneRegistry`.
2. Write `scenes/manim/<script>.py`. Read everything from `json.loads(Path(os.environ["SCENE_PROPS"]).read_text())`:
   - `width`, `height` and `fps`
   - `aspect` (`16x9` or `9x16`)
   - `values` (cited values by ref)
   - `text`
   - `palette` (design tokens)
   - `duration`

   Type no chemistry numbers into the script. Seed every random generator. Make the video last exactly `duration`. Write `{ref: [[from, to], …]}` to `TIMINGS_OUT` for each number shown on screen. Register fonts from `scenes/manim/fonts/`.
3. Run `pnpm scenes:render <id>`, check the poster and a few frames, then commit the outputs.
