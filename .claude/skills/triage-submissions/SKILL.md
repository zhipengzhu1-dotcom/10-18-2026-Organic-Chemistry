---
name: triage-submissions
description: Triage new Submitted Problems and Mistake reports from local D1 into draft Problem-file and fix PRs, with replies drafted as text.
disable-model-invocation: true
---

# Triage submissions

Turn new rows in the submissions table into PRs the owner reviews for chemistry alone. Every row stays **private**: its text lives in D1 and in your context, and reaches the repo only as a Problem file or fix you wrote. The only GitHub objects you create are branches and PRs whose bodies `pnpm triage` printed.

All row access goes through `pnpm triage` (run `pnpm triage` alone for its usage). It reads the local D1 in `site/.wrangler/state`. It never shows you a reply email; `hasEmail` says whether one exists.

## Steps

1. **Start the run.** `pnpm triage start`. It applies the retention rules first (Pages has no cron), then prints the received rows with mechanical flags. Done when you hold the JSON list; an empty list ends the run.
2. **Screen each row.** Screen out a row that has a `personalInfo` or `spam` flag, is off-topic for organic chemistry, duplicates a Bank Problem (`duplicateOf` lists likely ones; read them), or is a Mistake report you find is not a mistake. `pnpm triage screen-out <id>`. Done when every row is screened out or kept.
3. **Draft each kept Submitted Problem.** From a clean branch off the integration branch:
   - Write a full Problem file in your own words in the scratchpad: id = the row's `draftId`, its `unit`, a real `lesson`, `difficulty` 1–3, `status: draft`, `source: Submitted Problem`, `credit` = the row's `credit`, the answer, a Hint per likely wrong answer plus a generic fallback, `correct` and `reveal`. Numbers go through `{{file/key}}` cites (ADR 0002). Match the shape of the files in `content/subjects/organic/problems/`.
   - `pnpm triage draft <id> <file>` validates it and adds it to the Bank. Fix and rerun on any error.
   - `pnpm content:build` and `pnpm lint:numbers` pass.
   - Commit only that file on the printed branch and open a PR with the printed body, verbatim: `gh pr create --title "Submitted Problem <draftId>" --body "<prBody>"`.
4. **Fix each confirmed Mistake report.** On its own branch, correct the built Lesson or Problem file that `target_id` names (a Problem id, or `<lesson>#<step>`; Step ids stay frozen, ADR 0003). Then `pnpm triage fix <id> "<one-line summary in your words>"`, run the content checks, commit and open the PR with the printed branch and body.
5. **Draft the replies.** For each row with `hasEmail`, `pnpm triage reply <id> screened-out` now, or `accepted` / `rejected` once the owner decides. Hand the text to the owner. Nothing is sent in v1, so the email stays until its 90 days run out.
6. **Report to the owner**: rows screened out (with the reason), PRs opened, reply drafts. Keep raw submission text and any email out of the report.

## After the owner decides

- PR merged: `pnpm triage accept <id>` (the row is deleted; the published file remains).
- PR closed unmerged: `pnpm triage reject <id>` (deleted 30 days later by the next run).
