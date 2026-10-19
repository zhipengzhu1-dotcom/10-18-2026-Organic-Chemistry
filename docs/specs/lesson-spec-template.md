# Lesson spec template

A **Lesson spec** is the build-ready description of one Lesson, Step by Step. Agents build the Lesson file, its Problem files and its Scenes from it; the owner approves it by merging its PR. Copy this file to `docs/specs/<unit>/lesson-NN-<slug>.md` and fill every field. A field that does not apply says `n/a`, never blank.

Rules it encodes: [Decide the lesson anatomy and Step types](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/11), [Decide the Problem Bank and Submitted Problems flow](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/16), [Prototype: curved-arrow mechanism interaction](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/14), [Decide the Arcade Cosmos design system](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/18). Pilot: [Lesson 6](unit-1/lesson-06-resonance.md).

## Shape checks (the reviewer ticks these)

- [ ] 10–15 Steps (hard cap 20); 6–10 for an On-ramp
- [ ] Hook (1 Step) → Build → Check (2–4 Problems) → Wrap (1 Step)
- [ ] Never more than 2 Explain Steps in a row
- [ ] Every interactive Step has a generic fallback Hint
- [ ] Every Scene has screen-reader text and a reduced-motion poster frame
- [ ] Every chemistry number points at pipeline output with a Source note; none typed into the spec
- [ ] Every computed number is shown to the precision the chemistry supports (bond lengths: 2 decimals in Å), with the full values in the Source note
- [ ] A Tap-to-identify Step that sits among Draw-arrows Steps says in its prompt that it is tap-only
- [ ] Nothing reused from material excluded by the source's licence (e.g. "used with permission" figures)

---

## Lesson

| Field | Value |
|---|---|
| Id | `<unit>-l<NN>` (e.g. `u1-l06`) |
| Title | |
| Goal | one sentence: what the Student can do afterwards |
| Prerequisites | Lessons whose ideas this one uses, and which idea |
| Key idea | the one line on the Lesson-end screen |
| Check Problems | Bank ids, in order |
| Sources | each source with exact pages, and its licence |
| Structure drawing | line-angle / full Lewis, and which atoms and lone pairs are drawn explicitly. Every structure, structure cards in choices included, is drawn by the site's own renderer (every lone pair, every charged atom as a letter); RDKit.js parses and lays out, it never supplies the final drawing. |

### New Scenes

One row per Scene this Lesson introduces (reused Scenes are listed by id only).

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|

---

## Steps

One block per Step, in order.

### `<lesson-id>-sNN` · <Phase> · <Step type>

- **Prompt:** the words on screen.
- **Visual:** the structure(s) or Scene shown, by id.
- **Interaction:** what the Student does. Options are listed with ids (`a`, `b`, …).
  - Multiple choice may set `prediction: true` **in the Hook only**: every choice is accepted, there is no Hint or try count, the reveal follows at once.
- **Answer:** in the format for its Step type: option-id set; value + unit + ±tolerance; one order; atom/bond-id set; for Draw arrows see below.
- **Correct line:** the short "why" shown on a right answer.
- **Hints:** one row per anticipated wrong answer, first match wins, generic fallback last.

  | Wrong answer | Hint |
  |---|---|
  | … | … |
  | *(any other)* | generic fallback |

- **Reveal:** the answer with its worked reason, shown after the second wrong try.
- **Scene:** id, when it plays, screen-reader text.
- **Source note:** what is cited, or `n/a`.

#### Extra fields for Draw arrows

- **Start:** atom-mapped SMILES; every atom drawn has its map number.
- **Target:** atom-mapped SMILES of the result (or, for an open Problem, the full set of accepted results).
- **Pushes:** each correct push as `source → drop atom` (source = lone pair on atom n, or bond n–m), and whether pushes may come in any order.
- **In-between flags:** the copy shown for each live in-between state (over-octet, sextet), saying plainly that it is not a real structure.
- Hints are matched on the push, but grading is by result: a push is accepted when it is a step toward an accepted result.
- Two tries count **per push** (Hint, then that push is shown), so a three-push Step can show up to three Hints.
- **Drop targets** sit where the push's arrowhead is drawn, never only on atom centres: on the bond for lone pair → bond and bond → next bond, beside the atom for bond → atom. While dragging, every target is shown as a dashed spot. (The prototype found that atom-centre-only drops made most correct pushes fail or land on the wrong atom.)
- **Layout:** the target sits in a strip above the start on narrow screens, side by side on wide ones; the Step fits one phone screen without scrolling.

---

## Check Problems

One block per Problem, written in full (it becomes a Problem file in the Bank).

### `<problem-id>` · <Step type> · difficulty 1–3

- **Tags:** Unit, Lesson
- **Status:** `draft` (becomes `approved` on merge)
- then the same fields as a Step: Prompt, Visual, Interaction, Answer, Correct line, Hints, Reveal, Scene, Source note
- **Credit:** optional

---

## Practice Problems file

A Unit's Bank Problems beyond its Check Problems live in one file, `docs/specs/<unit>/practice-problems.md`, written in one session and approved in one PR ([Decide the content authoring and review workflow](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/52)). Example: [Unit 1](unit-1/practice-problems.md).

**Order of the file:**

1. Title, one paragraph on what the file holds, and links to the workflow and Unit tickets.
2. **Problem checks** (the reviewer ticks these):
   - [ ] Every core Lesson has a Problem at each difficulty 1, 2 and 3; the Unit has at least 20 Practice Problems (Check Problems don't count). The On-ramp has none.
   - [ ] No Problem duplicates a Check Problem (a molecule may come back only to ask a different question)
   - [ ] Every interactive Problem has a Hint for each anticipated wrong answer, plus a generic fallback
   - [ ] Every number points at cited data; none is typed in
   - [ ] Every Scene in a reveal has screen-reader text; every 3D viewer has its Describe text
   - [ ] Every Problem has a source line, and its source's licence allows adaptation
   - [ ] Every Tap-to-identify Problem in a Lesson that has Draw-arrows Steps says it is tap-only (a Practice Set can place it right after a Draw-arrows Problem)
   - [ ] A second agent re-solved every Problem blind before the PR; disagreements are fixed or listed at the top of the PR body
3. **Sources**: a table of every source with its licence and how many Problems use it, then what is excluded and why, then the Source note wording.
4. **Data and Scene additions**: new geometry files, Scene parameters and build-time sanity checks the Problems need beyond the Lessons'. `n/a` if none.
5. One `## Lesson N: <title>` section per core Lesson, its Problems in order of difficulty, each written as a Check Problem block (above) with one extra field after Tags and Status:
   - **Source line:** where the Problem comes from, in one line: "Adapted from MIT 5.12 PS1 Q1", "Adapted from LibreTexts Wade 1-20(b) and its solution", or "Original".

**Sources, in order of preference:** adapt from the Unit's own course source first (for Unit 1, MIT 5.12 Spring 2005: unused problem-set parts, then other problem sets and exams in the Unit's scope), then LibreTexts pages whose own licence tag is CC BY or CC BY-NC-SA; write fresh only for gaps. Never adapt OpenStax (its pages restrict generative-AI use), LibreTexts books remixed from OpenStax, CC BY-SA pages (they can't be relicensed under our NC terms), or "used with permission" figures.
