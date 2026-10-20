# Testing and gates

Entry points: `pnpm check` (typecheck, content:build, lint:numbers, lint:scenes, blender check, test, build, budget:js, video check-site; fails fast, same order as CI) and `pnpm check:full` (check + test:e2e + video stills). Implementers run `pnpm check`; CI runs the rest.

## What each gate guards

- **lint:numbers** (ADR 0002, `content/src/number-lint.ts`): flags anything that looks like a chemistry number typed into `scenes/src`, `site/src/molecule` or `content/src`. Fix by reading the value with `cite()` from cited data, or by naming a non-chemistry number. `// cited-data: ok, <reason>` is the escape hatch for genuine non-chemistry numbers only (atom ids, layout px, degrees→radians). Token fallbacks `var(--at-x, #hex)` are exempt; a unit test pins them to `tokens.css`. Scene text: "angles" beside a digit trips it.
- **lint:scenes** (ADR 0001, `scenes/src/purity-lint.ts`): no timers, frame hooks, state/effect hooks, wall clocks, `Math.random`, CSS/SMIL animation or Remotion imports in Scene code. Escape hatch `// scene-purity: ok, <reason>`. Also runs inside Vitest.
- **blender check**: re-hashes each committed Blender render's recorded inputs; no Blender needed. Renaming or editing anything a render lists as input (e.g. `BALL` in the 3D card, imported by `pipelines/blender/render.ts`) makes the renders stale.
- **budget:js** (`site/src/lib/js-budget.ts`): ≤200 KB gzip first-load JS per Lesson and Practice Set page, following static imports from module scripts and island URLs. Only dynamic `import()` escapes it: keep three.js, meshes and Draw arrows behind one. Needs `site/dist`.
- **video check-site**: the built site and its modules carry no Remotion (builds the site if `site/dist` is missing).
- **video stills**: one poster frame per registry Scene × 16:9 and 9:16 through Remotion. A new Scene must pass it. See `docs/dev/video.md` for the local browser override.
- **Answer leak** (`site/e2e/course-map.spec.ts`): no built Lesson page holds an answer, Hint, Correct line or reveal. A new grading field goes on its Step type's `secret` list (`content/src/step-types/<type>/rules.ts`) or this fails (`docs/dev/content.md`). The unit tests `content/test/answer-fields.test.ts` (answer-named schema fields) and `site/src/lib/step-types.test.ts` (every built Step) catch it first.
- **noindex** (`definition-of-done.spec.ts`, `site.test.ts`): every page carries noindex while `PUBLIC` is false.

## Design gates (`site/e2e/design.spec.ts`)

Coverage comes from crawling and playing, so new work is gated automatically once reachable:
- **Every page linked from `/`** (`allPages`), both themes: axe (WCAG 2.2 AA tags), type rules, 48×48 targets. An unlinked page is not checked: link it or extend `allPages`.
- **Every Step and feedback state** of every Lesson and of the whole Practice Bank (`playablePaths` pins Practice Sets with `?problems=…`, ten at a time), both themes, and on a 390×844 phone: no page scroll, `.player-body` not overflowing, foot button(s) fully in view. `playThrough` (`site/e2e/site.ts`) answers by first option / typing 1 / Rank as dealt / first Tap target / first push / goal Scene by keyboard. A new Step type must be answerable by `playThrough`, or extend it.
- Phone fit only sees the `playThrough` path (first choice). Long Hints on other paths are unchecked; look at them by eye.

Rules that bite:
- Text ≥16px (SVG drawing labels exempt); Pixelify ≥32px; Silkscreen 16px uppercase; any text with a digit, sub/superscript digit or ⁺/⁻ in JetBrains Mono. `md()` wraps numbers and formulas; lone element symbols and plain formulas (`HCl`) are not detected, so write them as code (`` `C` ``). New components that show numbers use `.data` / `font-data`.
- Targets: a checkbox/radio's target is its label. Tap bonds between two tappable atoms are exempt down to 24px (TODO in `smallTargets`; see known gaps).
- Motion: only 90/180/420 ms, nothing infinite, no AudioContext or media play on Lesson 1; reduced motion (OS or switch) leaves only opacity ≤120 ms. The gate sees CSS and Web Animations only, so a JS loop (rAF, `setInterval`) in the player is not caught: keep it on the Scene clock and play once.
- Player chrome: counts of links and foot buttons are asserted (✕ + Report a mistake; one foot button, more only on end screens). Adding a control to the player means updating these counts deliberately.

## Playwright

- Runs against the built site (`astro build` + `astro preview --ignore-lock`; without `--ignore-lock` Astro 7 backgrounds the server for agents). It picks a free port; `E2E_PORT` overrides. Tests run fully parallel, so keep each test independent of the others in its file. `--shard` deals tests round-robin (`site/e2e/round-robin-shards.ts`), so the slow per-Lesson design walks spread over CI's four shards.
- 60 s per test and 10 s per expect leave room for a loaded machine; the per-Lesson gates set 180 s themselves. One retry in CI only.
- Under heavy multi-agent load some walks (Lesson 0 keyboard walk, structure-steps Tab reach, molecule-card turns) run slow; a failure that passes alone is load, a failure that repeats alone is real.
- Nothing rests on random draws: `practice-set.spec.ts` seeds the draw (mulberry32) and plays the whole Bank in pinned Sets. Keep new randomness seeded in tests.
- Query by role and accessible name, not classes; the specs depend on names like "Check", "Continue", "Choices", "Answer", "Back to Unit".
- Turnstile and `/api/submit` are stubbed in the browser (`astro preview` serves no Functions); see `docs/dev/submissions.md`.
- First run on a machine: `pnpm exec playwright install chromium`.
