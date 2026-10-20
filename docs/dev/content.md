# Content module (`content/`)

Terms follow `GLOSSARY.md`. Numbers: ADR 0002. Step ids: ADR 0003. Field-by-field shapes live as comments in `content/src/schema.ts`; read them there.

## Layout and build

- Tree: `content/subjects/<subject>/{subject.yaml, courses/, lessons/, problems/, structures/, data/, views.yaml, step-ids.lock.yaml}`. File name = `id` everywhere (build error otherwise).
- `buildContent(root)` returns every error at once as `<file relative to content root>: <message>`; a broken file is reported once, not again by the files that reference it. The site build calls it and fails on any error.
- Resolved types (`model.ts`) are hand-written beside the zod file shapes (`schema.ts`): the built shape differs from the file shape (Check Steps become their Problem, Scenes and molecules resolve). Leaf types (Hints, Push, GoalStage) come from `z.infer`, so a leaf field added in the schema reaches the engine for free; a new Step-level field needs both files.
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

- `ANSWER_FIELDS` in `content/src/model.ts` is the one list of secret fields. `site/src/lib/answer-key.ts` strips them (plus `answerCitations`) into `/answers/<subject>/<lesson id>.json`; the player fetches the key and grades only once it arrives.
- A new field that reveals the answer goes in `ANSWER_FIELDS`; a new Step shape may also need `withKey` defaults. `site/e2e/course-map.spec.ts` and `site-shell.spec.ts` fail on a leak.
- Values cited only in answer fields travel in the key and join the Source note after answering. Anything cited in a shown field is on the page before answering, so a Step whose answer is a number must not cite (or name a formula containing) that number in its prompt, written `sourceNote`, figures or an Explore molecule. `real-content.test.ts` guards H-count leaks.

## Shared Step fields (reuse before adding)

Before adding a field or renderer feature: `git fetch`, grep `content/src/schema.ts` on the default branch, and reuse what is there.

- Every Step/Problem: `figures` (static structure with `ring`, `outline`, `corner`, `caption`, `alt`, `large`), `aside` (button → dialog with a Scene or a figure table), written `sourceNote`, `molecule` (Explore in 3D; `card: true` inline 3D card; see `docs/dev/3d.md`).
- Graded: `revealScene` (secret; replaces the question's widgets once resolved), `scene` with `state` and `still: true` (poster, no controls).
- Multiple choice / Rank: structure cards via `options[].structure` / `items[].structure` with `hide`; Rank `revealTags` (secret); Hint conditions `match`/`includes`/`misses` (MC), `notFirst`/`notLast`/`before`/`above` (Rank).
- Numeric: `unitSymbol` (not `unit`: that is a Problem's Unit tag), `tolerance`, `signKey` (± button).
- Tap: `tappable.{atoms,bonds,regions}`, `outline`, `alt`, `tapOnly` (required in any Lesson with Draw-arrows Steps, and on that Lesson's Tap Problems), `replay` (secret push-replay).
- Draw arrows: `results` (first = drawn target), `hideTarget`, `marks` (HOMO/LUMO labels), `inBetween` copy, Hints on `from`/`to` incl. `sigma`.
- `manipulate` (slider on one Scene state) and `manipulate-goal` (`stages` with `goal`/`blocked`/`idle`; Scene `interact` contract in `docs/dev/scenes.md`).

## Adding a Step type

Touch points, in order: `schema.ts` (field object, Step union, `problemFile` union) → `model.ts` (interface, `GradedStep`, `ANSWER_FIELDS`) → `shape.ts` `answerRules` → `site/src/engine/player.ts` (`Answer` shape, `judge` case; answers must be JSON and grading deterministic so resume replays them) → `site/src/lib/content.ts` `renderText` case → `answer-key.ts` `withKey` if needed → a view in `StepPlayer.tsx` → `site/e2e/site.ts` `playThrough` and a solver in `practice-set.spec.ts` if Problems use it.
