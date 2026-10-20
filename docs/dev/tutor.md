# Tutor (dev only)

Spec #104. Runs under `pnpm dev` only, on the owner's signed-in `claude` command. The build carries none of it (`pnpm budget:js` fails if it does).

## Modules (`site/src/tutor/`)

- **Tutor context** (`context.ts`, tested): the only path Step data takes to the model. Input: the page Lesson (no Answer key), the Screen's `index`/`total`/`tries`/`feedback`/`canContinue`/`done` (`TutorScreen`, never `screen.step` or `state`), the Student's draft and the stage. Feedback text passes only for a Hint or a shown push, or once the Step can continue. All text goes through `plain()`.
- **Tutor route** (`route.ts`, tested): Connect middleware mounted at `TUTOR_PATH` by the `tutorRoute()` Vite plugin (`apply: "serve"`, registered in `site/astro.config.mjs`). Loopback only; model and effort allowlisted (default Sonnet 5.5 · low); `claude -p` in an empty temp folder with no tools, settings, MCP or session, `--json-schema`, `stream-json`; Student and history text escaped in `<student>`/`<tutor>`, history in `<conversation>`, the context in `<step>`. `ASTRATRON_TUTOR_CLAUDE` replaces the binary (tests use `test/fake-claude.mjs`).
- **Contract** (`contract.ts`): `TUTOR_PATH`, `PANEL_CLASS`, the request and the NDJSON events (`reply`… `done` | `error`).
- **Tutor panel** (`TutorPanel.tsx` + `tutor.css`, by hand): the Ask button in the top bar and the panel, portalled to `<body>`: a sheet below 720 px, a side panel from 720 px (the player pads right while it is open, via `html[data-tutor="open"]`). Kept mounted and `inert` when closed so it can fade/slide. Finished replies go to a polite live region once (the streaming text isn't announced). Stream reading: `stream.ts`. Stage reading: `stage.ts`.
- **Stage moves** (#107): the schema asks for `actions` (≤4); the route's `stageActions` (tested) drops unknown types, off-stage atoms and a `set` with no control, clamps `at` to 0..1 and `value` to the control's range. On the page, `stage.ts` reads the stage (`readStage`: Scene, control with label/min/max/value, labelled atoms with their drawing) and carries the actions out (`moveStage`) by pressing the Scene player's buttons and sliding Scrub or the control (native value setter + `input` event, so React and the live text update), or pressing a stepper's − / + a frame apart until its `data-value` matches. Both sides index the same atom list (`atomsOnStage`: visible `.structure text.atom` in `.player-body`, outside Scene frames, which redraw every frame). Rings (`.tutor-ring`: solid cyan + four crosshair ticks) are appended to the drawing's SVG; they clear on a new highlight, `clear`, a Step change or unmount. A drawing that re-renders its SVG (a Draw-arrows push) drops them.
- **Settings** (#106): the route's `GET` returns `TutorChoices` (models, efforts, default pair); the panel builds its picker from it and sends the chosen `model`/`effort` with each question. `settings.ts` remembers the pair (`at-tutor-pick`, `model|effort`, falling back to the default when the route no longer offers it) and the on/off switch (`at-tutor-switch` = `off`), reads and writes wrapped in try/catch. Each finished reply shows `done`'s model, effort and seconds (seconds in `.data`). Off leaves only the header's switch, unchecked (`.tutor-wake`, labelled "Tutor"), in the Ask button's column: no panel, no portal. A text label there pushes the story bars out at 390 px.
- **Build check** (`absent.ts`): run by `pnpm budget:js`.

## Gotchas

- In current Chromium `scrollIntoView` returns a Promise: an arrow-bodied `useEffect` that returns it crashes React. Use block bodies.
- The first open after a dev-server start can reoptimise deps and reload the page.

## Left for the sibling tickets

- #108: per-Step divider and intro, chips, ⌘K, failure lines and route-limit tests (busy, timeout, body and message caps are in `route.ts` already, untested).
