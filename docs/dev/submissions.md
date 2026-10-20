# Submissions (Suggest a Problem, Report a mistake)

v1 runs only under Cloudflare's local emulator: no deploy, test Turnstile keys, a placeholder D1 id. Going live is `docs/owner/pre-public-checklist.md`.

## Shape

- `site/functions/api/submit.ts` is a thin Pages Function adapter. Behaviour and tests live in `site/src/submissions/`, with D1, the Turnstile verifier and the clock injected (`SubmitDeps`).
- `site/src/submissions/store.ts` is the only module that writes rows. Its `Db` interface is the minimal D1 subset; `getPlatformProxy().env.DB` fits it.
- The site stays static: a plain Pages Function avoids putting Astro in SSR mode.
- The project has `site/wrangler.toml`, so use the pinned `pnpm exec wrangler` (site devDependency), not `cf`.

## Privacy rules (tested)

- The endpoint reads form fields only: never headers, cookies, `CF-Connecting-IP` or `request.cf`. The table has no IP / user-agent / cookie columns.
- `turnstileVerifier` sends `secret` + `response` only (no `remoteip`) and fails closed.
- Triage output never shows the reply email (`hasEmail` only). Drafted PR bodies and Problem files are checked for personal info and for any 6-word run copied from the submission (`assertPrivate`, `assertNoRawText` in `triage.ts`).

## Row states

`received → screened-out | drafted`, `drafted → accepted | rejected`; `moveTo` throws on anything else and stamps `decided_at` on a decision.

Retention (`cleanUp`, injected clock):
- reply email nulled at `replySent`, or 90 days after `created_at`;
- rejected / screened-out rows deleted 30 days after `decided_at`;
- accepted rows deleted by `problemMerged` once the Problem file merges.

Pages Functions have no Cron Triggers, so `cleanUp` runs before every insert and at the start of every triage run (`startRun`). A cron Worker is on the pre-public checklist; until then retention depends on traffic or triage.

## Triage

`pnpm triage <command>` (`site/src/submissions/triage-cli.ts`) against the local D1 in `site/.wrangler/state/v3`; the workflow is the `triage-submissions` skill.
- `accept` drafts the accepted reply **before** deleting the row, and prints it. Draft any other reply before `accept`; afterwards the row is gone.
- v1 sends nothing, so drafting a reply does not call `replySent`; the email stays until its 90 days run out. Reply text says "deleted within 90 days of when you wrote".
- Credit is `display_name` or "a Student"; draft ids are `<unit>-s-<first 8 of uuid>`.

## Turnstile

- Test keys: sitekey `1x00000000000000000000AA` (default in `submit.astro`, overridden by `PUBLIC_TURNSTILE_SITEKEY`), secret `1x0000000000000000000000000000000AA` (in `wrangler.toml` `[vars]`).
- Even the test secret calls `siteverify` over the network, and the widget script loads from challenges.cloudflare.com. Tests stay offline: Vitest passes a fake `verify`; `site/e2e/submission-form.spec.ts` routes the widget script to a stub that injects `XXXX.DUMMY.TOKEN.XXXX` and stubs `/api/submit` (`astro preview` serves no Functions).

## Local run

```sh
pnpm build                                    # repo root; builds site/dist
pnpm --filter @astratron/site db:migrate      # local D1
pnpm --filter @astratron/site pages:dev       # dist + functions; stop it afterwards
pnpm exec wrangler d1 execute astratron-submissions --local --json --command "select id,status from submissions"   # from site/
```

Tests: `submit.test.ts` / `triage.test.ts` use `getPlatformProxy({ persist: false })` and apply `site/migrations` themselves, so they never touch `.wrangler/state`. Copy that setup for new D1 tests.

## Site settings

`site/src/lib/site.ts`: `SITE_ADDRESS` (placeholder `astratron.pages.dev`) drives canonical URLs, sitemap and share tags; `PUBLIC = false` puts `noindex` on every page. Flipping `PUBLIC` also means removing the noindex e2e and unit checks (listed in the pre-public checklist).
