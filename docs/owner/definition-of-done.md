# Is v1 done?

v1 is done when all five things below are true. The first four are checked by the computer on every change; the fifth is you.

| | What it means | Where it stands |
|---|---|---|
| 1 | **Unit 1 plays all the way through:** Lessons 0 to 8, matching their specs, plus a Practice Set drawn from the Practice Problems. | Built. The browser tests play every Lesson from Step 1 to the end screen, and play every Practice Problem the Practice Set can draw. |
| 2 | **The full Course map:** all 18 Units, Unit 1 open, the rest "coming soon". | Built and tested. |
| 3 | **The site around the Lessons:** the push on the home page, the Hub for returning visitors, progress and Streak saved in the browser, Donate, the footer, and the Suggest-a-Problem / Report-a-mistake form (saving to a database on your computer, not online). | Built and tested. |
| 4 | **Every automatic check passes** (list below). | Green on this branch, 20 October 2026, except one: the video-stills check times out on this Mac before it starts (a known local problem with its browser; it is meant to run in CI). |
| 5 | **Your hand check:** every Lesson played once on a phone, one with the keyboard only, one with reduced motion, every Unit 1 Source note read for chemistry sense. Plus the agent's screen-reader pass, with a written transcript for you. | Screen-reader pass done (`docs/qa/screen-reader-unit-1.md`). Your part: `hand-check.md`. |

The sample Lessons the agents used while building (the "Sample: …" rows) are gone: Unit 1 now holds only the nine real Lessons and their Problems.

Going public is not part of v1. When you're ready, follow `pre-public-checklist.md`.

## The automatic checks

CI runs these on every pull request (the `test` and `pipelines` jobs in `.github/workflows/ci.yml`). Any red one means the change can't be trusted to merge. (To make GitHub actually refuse the merge, turn on branch protection: it's on the pre-public checklist.)

- **Type check:** the code fits together.
- **Content build:** every Lesson, Problem, Scene and course file is well formed; every number shown comes from cited data with a Source note; every picture has screen-reader text; every Scene has its video block; Step ids that links point to never change.
- **Chemistry-number check:** no Scene types in a chemistry number by hand; numbers come from the cited data files.
- **Scene check:** Scenes are pure drawings of time (no timers, no hidden animation, no randomness), so the videos match the site.
- **Blender check:** the 3D renders on the site match the inputs they were made from.
- **Unit tests:** about 1,150 small tests of the content build, the Step player, progress, the Practice Set draw, the form and more.
- **Browser tests:** a real browser plays the built site. They check, among other things:
  - every page and every Step of every Lesson passes the accessibility checker (axe), in both the dark and light themes, and keeps the type and tap-size rules;
  - every Step of every Lesson fits one phone screen with its button in view;
  - every Step you answer can be reached and answered with the keyboard alone (Tab reaches each kind of control and then Check);
  - with reduced motion on, every animation opens paused on its still frame;
  - each Lesson page's HTML holds its Step text but no answers, Hints or reveals;
  - every page says `noindex`, so search engines leave it alone until you go public;
  - a screen reader finds a name on every button and picture, and hears every Check.
- **JavaScript budget:** each Lesson page loads at most 200 KB (compressed) of code before you do anything. The 3D viewer and orbital shapes load only when a Step needs them. Today every Lesson page loads about 152 KB.
- **No video tools in the site:** the video maker (Remotion) never ships to Students.
- **Video path:** one frame of every Scene renders at both video shapes (16:9 and 9:16).
- **Pipeline tests:** the Python tools that compute shapes and orbitals still pass their checks, including the orbital orientation check.
