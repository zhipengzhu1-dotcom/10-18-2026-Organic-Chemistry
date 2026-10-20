# Implementing specs and tickets here

Repo rules for `/implement-spec` and `/implement`. The skills under `.claude/skills/` are vendored and hash-locked (`skills-lock.json`); these rules adapt them to this repo, so the skills stay as they are.

## Integration

- The default branch is the integration branch. Each finished ticket gets its own PR into it, with `Closes #<n>` in the body.
- A merger agent merges the PR once CI is green (owner decision 2026-10-20). The owner reviews afterwards.

## Done means green on GitHub

- A ticket is merged only when GitHub CI is green on the pushed commit: `gh pr checks <pr> --watch` or `gh run watch <run-id>`. Local gates passing is the entry ticket, not the finish line.
- A **cancelled** job counts as red until explained: it is how a job hitting its time limit shows up.

## Ticket comments

Comment on the ticket when work starts, and again when it merges, naming the merge sha.

## Shared Step fields and renderer features

Before adding one: read the module's notes in `docs/dev/`, `git fetch origin`, and grep the content schema on the default branch (`content/src/schema.ts`). Reuse what a merged ticket already added.

## Implementers

- Run `pnpm check` before reporting done. The full suite (`pnpm check:full`: browser tests, video stills) is CI's job; for Scene work, also run `pnpm video stills --changed` (`docs/dev/video.md`).
- Run git as plain, separate commands from the worktree root.
