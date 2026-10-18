# Research: free hosting, donations, and Submitted Problem storage

Ticket: #6 (map #1). Researched 2026-10-18 against official pricing, terms and regulator pages, cited inline.
**This is not legal advice.** Items marked **[verify]** need a human, and ideally a lawyer or the FTC COPPA hotline (CoppaHotLine@ftc.gov), to check them before launch.

## Recommendation (TL;DR)

| Need | Pick | Why |
|---|---|---|
| Hosting | **Cloudflare Pages**, or Workers with static assets | Static requests are "free and unlimited". No non-commercial clause. Gives you Functions, D1 and Turnstile on the same free account. |
| Fallback host | GitHub Pages | Free for public repos (this repo is public), but has a 100 GB/month soft bandwidth limit and no backend. |
| Donations | **Ko-fi** (one-off) as the main button; **Liberapay** as an optional recurring link | Neither needs incorporation. Ko-fi takes no platform cut on one-off tips (secondary sources, **[verify]**). Liberapay takes no cut at all. |
| Submitted Problems | **Cloudflare Pages Function + D1, behind Turnstile** | $0. Needs no Student account. Keeps the data in one place under your control. Spam protection is built in. |
| Reply email | **Don't collect it in v1.** If you do, keep it optional, use it for one reply, then delete it | That pattern fits COPPA's one-time-response exception and GDPR data minimisation. |

## 1. Static hosting

| Host | Free allowance | Commercial / donation terms | Notes |
|---|---|---|---|
| **Cloudflare Pages** | 500 builds/month, 20,000 files, 25 MiB/file, 100 custom domains ([limits](https://developers.cloudflare.com/pages/platform/limits/)). "requests to static assets are free and unlimited" ([Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)) | No non-commercial clause found on the limits pages | Functions requests count against the Workers Free 100,000 requests/day ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). The same "free and unlimited" static-asset rule applies to Workers static assets ([billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)). |
| **GitHub Pages** | 1 GB site, 100 GB/month soft bandwidth, 10 builds/hour soft (no cap via Actions) ([limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)) | "not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site", nor sites "primarily directed at … facilitating commercial transactions" (same page) | Donations aren't mentioned. A donate *link* on an educational site isn't "primarily" commercial, but GitHub doesn't say so outright. **[verify]** Static only: no backend. |
| **Netlify Free** | 300 credits/month with a hard limit. 1 GB bandwidth = 20 credits, so about 15 GB/month if nothing else uses credits. A production deploy costs 15 credits ([credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)) | No non-commercial clause on the pricing page | Projects can be paused when credits run out (see that page's "resume paused projects" link). With frequent agent deploys and video-ready Scenes, the credit budget is tight. Netlify Forms submissions are free. |
| **Vercel Hobby** | 100 GB Fast Data Transfer, 1M function invocations ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)) | "Hobby teams are restricted to non-commercial personal use only." The same page says: "Asking for Donations **does not** fall under commercial usage." | It does allow donations, but the "personal use" framing and the 100 GB cap make it a weaker fit than Cloudflare. |

**Verdict:** Cloudflare has no bandwidth cliff for static assets, and its free tier also covers the backend and spam protection. Deploy from GitHub with Cloudflare's Git integration, or with a GitHub Action.

## 2. Donations (owner is an unincorporated individual)

| Platform | Individual OK? | Fees | Notes |
|---|---|---|---|
| **Ko-fi** | Yes | 0% platform fee on one-off donations on the free plan; 5% on shop sales and memberships. Stripe/PayPal processing (about 2.9% + $0.30) still applies. **Secondary sources only:** Ko-fi's help and pricing pages returned HTTP 403 to automated fetches, and third-party reports of the Gold price disagree ([schoolmaker](https://schoolmaker.com/blog/ko-fi-pricing), [ruzuku](https://www.ruzuku.com/learn/articles/ko-fi-pricing)). **[verify on ko-fi.com]** | Easiest setup: a hosted page plus an embeddable button. Payouts go to your own PayPal/Stripe. |
| **Liberapay** | Yes ("Anyone") | "Liberapay does not take a cut of payments". Processor fees average about 3% (Stripe) and 5% (PayPal) ([FAQ](https://liberapay.com/about/faq)) | Built for recurring giving: "One-time donations aren't properly supported yet". It is itself a non-profit. |
| **GitHub Sponsors** | Yes, but only for people who contribute "to an open source project" ([setup](https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account)) | 0% on sponsorships from personal accounts; up to 6% from organisation accounts ([fees](https://docs.github.com/en/sponsors/sponsoring-open-source-contributors/about-sponsorships-fees-and-taxes)) | Requires an application, 2FA, Stripe Connect and a W-9 or W-8BEN. Donors need GitHub accounts, which Students mostly won't have. The site's code is MIT, so you'd qualify, but it's a poor fit for a general audience. |
| **Open Source Collective** (Open Collective fiscal host) | Via the collective | Fee not stated on the eligibility page | Requires "an open source license" or a clear open-source connection ([acceptance criteria](https://docs.oscollective.org/interested-in-joining-osc/acceptance-criteria.md)). A CC BY-NC-SA learning site is a borderline fit. **[verify]** Worth revisiting if you want transparent public books. |
| **Stripe Payment Links** | Sign-up eligibility for individuals isn't stated on the pricing page **[verify]** | 2.9% + 30¢ for domestic cards. Payment Links cost nothing extra ([pricing](https://stripe.com/pricing)) | Lowest fees with full control, but you handle receipts and the account yourself. |
| **PayPal Donate button** | **[verify]** whether a personal account qualifies | 2.89% + $0.49 standard. The 1.99% charity rate needs PayPal's "eligibility, application, and pre-approval" ([fees](https://www.paypal.com/us/business/paypal-business-fees)) | The $0.49 fixed fee hurts small tips. |

**Tax and wording:** donations to an unincorporated individual are **not tax-deductible**, so the ask must not imply that they are. They are likely taxable income to the owner. **[verify with a tax professional]**

### How Khan Academy presents its ask ([donate.khanacademy.org](https://donate.khanacademy.org/))

- Mission headline: "Donate to Unlock a World of Learning", with "for everyone, everywhere".
- Reciprocity framing: "You or someone you care about has experienced the power of free, world-class learning … Pay it forward."
- A concrete impact unit: "every $1 donated equals 100 minutes of learning".
- The form defaults to one-time, with currency choice.
- Its 501(c)(3) tax-deductible line does **not** carry over: we can't say that.

**To borrow for #15/#16:** a short mission line, a "pay it forward" appeal to people who learned something, one honest impact unit (e.g. "keeps the site free and ad-free for N students"), and no nag walls.

## 3. Backend for Submitted Problems

| Option | Free limits | Account needed by Student? | Fit |
|---|---|---|---|
| **Cloudflare Pages Function + D1** | D1: 5M rows read/day, 100k rows written/day, 5 GB total. On overflow, queries error until 00:00 UTC ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)). Workers: 100k requests/day ([pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | No | **Best.** Same account as the host. The owner reviews submissions through a small agent-built admin view or the dashboard. |
| **Supabase Free** | 500 MB DB, 2 active projects, "paused after 1 week of inactivity" ([pricing](https://supabase.com/pricing)) | No (anon insert + row-level security) | A low-traffic submissions table could get paused, so it's a worse fit. |
| **GitHub Issues/Discussions** | Free | **Yes:** GitHub requires "age 13 or older" ([ToS B.3](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)) | Breaks the no-accounts rule and shuts out under-13s. Posts are public before vetting. Rejected. |
| **Google Forms** | Free | No, unless "verified" email collection is on. That mode requires sign-in; the "responder input" mode doesn't ([help](https://support.google.com/docs/answer/139706)) | It works, but it's off-brand (an iframe or redirect), has no Turnstile, and puts data in Google Drive. Acceptable as a stopgap. |
| Netlify Forms | Free, unlimited submissions ([credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)) | No | Only relevant if Netlify is the host. |

**Spam: Cloudflare Turnstile.** Free, with "Unlimited challenges", up to 20 widgets and 10 hostnames per widget ([plans](https://developers.cloudflare.com/turnstile/plans/)). It processes IP address, TLS fingerprint, User-Agent and sitekey "solely to detect and block bots", not "to identify, profile or target any individuals". Cloudflare acts as processor for bot-blocking and as controller for improving Turnstile ([Turnstile privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/)). Verify the token server-side in the Function. Add a rate limit and a length cap.

**Suggested record:** `{id, created_at, unit_id, problem_text, answer_text, optional_reply_email, status}`. Don't store IP addresses. Show nothing publicly until the owner vets it, which matches the GLOSSARY: a Submitted Problem enters the Problem Bank "only after review".

## 4. Privacy obligations

### COPPA (US, under 13)

- **Is the site "directed to children"?** The FTC weighs subject matter, visual content, animated characters, audience composition, intended audience and more ([16 CFR 312.2](https://www.law.cornell.edu/cfr/text/16/312.2)). An undergrad and high-school organic chemistry site is very likely *general audience*, not child-directed. Keep the marketing and visuals aimed at teens and adults. **[verify]** The FTC itself won't opine on specific sites (COPPA FAQ D.3).
- **General-audience sites** are covered only on "actual knowledge" that a user is under 13 (FAQ A.12). There is no duty to ask ages. If a submission reveals that a child is under 13 (e.g. "I'm 11"), you must "meet COPPA's notice and parental consent requirements or delete the child's information" (FAQ H.6) ([FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).
- **Personal information** includes name, online contact information (email), persistent identifiers such as an IP address or cookie ID, and photos or audio of a child ([312.2](https://www.law.cornell.edu/cfr/text/16/312.2)). The free-text Problem body isn't personal information *unless* it contains one of those identifiers, so moderate submissions and strip any identifiers before anything is published (FAQ F.1–F.2 on prescreening).
- **Reply email:** the one-time-response exception lets you reply once, then you must "delete the child's online contact information from your records promptly after you send your response" (FAQ H.4, I.2). Designing every optional email as reply-once-then-delete makes the flow safe whatever the Student's age.
- **Don't add an age gate** unless it's neutral. Checkboxes like "I am over 12" are not acceptable (FAQ H.3, D.7).
- **Amended Rule:** published 2025-04-22, effective 2025-06-23, compliance required by 2026-04-22 ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)). It limits retention to what the purpose needs and forbids keeping data indefinitely ([FTC press release](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data)). Write a retention rule down, e.g. "reply emails deleted after reply or after 30 days".

### GDPR (EU visitors)

- The consent age for "information society services" is 16, or lower down to 13 where member-state law sets it ([Art. 8](https://gdpr-info.eu/art-8-gdpr/)). So **don't rely on consent** for minors. Collect no personal data for the Problem itself, and for the optional email rely on the request itself: the Student asks for a reply. Whether Art. 6(1)(b) or 6(1)(f) is the right legal basis is **[verify]**.
- Minimise and disclose: a short privacy notice next to the form (what's stored, why, how long, who processes it: Cloudflare, plus the donation platform when someone donates), a deletion contact, and no analytics cookies. Progress kept in localStorage stays on the device and isn't sent anywhere.
- Turnstile's processing of IP and fingerprint is for bot-blocking with Cloudflare as processor (above), so mention it in the notice.

### Practical privacy checklist for v1

1. Submission form: Problem text plus an answer, no name field. A visible hint: "Don't include your name, school or contact details."
2. Optional email box labelled "only if you'd like a reply; we delete it after replying." Purge it automatically after the reply, or after N days.
3. Turnstile verified server-side. No IP stored. No third-party analytics on the form page.
4. The owner vets every submission before anything is public, and strips personal info.
5. One plain-language privacy page covering COPPA and GDPR. Donation processing happens on Ko-fi's or Liberapay's side, under their privacy policies.
6. **[verify]** Have a human (lawyer or COPPA hotline) check the "general audience" call and the privacy page before launch.

## Gaps and things not verified

- Ko-fi's fees and Gold price came only from secondary sources: Ko-fi's site blocked automated fetches.
- I didn't fetch Netlify's Self-Serve Subscription Agreement or its Acceptable Use Policy.
- Whether Stripe and PayPal personal accounts can take donations, and how donation income is taxed for an individual (US).
- How Google Forms "Limit to 1 response" interacts with sign-in: the help page I read was truncated.
