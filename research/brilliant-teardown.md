# Brilliant.org lesson and layout teardown

Research for issue #8 (map: #1). Browsed 2026-10-18 in a headless Chromium (agent-browser 0.27.1), signed out, at 1440x900 (desktop) and 390x844 (phone). Brilliant's own help centre is the primary source for anything behind the login. Screenshots are in [`brilliant-teardown/`](brilliant-teardown/).

Brilliant is described here in our glossary terms (Course › Unit › Lesson › Step). Brilliant is renaming its own terms right now. Its help pages say: "courses are now topics, levels are units, and lessons are concepts" ([help: free vs Premium][free-vs-premium]). So Brilliant's **topic ≈ our Course**, **level/unit ≈ our Unit**, and **concept/lesson ≈ our Lesson**. Brilliant's "exercise" or "problem" is close to our Step and Problem.

## Coverage and limits

| Surface | Reached? | Notes |
|---|---|---|
| Home page | Yes | [01](brilliant-teardown/01-home-desktop.png), [mobile](brilliant-teardown/20-mobile-home.png) |
| Course catalogue (`/courses/`) | Yes | [02](brilliant-teardown/02-courses-desktop.png), [03](brilliant-teardown/03-courses-science-expanded.png) |
| Course page / course map (`/courses/puzzle-science/`, "Scientific Thinking") | Yes | [04](brilliant-teardown/04-course-page-desktop.png), [mobile](brilliant-teardown/20-mobile-course.png) |
| A real Brilliant Lesson (concept) | **No, gated** | "Start" on the first Lesson goes to the `/welcome/` onboarding funnel. It asks for motivation, Koji's voice, then **age** ([06-welcome-05](brilliant-teardown/06-welcome-05.png)), then sign-up. I stopped at the age prompt and entered no personal data. |
| A free, ungated Brilliant activity, end to end | Yes | Brilliant K–5 Math Practice (beta) "Complements of 10", 15 Problems ([08](brilliant-teardown/08-practice-step01.png)–[15](brilliant-teardown/15-practice-settings.png)). This is the only Step player reachable without an account, so the feedback, progress and mobile findings below come from it. |
| Pricing | Yes | [16](brilliant-teardown/16-pricing.png) |
| Khan Academy donate | Yes, nothing submitted | [30](brilliant-teardown/30-khan-donate-desktop.png), [31](brilliant-teardown/31-khan-donate-mobile.png), home banner [33](brilliant-teardown/33-khan-home-desktop.png), [32](brilliant-teardown/32-khan-home-mobile.png) |

**Tooling note:** the Claude-in-Chrome extension would not start. Two Chrome browsers are connected and choosing one needs the user. I used the local `agent-browser` CLI instead, which gave screenshots and a phone-width viewport. WebFetch was not needed.

## 1. Page layout and navigation

- **Marketing pages** use a very small header: logo, "Topics", "Sign in", and a green "Sign up" pill. The home page has a full-bleed hero: a big serif headline on the left, and a looping product video on a white rounded card on the right. Two calls to action follow: "I'm a learner" (solid green) and "I'm a parent or teacher" (ghost button) ([01](brilliant-teardown/01-home-desktop.png)).
- **The catalogue** groups courses by subject (Math / Programming & CS / Data & Science). Each course is one row: an icon, a grade band in small caps ("GRADES 8–11"), the title, an optional "NEW" pill, and a one-line pitch. A row expands to show its sub-courses ([02](brilliant-teardown/02-courses-desktop.png)). This is the same shape as our Subject › Course.
- **The course page** is a two-column layout on desktop. The left column is a sticky card with the course icon, title, pitch and counts ("40 Lessons · 557 Exercises"). The right column is the course map ([04](brilliant-teardown/04-course-page-desktop.png)). On a phone the columns stack, and the card sits above the map ([mobile](brilliant-teardown/20-mobile-course.png)).
- **Inside a Lesson** (seen in the onboarding player, which uses the same shell) everything else disappears. The only chrome is a back arrow, a segmented progress bar across the top, and a mute toggle. The prompt sits at the centre, and one full-width "Continue" button is pinned near the bottom ([06-welcome-05](brilliant-teardown/06-welcome-05.png)).

## 2. Course map shape

- The map is a **vertical winding path of circular nodes**, one node per Lesson, grouped under **level banners** ("LEVEL 1 · Gears"). Our equivalent is Units. A floating card near the bottom shows the next Lesson's name and a big yellow "Start" button ([04](brilliant-teardown/04-course-page-desktop.png)).
- Scientific Thinking: 6 levels and 40 Lessons. Levels hold 5–10 Lessons each, and **every level ends with a "Level Review" node**. That review matches our Practice Set closing a Unit.
- Node states: the current node is gold with a bouncing mascot pin. Later nodes are grey, with their labels faded.
- Below the map, the course page lists every Lesson as plain text, followed by a course description, "Topics covered", and "Prerequisites and next steps". This flat list helps SEO and screen readers.

## 3. Step types and Steps per Lesson

A Brilliant Lesson could not be opened without an account, so these counts come from Brilliant's own numbers and the ungated practice:

- **About 14 Steps per Lesson.** Scientific Thinking advertises 557 exercises across 40 Lessons. Our glossary's 10–15 minute Lesson fits this.
- **Practice sets** come in two sizes: "Quick check · 5" or "Practice · 15" Problems, picked in settings ([15](brilliant-teardown/15-practice-settings.png)). The order is **shuffled on each load**: the first Problem was 8+? on desktop and 9+? on mobile.

Step types observed, or described in Brilliant's own captions:

| Step type | Evidence |
|---|---|
| **Pick one from a number pad** (tap a button) | The K–5 practice: a row of 0–10 circle buttons under the visual ([08](brilliant-teardown/08-practice-step01.png)) |
| **Visual model plus labelled slots** (the answer fills a slot inside the diagram) | The ten-frame with Blue / Orange / Total cards; the empty slot gets a heavy outline ([08](brilliant-teardown/08-practice-step01.png)) |
| **Single-choice cards** (radio tiles) | The onboarding "What motivates you to learn?" Step ([06-welcome-02](brilliant-teardown/06-welcome-02.png)) |
| **Free numeric input** | The onboarding "How old are you?" Step ([06-welcome-05](brilliant-teardown/06-welcome-05.png)) |
| **Narration / explainer Step** (text plus mascot, Continue only) | "I'm here to help if you ever get stuck." ([06-welcome-04](brilliant-teardown/06-welcome-04.png)) |
| **Drag tiles into place** | Home-page video caption: "draggable answer tiles for each term" (algebra expansion) |
| **Manipulate a live simulation or graph** | Home-page hero video caption: "marbles added to a container as a graph updates" ([01](brilliant-teardown/01-home-desktop.png)) |
| **Match / transform graphs** | Home-page caption: "graphing transformations, polynomial matching, and area models" |

Brilliant describes its Lessons only as "solve problems, see visual explanations, and build your understanding step-by-step" ([help: getting started][getting-started]).

## 4. Feedback on right and wrong answers

All observed in the K–5 player, which answers instantly on tap with no separate "Check" button:

- **Wrong, first try:** a pink panel slides up from the bottom of the card. It shows a "↺" icon, the label **"TRY ONCE MORE"**, and a *targeted hint*: "Look at the blue dots, then count the orange dots that complete 10." A black "Try again" button resets the Step ([09](brilliant-teardown/09-practice-wrong.png)).
- **Wrong, second try:** the label becomes **"KEEP LEARNING"**, the panel says "The answer is 2.", and the button becomes "Continue". The progress square for that Problem turns pink ([10](brilliant-teardown/10-practice-second-wrong.png)). So the rule is **two attempts, then reveal and move on**. A Student can never get stuck.
- **Right:** a green panel with a "✓", the label **"CORRECT"**, and the *worked equation* "2 + 8 = 10". The progress square turns green ([12](brilliant-teardown/12-practice-correct.png)).
- **End of set:** "Excellent!" with three stats: **First try 93% / Eventually correct 93% / Completed 15 of 15**. Below them is a "Next action" sentence and a "Next quiz" button ([14](brilliant-teardown/14-practice-finish.png)).
- The feedback panel always sits in the same place, at the bottom of the card where the answer pad was. The primary button stays in the same spot through answer → feedback → next, so a thumb never has to move.

## 5. Hints and help

- **Hints are built into the wrong-answer panel** (see above), not hidden behind a separate hint button.
- In logged-in Lessons, help comes from **Koji**, an AI tutor that "can see exactly what you're working on — including the interactive elements on screen". It "guides you through the thinking step by step, without ever just giving you the answer". It can also highlight or rearrange on-screen components ([help: Koji][koji]). Koji is the main thing Premium sells. Free users get only a limited preview ([help: free vs Premium][free-vs-premium]).
- The ungated practice adds a collapsible **"Skill guide"** and **"FAQ"** under each set, plus an ⓘ "About this practice" paragraph written for parents and teachers ([08](brilliant-teardown/08-practice-step01.png)).

## 6. Progress and streak UI

- **Inside a Lesson:** a segmented bar across the top, one segment per section ([06-welcome-05](brilliant-teardown/06-welcome-05.png)). In practice sets it becomes a row of small squares, one per Problem, coloured green or pink as you go ([12](brilliant-teardown/12-practice-correct.png)), with "PROBLEM n OF 15" in small caps.
- **Course level:** node states on the map (§2).
- **Streak:** the number of days in a row with learning. A day counts if you "complete either 3 problems or a full concept" (Lesson). Up to 2 **Streak Charges** (battery icons) can be earned, and one is spent automatically to save a missed day ([help: streak][streak], [help: streak charge][streak-charge]).
- **XP and Leagues:** XP per Lesson or Problem. Weekly 30-person Leagues, promotion and relegation, and 10 tiers named after elements, Hydrogen → Einsteinium ([help: XP][xp], [help: leagues][leagues]). **Our map rules out XP, badges and leaderboards (#1), so this is out of scope.** Only the streak rules are worth borrowing.

## 7. Motion and transitions

- Transitions are short: 100–300 ms fades and colour changes (`opacity 0.1s linear`, `0.3s ease-in-out`, `background 0.15s`). The stylesheets have 2 `prefers-reduced-motion` rules (read from the live CSS).
- Feedback panels slide up from the bottom. Buttons have a pressed, **3D "ledge"**: a darker bottom border on the yellow "Start" and green pills ([04](brilliant-teardown/04-course-page-desktop.png)).
- The course map animates: the current node pulses and the mascot pin bobs. Marketing pages autoplay looping product videos, each with a Pause button.
- Sound effects are on by default in practice, with a "Sound" switch in settings ([15](brilliant-teardown/15-practice-settings.png)). Koji has spoken voice lines (onboarding offers "Melodic" or "Deep", plus a "Voice on" switch ([06-welcome-03](brilliant-teardown/06-welcome-03.png))).

## 8. Typography and colour

- **Typefaces** (computed styles): headlines use **"CoFo Robert"**, a high-contrast serif. Body and UI use **"CoFo Brilliant"**, a custom grotesk. Small-caps labels ("PROBLEM 1 OF 15", "GRADES 8–11", "LEVEL 1") are used everywhere for metadata. Answer cards ("Blue / Orange / Total") use a monospace face.
- **Colour:** white or warm off-white backgrounds. A **saturated green** (`rgb(41,204,87)`) is used for sign-up, "learner" and "correct". **Yellow/gold** is the course map's "you are here" and Start colour. Blue/orange appear as *data* colours inside diagrams. Pink (`#fde` range) is for wrong answers. Near-black pill buttons are used for in-Step actions.
- **No dark mode:** zero `prefers-color-scheme` rules in the live CSS.
- Shapes are large and rounded: 54–56 px pill buttons, 16–24 px card radii, and thin grey borders instead of shadows.

## 9. Mobile behaviour

- No horizontal scroll at 390 px (`scrollWidth == innerWidth`).
- The course page stacks the info card above the map, and the "Start" card stays pinned to the bottom of the viewport ([20-mobile-course](brilliant-teardown/20-mobile-course.png)).
- In practice, the sidebar becomes a ☰ menu. The Problem card goes full width, and the 0–10 pad wraps into a 4-column grid of large tap targets ([20-mobile-practice](brilliant-teardown/20-mobile-practice.png)).
- Brilliant also pushes its native iOS and Android apps (store badges on the home page). Streak reminders lean on an iOS home-screen widget ([help: streak][streak]).

## 10. Free vs paid gating

From Brilliant's help centre ([help: free vs Premium][free-vs-premium], [help: without Premium][without-premium]) and the pricing page ([16](brilliant-teardown/16-pricing.png)):

- **An account is required for any real Lesson.** Even Lesson 1 sends you through onboarding (goal → voice → age → sign-up).
- **Free tier:** **2 "keys" a day**, each unlocking one Lesson or practice set, reset at local midnight. Free users must go **in order (no skipping ahead)**, see **occasional ads between Lessons**, and get only a limited Koji preview.
- **Premium:** $30/month Individual or $40/month Family (6 seats). Annual billing saves 33%. It is unlimited, ad-free, lets you jump anywhere, and includes full Koji.
- The only truly open content is the **K–5 Math Practice beta** (no login). Each page carries a "Get started for free" upsell banner.

## 11. Khan Academy donate flow (for our donate button)

- **Where it appears:** "Donate ↗" sits in the **main header** next to Log in / Sign up. Logged-out visitors also see a **dismissable full-width donation band at the top of the home page**: "Every $1 = 100 minutes of learning." It includes a Sal Khan quote, One time/Recurring and Monthly/Yearly toggles, amount chips ($12/$20/$35/$75/Other), and "Give now" ([33](brilliant-teardown/33-khan-home-desktop.png)). There are further links mid-page and in the footer ("support us").
- **The donate page itself** (`donate.khanacademy.org`, hosted by Classy) has a photo hero with the pitch on the left and a white card on the right ([30](brilliant-teardown/30-khan-donate-desktop.png)):
  - **"Give once | Monthly ♥"**, with Monthly preselected.
  - A 3×2 amount grid ($5 / $10 / **$25 SUGGESTED** / $50 / $100 / $200), a custom amount with a currency picker, and an optional "Dedicate my donation".
  - One big black CTA that reads "Choose an amount" until an amount is picked.
- **Messaging:** "Khan Academy is supported by less than 1% of users". "Every $1 donated equals 100 minutes of learning". "No ads, no paywalls, and no pressure". The page ends with tax-deductibility, employer matching, and an FAQ (cheque, stock, crypto, managing a recurring gift).
- On a phone, the hero text sits above the donation card in a single column ([31](brilliant-teardown/31-khan-donate-mobile.png)).

## Borrow

1. **A single-focus Step player.** No site chrome inside a Lesson. Use a segmented progress bar, a centred prompt and visual, and **one primary button in a fixed bottom spot** that moves Answer → Feedback → Continue.
2. **Instant feedback panel with two tries.** Try 1 wrong: a *targeted hint* ("Try once more"). Try 2 wrong: show the answer and continue ("Keep learning"). Right: "Correct" plus the *worked reason* (for us, e.g. the curved-arrow step or the rule that applied). Never leave a Student stuck.
3. **End-of-Lesson / Practice Set summary.** Show first-try %, eventually-correct %, completed n/N, and one "next action" sentence. This is light motivation and fits our no-XP rule.
4. **A course map as a vertical path of Lesson nodes, grouped by Unit banners, each Unit ending in a review node** (our Practice Set). Pin a "Continue: <next Lesson>" card on mobile. Also render a **plain-text list of every Lesson** under the map, for SEO and screen readers.
5. **Streak rules:** a day counts after 3 Problems *or* 1 full Lesson. Allow up to 2 automatic "freezes" so one missed day doesn't reset it. We can keep this in localStorage.
6. **Answers inside the diagram:** the empty slot in the visual model is where the answer lands. For chemistry: a blank product box in the reaction scheme, a blank on the arrow, or a blank pKa slot.
7. **Quick check (5) vs Practice (15)** as a length setting for Practice Sets, with the order shuffled on every load.
8. **Typography pairing:** a warm serif for headlines with a clean grotesk for UI and small-caps metadata labels. Big rounded touch targets with a pressed "ledge".
9. **Khan-style donate pattern:** "Donate" in the header plus a dismissable home band. The donate card offers Give once / Monthly, a suggested-amount chip and one CTA, with "free to use, not free to make" wording and an honest "supported by fewer than X% of Students" line.

## Avoid

1. **Gating Lesson 1 behind an onboarding funnel that asks for age or an account.** Our v1 has no accounts. "Start" must open the Lesson immediately.
2. **Daily keys, forced order and ads.** None fit a free, donation-funded site. Let Students jump to any Lesson. Show recommended order without enforcing it.
3. **XP, Leagues and leaderboards.** Already out of scope (#1).
4. **Sound on by default, and autoplaying looping videos.** Default sound off. Respect `prefers-reduced-motion` across the board, not only in a couple of rules. Every Scene needs a static or paused state.
5. **No dark mode.** Brilliant has none. Our token spec should include one, since late-night study is common.
6. **Colour as the only signal.** Brilliant leans on green/pink for right/wrong and blue/orange in diagrams. We need colour-blind-safe pairs, plus an icon and a text label every time (Brilliant does add ✓ / ↺ and labels, which is the good part).
7. **An AI tutor as the core help.** Koji is Brilliant's paid moat and is out of v1 scope for us. Hand-written hints per wrong answer give most of the benefit at $0.

## Sources

- Brilliant pages browsed: <https://brilliant.org/>, <https://brilliant.org/courses/>, <https://brilliant.org/courses/puzzle-science/>, <https://brilliant.org/welcome/>, <https://brilliant.org/practice/kindergarten/addition/complements-of-10/>, <https://brilliant.org/subscribe/>
- Khan Academy: <https://www.khanacademy.org/> (home donation band), <https://donate.khanacademy.org/campaign/580662/donate>

[free-vs-premium]: https://brilliant.org/help/pricing-and-plans/what-s-the-difference-between-free-and-premium/
[without-premium]: https://brilliant.org/help/using-brilliant/what-can-i-learn-on-brilliant-without-a-premium-subscription/
[getting-started]: https://brilliant.org/help/using-brilliant/how-do-i-get-started-on-brilliant/
[koji]: https://brilliant.org/help/features/how-does-koji-work/
[streak]: https://brilliant.org/help/features/what-is-a-streak/
[streak-charge]: https://brilliant.org/help/features/what-is-a-streak-charge/
[xp]: https://brilliant.org/help/features/what-is-xp/
[leagues]: https://brilliant.org/help/features/what-are-leagues-and-leaderboards/
