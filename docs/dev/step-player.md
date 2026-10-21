# Step player

Engine: `site/src/engine/player.ts` (pure, no DOM; its header comment states the play rules). It has no per-type code: each Step plays through its Step type's `start`/`act` (`@astratron/content/step-types`), and the Screen's `tries`, `canContinue`, `arrows` and `goal` are read from that play state (`screen.state`). View: `site/src/components/StepPlayer.tsx` (an island that draws the engine's `Screen`) draws what every Step shares and takes the rest from the Step's view, one per Step type (`site/src/components/steps/`). Progress: `site/src/progress/`. Practice Set: `site/src/engine/practice-set.ts` + `components/PracticeSet.tsx`.

## Engine conventions

- Progress is raw answers per Step id, **replayed** on open, so an answered Step comes back locked with its feedback. A new Answer shape must be JSON-serialisable and grading deterministic; then back, resume and Step links work with no extra code.
- `reached` is the furthest Step reached by Continue. A Step link past it opens the Step `ahead`: it plays, saves no answers, earns no Streak and can't mark the Lesson done (story 17). Records saved before `reached` existed fall back to `step` (or every Step once `done`).
- `progress.done` latches on reaching Wrap in order; `screen.done` means "on the Wrap now".
- The answer key arrives after first render. Until then graded Steps carry empty secrets and grade nothing; StepPlayer reopens the Screen (`{type: "open"}`) when the key lands, and draws from the keyed Lesson (`lesson.steps[screen.index]`), not `screen.step`, to avoid a one-render flicker that once hung CI.
- `tries` is the number the Practice Set summary reads: `tries === 1` ⇔ first try. Draw arrows counts wrong pushes plus one when done, so the same rule holds.

## Step views (`site/src/components/steps/`)

- `steps/index.ts` holds `views`, one entry per Step type (a missing one fails to compile); `steps/view.tsx` says what a view is. Each part (`Lead`, `Drawing`, `Scene`, `Answer`, `Foot`) is drawn in its fixed place among the shared parts (figures, reveal Scene, video, 3D card, Source note), so the page order stays the same for every type.
- A view never builds an Answer: it reports a choice (picked ids, typed text, a card order, a push, a Scene move) and the type's `answer` (`rules.ts`) turns it into one. Check submits the view's `choice`; Draw arrows and goal-state Manipulate `submit` each choice as it is made.
- What the Student has chosen lives in StepPlayer, per Step, until Check (`fresh` clears it after a try), Continue, back or a Step link.
- Adding a Step type: one content folder plus one view file (`docs/dev/content.md`).
- `step.type` checks left in StepPlayer: none. Per-Lesson code stays there (known gaps).

## Paper Notebook look (#120)

Player chrome lives in `global.css` (`@layer components`); drawings, Tap and Draw arrows in `structure.css`. The visual spec is sections 03 and 06 of `prototypes/paper-notebook.PROTOTYPE.html` on `prototype/paper-notebook`.

- **Top bar:** ✕ and ‹ in pen circles; the progress strip is pen pills (`.bars`): done = leaf (`--at-green-fill`), on screen = highlighter (`--at-yellow-fill`, thicker line).
- **Choices:** text choices carry `<Bubble />` (`steps/view.tsx`): a pen circle whose blue marker scribble draws on by `stroke-dashoffset` over `--at-dur-card`. A picked choice also gets an inset pen line, so a pick never rests on colour. Structure cards carry the bubble in their corner.
- **Feedback:** ✓ solid green on a leaf offset shadow; ✗ dashed pink, its text on a violet rule (the rule sits on the whole `<p>`: a Hint on its own line overflowed nine phone Steps); → plain `--at-ink-muted` pen line. The icon is a pen circle filled with its marker. `design.spec.ts` checks all three.
- **Numeric:** a pen underline (`--at-pen`) with the value in mono; dashed once locked.
- **Rank:** pen cards with an ink offset; the held card lifts onto a blue marker offset. Change only shadows while dragging: a border change shifts the cards under the pointer and breaks the drop slot.
- **Readables** (Key idea, Practice Set results): pen box on a highlighter offset, stats underlined in blue marker.
- **Drawings (`drawStructure`):** bonds and atoms in pen ink (`currentColor`); electrons in `--lone-pair` (blue on the page, falling back to `--at-blue`'s value elsewhere); a minus in `--charge-minus` (pink), a plus in `--charge-plus` (orange), both ink where unset. Highlighted bonds are a highlighter swipe, highlighted atoms a dashed blue ring on a highlighter dab; Tap picks are a blue pen ring on blue marker + ✓, the revealed answer a dashed ring on highlighter. Marker multiplies over the drawing so letters stay ink. Every one keeps a shape cue (ring, dash, ✓, band).
- **Draw arrows:** pushes in blue ink; flags and the shown push orange and dashed, the flag list on an orange marker offset (`draw-arrows-style.test.ts`).
- Fit: choices are Nunito 500, not the prototype's 600, and the bubble column is 22 px: wider text tipped the tightest 3D Steps (Lesson 4 s14) over a phone screen.

## Draw arrows (`@astratron/content/arrows`)

- Graded on our own molecule graph (lone pairs + bond orders; charges derived), never RDKit at runtime. RDKit (`content/src/layout.ts`) runs only in Node, for `pnpm structure` and tests.
- A push is accepted when it moves toward a still-open result and that result stays reachable, so any valid route or order counts. An impossible gesture (lone pair from an atom without one, bond onto itself) is no push: ignored, no try spent.
- Two tries per push: Hint, then the push is placed for the Student (`shown`). Undo removes the last push; spent tries stay spent. Any shown push turns the final feedback into the reveal.
- Name bonds by the **start** structure's ids; results are compared by atom pairs, so result bond ids don't matter.
- In a Lesson with Draw-arrows Steps every Tap Step and that Lesson's Tap Problems need `tapOnly` (build error otherwise).
- On success the Step's `scene` plays in place of the drawing; without one, `PushReplayPlayer` replays the pushes.

## Streak and progress record

- One localStorage entry (`astratron.progress`). Shape changes: bump `CURRENT_VERSION`, add the old shape to `PAST_RECORDS` in `record.test.ts`, add a step to `MIGRATIONS` (`record.ts` header).
- A Streak day = 1 Lesson reaching Wrap for the first time, or 3 different Problems resolved (Check Steps and Practice Set both count). Freeze rule (agent-chosen; owner to confirm in `docs/owner/hand-check.md`): 2 freezes, each missed day spends one, one regained per 7 Streak days.

## Practice mode

- `PracticeSet` builds a fake Lesson (`PRACTICE_LESSON`) and plays it through StepPlayer with `practice={{onFinish}}`: no hash, no resume, no `saveLesson`, still `recordProblem`. The draw runs in the browser (random, avoids the last draw); `?problems=<id>,…` pins a Set (test aid).
- Missed = not eventually correct; Retry missed replays exactly those.

## Phone fit

`site/e2e/design.spec.ts` gates every Step of every Lesson and the whole Bank: Step + feedback fits 390×844 with the action button in view, controls ≥ 48 px, axe clean, numbers in the data face. Per-Lesson specs also check a short laptop window (1280×720). Conventions that keep it green:

- A reveal Scene replaces the question's widgets (`.player.revealing`), and the feedback states the answer in words.
- On phones, once answered or hinted, the prompt gives way to the feedback (`.player.answered` / `.revealing` rules in `global.css`, per Step kind); a playing watch-only video hides the prompt too.
- The Lesson-end screen hides the Wrap's Scene, still, 3D card and its Source note below tablet width; laptop shows them.
- When a Step still overflows, shorten or join text, use chip layouts (`opts-chips`, `opts-words`, `opts-pairs`), cap drawings (Draw-arrows start 21vh, Manipulate frame 21dvh), or split the Step. Record the choice in the PR.
- `global.css` rules sit in `@layer` blocks; `structure.css` is unlayered, so it wins over them.
- Drawings too wide to keep 48 px hits at 640 px scroll sideways in `.tap-scroll` (only Met-enkephalin today).

## Tutor (dev only)

`StepPlayer` mounts the Tutor panel only under `import.meta.env.DEV`, through `lazy(() => import(...))`, so the build drops it; the chrome counts in the design gates are unchanged. Notes: `docs/dev/tutor.md`.
