# Content module (`content/`)

Terms follow `GLOSSARY.md`. Numbers: ADR 0002. Step ids: ADR 0003. Field-by-field shapes live as comments in `content/src/step-types/<type>/schema.ts` (Step types) and `content/src/schema.ts` (everything else); read them there.

## Layout and build

- Tree: `content/subjects/<subject>/{subject.yaml, courses/, lessons/, problems/, structures/, data/, views.yaml, step-ids.lock.yaml}`. File name = `id` everywhere (build error otherwise).
- `buildContent(root)` returns every error at once as `<file relative to content root>: <message>`; a broken file is reported once, not again by the files that reference it. The site build calls it and fails on any error.
- Step type modules (`content/src/step-types/<type>/`, Explain included): `schema.ts` (Node only, zod: Step and Problem file shapes, build checks, structure hooks) and `rules.ts` (browser-safe, no zod, not even through an import: the resolved Step type, `secret` fields and their `blank`s, `render` for its Markdown fields, `start`/`takes`/`act`). Two tables tie them: `step-types/index.ts` (`@astratron/content/step-types`; the `Step` union, `Answer`, `PageStep`, `act`, `splitStep`/`joinStep` are worked out from it) and `step-types/schemas.ts` (zod, must have the same keys, so a missing entry fails to compile). `model.ts`, `schema.ts`, `shape.ts` and `build.ts` reach type knowledge only through them.
- The resolved Step type is hand-written beside its file shape: the built shape differs (Check Steps become their Problem, structures, Scenes and molecules resolve). Leaf types (Hints, Push, GoalStage) are hand-written too, and each `schema.ts` checks them against its zod shape (`true satisfies Agrees<…>`), so the two can't drift.
- Validation goes through the type's own `act` (`step-types/checks.ts`): the declared answer must be marked right, and each Hint with a condition must show on some wrong answer where the answers can be listed (choices, Rank orders, Numeric and Manipulate Hint values). A Hint shadowed by an earlier one is a build error. "Goal reached" is one `reached` (`sameValue` semantics) for the build and the player.
- Markdown: `md` (inline) for every text field; Explain `text` alone is block Markdown (`mdBlocks`, so lists work). Hard line breaks elsewhere: `<br>` or a trailing `\`. Numbers and formulas get the data face automatically.

## Lessons and Problems

- Shape rules (`shape.ts`): core 10–20 Steps (spec target 10–15), On-ramp 6–10; phases `hook, build+, check{2,4}, wrap`; at most 2 Explain Steps in a row; `prediction` only in the Hook; every graded item needs one fallback Hint (no condition) last and a Correct line.
- A new Lesson: add its id to the Unit's `lessons:` in `courses/<course>.yaml` **in Lesson order**, set `act`, `signature` (and `capstone: true` on the Unit's last Lesson), then `pnpm content:freeze` and commit the lock. An unfrozen Lesson is a build error.
- Check Steps need their Problem at `status: approved`. Lesson specs say "draft"; every built Lesson sets `approved` so the Check plays.
- Practice Problems enter the Bank just by existing with `unit:` set; nothing links them. Their `lesson:` must be in that Unit's `lessons:` list, so a Problem for Lesson N merges only after Lesson N is listed. Drafts are built but never drawn or shipped; On-ramp-tagged Problems are never drawn. Slug `practice` is reserved for the Practice Set page.
- Structure ids are global per Subject. Lesson-local drawings use a prefix (`fg-*`, `l3-*`, `card-*` for two-molecule pair cards) to avoid add/add merge conflicts; reuse an existing file when the atom ids fit (`estradiol`, `acetate`, `water`…).
- `pnpm structure <subject> <id> "<atom-mapped SMILES>" [--style full|lewis|line-angle] [--source "PubChem CID n"]` lays out a structure; atom ids are `a<map number>`. Hand-edit `letter`, `label`, `tag`, coordinates afterwards.
- PubChem check: a structure whose `source` names one "PubChem CID n" and has `data/pubchem/<n>.json` cached must match that formula's H count and valence-true lone pairs. Opt-in by caching the record; pair cards say "PubChem CIDs …" (plural) to skip it.
- Spec conformance: several tests read `docs/specs/unit-1/*.md` and compare Prompts, Hints, Correct lines and Source notes word for word (`content/test/lesson-0{2,5}`, `practice-problems`, `site/src/lib/lesson-0{6,8}`, `scenes/test/lesson-0{7,8}*`). Changing that wording means changing the spec in the same commit.

## Cited data (`{{file/key}}`)

- Any number in Lesson or Problem text is written `{{<data file>/<value key>}}`; the build swaps in the display string and attaches the value to the Step's Source note. Unknown refs are build errors. Display carries its unit, so write "{{methane/a.HCH}}", not "{{…}} degrees".
- `pnpm lint:numbers` covers code (`sceneCodeDirs` in `number-lint.ts`: `scenes/src`, `site/src/molecule`, `content/src`), not Lesson prose; reviewers catch typed numbers in YAML. The escape hatch `// cited-data: ok, <reason>` is for numbers that only look like chemistry (indices, layout px, radians).
- Data files: `data/<id>.yaml|json`, one per molecule or table. Experimental vs computed geometry is checked **per file**, so a re-optimised molecule gets its own file (`ethylene` experimental, `ethylene-b3lyp` computed). Keep CCCBDB-style keys (`r.CH`, `a.HCH`, `d.HCCH`) so cites survive regeneration. `decimals` on a value changes display only; the Source note shows the full value.
- Pipeline-written JSON (geometry, orbitals) is regenerated, not hand-edited; see `docs/dev/pipelines.md`.

## Answers out of the page (story 99)

- Each Step type's `secret` list (`rules.ts`, in `ANSWER_ORDER`) says what goes in the answer key. `splitStep`/`joinStep` (`@astratron/content/step-types`) split and rejoin through it (plus `answerCitations`); `site/src/lib/answer-key.ts` writes `/answers/<subject>/<lesson id>.json`, and the player fetches the key and grades only once it arrives (until then the type's `blank`s stand in). A type with no secrets (Explain) ships whole.
- A new field that reveals the answer goes on its type's `secret` list. `content/test/answer-fields.test.ts` fails in `pnpm check` on a schema field named like an answer (`correct*`, `hint*`, `reveal*`, `answer*`, …) that isn't on it or its `PUBLIC_ON_PURPOSE` list; `site/src/lib/step-types.test.ts` checks every built Step and Problem rejoins whole and leaks no key words; `site/e2e/course-map.spec.ts` and `site-shell.spec.ts` check the built HTML.
- Values cited only in answer fields travel in the key and join the Source note after answering. Anything cited in a shown field is on the page before answering, so a Step whose answer is a number must not cite (or name a formula containing) that number in its prompt, written `sourceNote`, figures or an Explore molecule. `real-content.test.ts` guards H-count leaks.

## Shared Step fields (reuse before adding)

Before adding a field or renderer feature: `git fetch`, grep `content/src/step-types/` (shared fields: `fields.ts`) on the default branch, and reuse what is there.

- Every Step/Problem: `figures` (static structure with `ring`, `outline`, `corner`, `caption`, `alt`, `large`), `aside` (button → dialog with a Scene or a figure table), written `sourceNote`, `molecule` (Explore in 3D; `card: true` inline 3D card; see `docs/dev/3d.md`).
- Graded: `revealScene` (secret; replaces the question's widgets once resolved), `scene` with `state` and `still: true` (poster, no controls).
- Multiple choice / Rank: structure cards via `options[].structure` / `items[].structure` with `hide`; Rank `revealTags` (secret); Hint conditions `match`/`includes`/`misses` (MC), `notFirst`/`notLast`/`before`/`above` (Rank).
- Numeric: `unitSymbol` (not `unit`: that is a Problem's Unit tag), `tolerance`, `signKey` (± button).
- Tap: `tappable.{atoms,bonds,regions}`, `outline`, `alt`, `tapOnly` (required in any Lesson with Draw-arrows Steps, and on that Lesson's Tap Problems), `replay` (secret push-replay).
- Draw arrows: `results` (first = drawn target), `hideTarget`, `marks` (HOMO/LUMO labels), `inBetween` copy, Hints on `from`/`to` incl. `sigma`.
- `manipulate` (slider on one Scene state) and `manipulate-goal` (`stages` with `goal`/`blocked`/`idle`; Scene `interact` contract in `docs/dev/scenes.md`).

## Adding a Step type

Content side: one folder plus one entry in each table.

1. `content/src/step-types/<type>/rules.ts`: the resolved Step interface, its answer shape, and a `StepRules` entry (`secret`, `blank`, `render`, `start`, `takes`, `act`; `page` for page-only fields). Answers must be JSON and `act` deterministic, so resume replays them. Reuse `oneShot` (`play.ts`) and `judgeChoice` (`choice.ts`) where they fit.
2. `content/src/step-types/<type>/schema.ts`: `step` (and `problem` if it can be a Problem), `check` (its own rules, then grading through its `act` via `actChecks`, then `gradedRules`), and `fileOnly`/`structures`/`open`/`card` if it needs them.
3. One entry in `step-types/index.ts` and one in `step-types/schemas.ts`.

Site side (until #99 lands; the engine plays every type through the table, nothing to add there): `site/src/lib/content.ts` `renderText` case, a view in `StepPlayer.tsx`, `site/e2e/site.ts` `playThrough` and a solver in `practice-set.spec.ts` if Problems use it.
