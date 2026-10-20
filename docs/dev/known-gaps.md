# Known gaps

Real work left open after v1. Owner questions live in `docs/owner/hand-check.md`; going-live tasks in `docs/owner/pre-public-checklist.md`. Delete a line when its gap closes.

## Content and Step player

- **Typed numbers in Lesson prose go unlinted.** `lint:numbers` scans code only (`sceneCodeDirs` in `content/src/number-lint.ts`); a content-build check for patterns like `1.09 Å` or `120°` in YAML text would close it.
- **Draw arrows can't require push order.** Every route and order to the result counts; a multi-stage mechanism needs an `ordered` field (`content/src/arrows.ts`, `site/src/engine/player.ts`).
- **StepPlayer switches on `step.type` throughout and holds per-Lesson code**; `MoleculeCard` / `MoleculeSwitch` carry per-Lesson flags (`site/src/components/StepPlayer.tsx`, `site/src/molecule/`).
- **PracticeSet fakes a Lesson** (`PRACTICE_LESSON` in `site/src/components/PracticeSet.tsx`); the player should take a round of Problems directly.
- **Problems can't be Manipulate or goal-state Manipulate** (no `problem` in `content/src/step-types/manipulate*/schema.ts`).

## Scenes, video, 3D

- **MoleculeSwitch autoplay runs on `setInterval`**, outside the Scene clock (`site/src/molecule/MoleculeSwitch.tsx`). The motion gate sees only CSS and Web Animations, so it can't catch this kind of loop (`site/e2e/design.spec.ts`).
- **The site shows Scenes at 16:9 only**, no 9:16 on phones (`ScenePlayer.tsx`, `WatchScenePlayer.tsx`).
- **push-replay isn't in the Scene registry**, so a Draw-arrows replay can't go through the video path (`scenes/src/push-replay/PushReplay.tsx`).
- **Canvas (R3F) text is invisible to Sources sidecar timing** (`video/src/sidecar.ts`), so such numbers read "drawn" for the whole video.
- **Two mechanisms copy structure files to JSON for Scenes** (`pnpm structures:json` for Lesson 2, `sync:structures` for functional groups); unify them.
- **No condensed group labels** (CH₃, CO₂H) in the structure renderer; only an atom's `h` field gives H₃C– / –OH (`scenes/src/structure/render.ts`).
- **No-WebGL still shows orbital labels and chips but no lobe shapes** (`site/src/molecule/MoleculeDrawing.tsx`).
- **3D stage shrinks to ~96 px on long card Steps** on a 390×844 phone (L3 s09 Hint, s13); works but small (`site/src/styles/global.css`).

## Design gates

- **Tap targets under 48 px on phones.** At 390 px, Tap atoms/regions draw at 29–40 px (L1 s03, L4 s12, L5 s06/s09/s13, some Practice Problems) and L6 s03 bond bands at 16 px; `smallTargets` in `site/e2e/design.spec.ts` exempts bonds between two tappable atoms down to 24 px (TODO). Fix: bigger Tap drawings (sideways scroll on phones) or merged targets; the trade-off needs the owner's pick.
- **Phone fit only sees the first-answer path** (`playThrough` in `site/e2e/site.ts`); long Hints on other answer paths are unchecked.

## Submissions

- **Retention depends on traffic.** Clean-up runs on submit and at triage start; the daily cron Worker on the same D1 is unbuilt (`cleanUp` in `site/src/submissions/store.ts`, pre-public checklist).
- **Replies are drafted, never sent**, so `replySent` is never called and every email stays its full 90 days (`draftReply` in `site/src/submissions/triage.ts`).
