# Before going public

v1 is finished when it runs on your computer and passes every check. Putting it on the internet is a separate step you take later, when you choose. This list is everything that has to happen first, in a sensible order. Nothing here is needed to review v1.

You don't need to do the technical steps yourself. Each one says who does it. "An agent" means you ask Claude to do it and approve its pull request.

## 1. Decisions only you can make

- [ ] **Privacy page.** Read the privacy page on the site (footer link "Privacy") and confirm the wording is true and plain.
- [ ] **Who the site is for.** The plan treats AstraTron as a site for a general audience, not one aimed at children under 13. That call is what keeps it outside the US children's-privacy rules (COPPA). Confirm it, and decide whether the privacy page should say so (it doesn't yet).
- [ ] **NIST data licence.** The 3D shapes and bond lengths come from NIST's CCCBDB database (Standard Reference Data 101). Read NIST's terms and confirm the site may show and redistribute numbers derived from it, with the credit it already gives in every Source note.
- [ ] **Analytics.** Decide whether to add any visitor counting. v1 has none, and the privacy page says so. If you add some, the privacy page has to change too.

## 2. Accounts and names you set up

- [ ] **A domain.** Register the site's address (for example `astratron.org`). You do this at a registrar, or in your Cloudflare account.
- [ ] **A site email address.** Set up `hello@<your domain>` with Cloudflare Email Routing, forwarding to your own inbox. Also set up the free sending route, so the one reply a Mistake-report sender can ask for can actually be sent. (Until then, replies are only drafted, never sent.)
- [ ] **Ko-fi page.** Publish the Ko-fi page that the Donate button points to.
- [ ] **Turnstile keys.** In your Cloudflare account, create a Turnstile widget for the domain. It gives two keys: a site key (public) and a secret key (private). The site now uses Cloudflare's test keys, which let everything through.

## 3. Changes an agent makes in the code (one pull request)

Give the agent the domain, the Ko-fi address and the Turnstile site key, then ask it to:

- [ ] Set `SITE_ADDRESS` in `site/src/lib/site.ts` to the real domain (it is `https://astratron.pages.dev` now). The sitemap, links and share images all follow it.
- [ ] Set `KOFI_URL` in the same file to your Ko-fi page (it is `https://ko-fi.com/astratron` now).
- [ ] Set `PUBLIC = true` next to it in `site/src/lib/site.ts`, so every page drops `noindex` and search engines may list the site. Also remove the browser test that checks for it ("every page of the site carries noindex" in `site/e2e/definition-of-done.spec.ts`) and the `PUBLIC` check in `site/src/lib/site.test.ts`.
- [ ] Put the Turnstile **site key** in the build setting `PUBLIC_TURNSTILE_SITEKEY` (read by `site/src/pages/submit.astro`). Put the **secret key** into Cloudflare as a Pages secret named `TURNSTILE_SECRET`. The secret never goes in the code; delete the test secret from `site/wrangler.toml` at the same time.
- [ ] Add the contact line `hello@<your domain>` to the privacy page (it has none yet).
- [ ] Add a favicon (the small icon in the browser tab), made from `AstraTron Icon.jpg`.

## 4. Things an agent sets up in Cloudflare (with you watching)

- [ ] **The database.** Create the real D1 database `astratron-submissions` for the Suggest-a-Problem / Report-a-mistake form, apply its tables, and put its id in `site/wrangler.toml` (it is all zeros now).
- [ ] **A daily clean-up job.** Cloudflare Pages can't run anything on a timer, so v1 deletes old form entries only when someone sends the form or when you triage. Before going public, add a tiny separate Cloudflare Worker with a daily timer ("cron trigger") that runs the same clean-up on the same database. This keeps the privacy page's promise (emails gone after 90 days) even in quiet weeks.
- [ ] **Deploy.** Connect the repository to Cloudflare Pages and deploy. Then check the live site: the home page, one Lesson, the form (send a test Problem), and that the Donate button reaches Ko-fi.

## 5. GitHub settings

- [ ] **Make the checks required.** In the repository's settings on GitHub, add a branch protection rule for the main branch that requires the CI checks named `test` and `pipelines` to pass before anything can merge. CI already runs them on every pull request; this setting makes a red check actually block the merge. An agent can do it with you, or you click Settings → Branches → Add rule.

## 6. Last look

- [ ] Open the live site on your phone, play one Lesson, and send one test Mistake report.
- [ ] Search for the site name a few days later, to confirm search engines can now see it.
