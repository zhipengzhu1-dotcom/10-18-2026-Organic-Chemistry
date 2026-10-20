# Video

Two video paths, both 60 fps (owner decision 2026-10-19; any 30 fps in a Lesson spec is superseded):

- **Interactive Scenes → Remotion** (`video/`), rendered on demand, never committed. ADR 0001 is the why.
- **Watch-only Scenes → Manim CE**, rendered by hand, committed, played by the site. How to add one: `scenes/manim/README.md`.

Scene contract and registry: `scenes.md`.

## Remotion (`pnpm video …`)

- Every `remotion` / `@remotion/*` package is pinned to the exact same version, 4.0.537. Bump them together or not at all.
- Remotion stays inside `video/`. `pnpm lint:scenes` rejects a Remotion import in `scenes/src`; `pnpm video check-site` rejects Remotion in `site/dist` or in the site/scenes/content package.json files (it builds the site first when `site/dist` is missing). Licence: free under the individual route; keeping it isolated keeps forks of the MIT repo clean.
- `src/render.ts` is the only file that imports `@remotion/renderer`/`@remotion/bundler`. The CLI runs through `tsx`, because Node's type stripping can't load `.tsx` Scenes.
- `pnpm video stills [scene…]` renders each Scene's poster frame at both aspects into `video/out/`; it is CI's video gate (the `video` job). A new Scene passes it before merge.
- `pnpm video render [scene…] [--sources-only]` writes mp4 + `<scene>-<aspect>.sources.json`; `--sources-only` skips the browser.
- `pnpm video links <lesson id|slug> [--origin <url>]` (or `ASTRATRON_ORIGIN`) prints each Step's id, phase, Prompt opening and deep link, for video descriptions.
- Remotion Studio (`pnpm --filter @astratron/video run studio`) passes `cited: {}`, so Scenes show no numbers there; use `stills` to check numbers.

### Browser and GL

- Renders use `chromiumOptions.gl = "swangle"` (`video/src/browser.ts`): Remotion's default GL hung on "Waiting for root component" on macOS, and swangle gives the same pixels on CI with no GPU.
- The first render downloads chrome-headless-shell into `video/node_modules/.remotion` (needs network once).
- If a local render still hangs on "Waiting for root component" (it has under heavy multi-agent Chrome load), point Remotion at Playwright's shell: `REMOTION_BROWSER_EXECUTABLE=~/Library/Caches/ms-playwright/chromium_headless_shell-<n>/chrome-headless-shell-mac-arm64/chrome-headless-shell pnpm video stills <id>`.

### Fonts and colours

`video/src/remotion/Root.tsx` imports `site/src/styles/tokens.css` and the two `@fontsource-variable` fonts, and holds every frame with `delayRender` until both fonts load, so numbers render in JetBrains Mono. Change tokens or fonts in the site; the video follows (`video/test/remotion-root.test.ts`).

### Sources sidecar

- One entry per `manifest.data` ref. On-screen ranges are measured by rendering the Scene to static markup at every frame and searching for the value's display text (or colour). A value never found is `shown: "drawn"` for the whole video.
- Canvas (R3F) content is invisible to that markup search; print a number as SVG/DOM text if its on-screen range matters.
- The sidecar shape is written twice: `video/src/sidecar.ts` (interactive Scenes) and `SourcesSidecar` in `scenes/src/manim/pipeline.ts` (watch-only; scenes can't import video). Change both together.

## Manim watch-only Scenes

- Watch-only Scenes are silent, plain Manim renders: no editing pass, no music or sound effects (owner choice). `Text` only; LaTeX is not installed, so `Tex`/`MathTex` fail.
- `pnpm scenes:render <id>` needs `uv` and `ffmpeg`/`ffprobe`; Manim 0.22.0 comes from `uv run --with`, never installed into the repo. Roughly 45 s per aspect for a 13 s clip at 1080p60.
- Commit the outputs under `site/public/scenes/<id>/` and `scenes/manim/renders/<id>.json`. `scenes/test/manim-render.test.ts` (in `pnpm test`) re-hashes the inputs (script, fonts, props incl. cited values and tokens, Manim version, fps) and fails on a stale or missing render. Changing a cited value, a token colour or a font therefore means re-rendering every affected watch-only Scene. CI never runs Manim.
- One script can hold several Scene classes (`scenes/manim/lesson_03.py`). Watch-only Scenes have no states: a spec Scene with a parameter becomes one watch Scene per value (e.g. `mo-from-overlap-h2` / `-ethylene`).
- The site plays only the 16:9 file; the 9:16 file ships for the future channel.
- Phone fit: a 16:9 video plus choices plus feedback overflows a 390×844 screen. On any non-Explain Step the player shrinks the video to a card whenever it isn't playing (`shrinkWhenDone` in `StepPlayer.tsx`); check the Step still fits with the design gate, or put the video on an Explain Step.
