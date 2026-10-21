# Scenes and structure drawing

Rules live in ADR 0001 (Scenes are pure, Remotion is video-only) and ADR 0002 (numbers only from cited data); terms in `GLOSSARY.md`. The contract itself is `scenes/src/types.ts`. Watch-only (Manim) Scenes: `scenes/manim/README.md` and `video.md`.

## Scene contract

- A Scene is a pure React component of `{ t, state, aspect, reducedMotion, cited, input? }`. Every number and element colour it shows comes from `cited` (the refs its manifest's `data` lists); `describe(state, t, cited)` gets the same values for screen-reader text.
- Draw in `frameSize(aspect)` units (1920×1080 or 1080×1920) with an SVG `viewBox`, and lay out per aspect so nothing crops. The site shows 16:9 only; 9:16 exists for video.
- Easing and randomness come from `scenes/src/motion.ts` (`seededRandom`, `easeInOut`, …).
- `pnpm lint:scenes` bans timers, `useFrame`, state/effect hooks, wall clocks, `Math.random`, CSS/SMIL animation and any Remotion import in `scenes/src`. `useMemo`/`useRef` are fine. Escape hatch for a false positive: a line ending `// scene-purity: ok, <reason>`.
- Colours: name a Paper Notebook token with its value as the fallback, `var(--at-x, #hex)` (e.g. `var(--at-blue, #0a64c2)`). `scenes/test/token-fallbacks.test.ts` pins every fallback to the single `:root` block of `site/src/styles/tokens.css`. The Arcade names (`space`, `electron`, `ignite`, `boss`, …) are gone, from tokens and from Scene code alike (`BLUE`/`blue`, `PINK`/`pink`, `ORANGE`, not `CYAN`, `MAGENTA`, `electron`, `boss`); map old code with the spec #117 role table.
- Paper rules for a Scene (#123): pen inks (`--at-ink`, `--at-blue`, …) for lines and text; a marker fill (`--at-*-fill`) only inside a pen line of its colour (a bar, a lobe, a highlight band), never as text or a lone shape. What used to glow on dark space becomes a marker fill; what was white becomes pen ink. No raw hex: a stick or ring colour is a token too. Orbital lobes (`hybrid-model/draw.tsx`) are `fill(colour)` inside `ink(colour)`, with the − hatching in pen.
- Faces: `var(--at-font-hand, 'Patrick Hand', cursive)` for labels and headings (a name, a title, a tag; `HAND_FONT` in `dots`/`contributors`, `fontHand` in `lesson-06`, `FONT_HAND` in `functional-groups`), `var(--at-font-text, 'Nunito', system-ui, sans-serif)` for sentences, `var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)` for numbers, formulas and anything `drawStructure` lays out (its advance widths assume the mono face). Patrick Hand has one weight: no `fontWeight` on it, and set it about 10% larger than the sans it replaces. Every face a Scene uses must be loaded by the Remotion root (`video.md`).
- Nothing loops in the Step player: a Scene autoplays once on entry, Replay plays it again (`site/src/engine/scene-clock.ts`). Reduced motion (OS or `<html data-motion="reduced">`) opens paused on `poster.t`.
- Live Scenes play at 20 fps (#119). The player, not the Scene, snaps: `ClockedFrame` (ScenePlayer, PushReplayPlayer) hands the Scene `sceneFrame(clock.t, duration).t` (`snapToFrame` floored to 1/20 s; the last frame is exactly `duration`, on the grid or not) and dispatches clock ticks only when that frame changes, so it re-renders 20 times a second. The Scrub input stays continuous; its readout says the snapped time. `WatchScenePlayer`'s scrubber follow loop snaps too; the Manim video plays untouched at 60 fps. Don't add a second clock or easing in a Scene to "smooth" it.
- Boil: `Base.astro` holds four SVG filters (`rough`, `boil-0/1/2`, fixed seeds). While a Scene plays, `ClockedFrame` sets its `.scene-ink` wrapper's `filter` to `boil-(frame % 3)`; stopped (ended, paused, scrubbed, still) it is `rough`; under reduced motion, and before the island knows the motion setting, there is none. Scenes don't draw or name these filters.
- Not stepped: `GoalScene` (pointer drag), Draw arrows, the Scrub thumb and 3D rotate follow the pointer at display rate. `GoalScene` is not a `ClockedFrame`, so it gets neither snap nor boil.
- `controls: false` hides Play/Replay/Scrub; `checkManifests` allows it only for `duration <= 5` (WCAG 2.2.2).

## Adding a Scene

1. `scenes/src/<id>/manifest.ts` (no React imports) + the component (+ a `layout.ts` when layout is non-trivial).
2. Register in both `sceneManifests` (`scenes/src/manifests.ts`, Node tools read it) and `sceneRegistry` (`scenes/src/index.ts`, site + video read it). `scenes/test/registry.test.ts` checks the lists agree, data refs exist, the real content builds, and markup is deterministic at both aspects.
3. Add a test that the layout stays inside the frame at both aspects.
4. Gates: `pnpm content:build`, `pnpm lint:numbers`, `pnpm lint:scenes`, `pnpm video stills --changed` (or `--only <id>`).

Every caller of `buildContent(..., { scenes })` passes `sceneCatalog(sceneManifests, watchSceneManifests)`; leaving out the watch list makes Lessons that show a watch-only Scene fail to build.

A Step's Scene cites join the Step's Source note automatically. Before building a Scene feature, grep `scenes/src` and the content schema: `controls: false`, `stepper: true` (− / + buttons instead of a slider), `still: true`, `revealScene`, `aside.scene` already exist.

## Manipulate Steps

- `type: manipulate`: one settable state is the control; graded by equality on `{ setting }`. The build rejects an answer or Hint value off the state's grid and a control that starts on the answer.
- `type: manipulate-goal`: the Student works the Scene itself through `stages` (`goal`, `blocked`, `idle` Hints; `idleSeconds`, default 30). The Scene declares `manifest.interact` (`drop`, `next`) and draws handles/targets as `<g role=button tabIndex=0 data-handle|data-target aria-label>` (pattern: `scenes/src/dots/dots.tsx` `Hit`). `site/src/components/GoalScene.tsx` owns pointer drag, tap-tap and keyboard; idle timers live in the player, never in the Scene.
- Problems take no Manipulate type (no `problem` in `content/src/step-types/manipulate*/schema.ts`).

## Push replay

`scenes/src/push-replay/PushReplay.tsx` is a pure function of `t` but takes a Step's `start` and `pushes`, not settable states, so it stays out of the registry and the video path cannot render it. To put one in a video, wrap a fixed start + pushes in a registered Scene.

## Structure drawing

- Pipeline: SMILES → `pnpm structure <subject> <id> "<SMILES>" [--style full|lewis|line-angle] [--source "PubChem CID n"]` (RDKit.js lays out only) → committed `content/subjects/<subject>/structures/<id>.yaml` → hand-edit (`label`, `letter: true`, `h`, `tag`, nudged coordinates) → site build pre-renders SVG. Re-running the CLI overwrites hand edits. The CLI prints atom/bond ids; Tap answers and Hints name them.
- One renderer: `drawStructure(structure, hide, options)` in `scenes/src/structure/render.ts`. All bond drawing (single/double/triple, ring-inner double lines, Lewis pairs, wedge/hash), lone pairs, charges, H labels, tags, highlights (`ring`, `outline`, `corner`, orbital `marks`) and `fade` live there. Extend it with an option; a second renderer is the wrong move. Siblings in the same folder: `contributors.ts` (resonance brackets + ↔), `arrows.ts` (curved-arrow geometry for Draw arrows and push-replay), `hydrogens.ts` (write out implied H's).
- RDKit never draws (`get_svg` stays unused). Site build: `site/src/lib/structures.ts#drawView` adds `drawn` + Tap hit shapes; no renderer ships for ordinary drawings. Scenes embed a drawing via `scenes/src/embed.tsx`.
- Coordinates are RDKit units (bond ≈ 1.5), y down; `BOND_PX = 60` per median bond. Lone pairs come from valence (`@astratron/content/valence`).
- `el: "*"` is a loose bond end (no letter). Element `X` works for generic halogens.
- A file whose `source` names a PubChem CID with a cached record under `data/pubchem/` is checked for H count and lone pairs.
- Scenes that draw a Lesson's structure files read a bundled JSON copy, kept equal by a test: Lesson 2 via `pnpm structures:json`, functional groups via `pnpm --filter @astratron/scenes run sync:structures`. Re-run the matching one after editing a structure the Scene uses.
- Tap targets: hit circles are 48 px at natural size (regions 56 px); a drawing too wide for the 640 px column keeps its width and scrolls sideways.

## Number lint (`pnpm lint:numbers`)

Covers `scenes/src`, `site/src/molecule`, `content/src` (`sceneCodeDirs` in `content/src/number-lint.ts`). It flags any number on a line that also names a chemistry word (bond, angle, radius, energy, dipole, …), any number with Å/°/pm/eV/kJ/kcal, and element-colour hex. So drawing constants need non-chemistry names (`HASH_STROKE`, not `BOND_W`), and Scene text like "3 angles" trips it. Model values (VSEPR angles, valence counts) are cited data too (`vsepr-model.yaml`, `valence-electrons.json`). Escape hatch for a genuine non-chemistry number: `// cited-data: ok, <reason>` at line end.
