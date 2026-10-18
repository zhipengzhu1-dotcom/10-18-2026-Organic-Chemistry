# Research: agent skills that teach good video editing (for Manim CE + Resolve-by-Lua)

Date: 2026-10-18. Question: which public repos publish agent skills (SKILL.md, AGENTS.md/CLAUDE.md rules, Cursor rules, MCP guides, prompt packs) that teach agents to make or edit *good* video, and what concrete craft rules they teach, for our pipeline. The pipeline is short (10–60 s) explainer/intro clips animated in Manim CE, finished in DaVinci Resolve free 21.1 driven by Lua, with CC0 SFX, rendered at 16:9 and 9:16.

Method: every rule below was read from the repo file itself. GitHub files came through `gh api repos/<repo>/contents/<path>`. The Resolve MCP docs are the local install at `~/Library/Application Support/davinci-resolve-mcp/`. Star counts, last-push dates and licences come from the GitHub API (`gh api repos/<repo>`), read on 2026-10-18. Tags such as **[video-use]** give the source of each rule; the key is in §1. **UNVERIFIED** marks a claim I did not check against an owning source. Several skills quote retention statistics with no citation. I report those as the skill's claim, not as fact.

---

## 0. Summary

- **Most useful find: `browser-use/video-use`** (29k stars, MIT). It is an agent skill for editing video by conversation. It **ships a vendored `manim-video` skill**, the same one as `NousResearch/hermes-agent` `skills/creative/manim-video`, which has 255k stars and is MIT. Its SKILL.md has the most concrete rules on cut craft, easing, SFX and loudness that I found: 30 ms audio fades at every cut, SFX "hit on the frame" with an attack offset, about 8 effects per 18 s rather than 20, two-pass loudnorm to −14 LUFS / ≤ −1 dBTP, never linear easing, hold the last frame ≥ 1 s, and never reveal two independent elements at once.
- **Best motion-grammar find: `heygen-com/hyperframes`** (66.5k stars, Apache-2.0), skills `motion-doctrine` and `cut-the-curve`. They give numbers for velocity-matched seams: a ~12 % partial travel, mirrored `power4.in`/`power4.out`, 10 px blur on text, a 0.3–0.75 s "stillness before climax", only 2–3 transition types per film, and "never a crossfade". It is HTML/GSAP-specific, but the rules carry over to Manim camera moves.
- **Best Resolve find: `samuelgursky/davinci-resolve-mcp`** (3.6k stars, MIT). Its local docs hold an editorial decision guide, a Rule-of-Six auditor with Murch's weights, a rhythm auditor with numeric monotony thresholds, a rough-mix planner with ducking defaults, and a loudness-standards table (web −16 LUFS ±2, TP ≤ −1). It **targets Studio**. The docs say that on free 21.1 Python scripting moved to Studio, which leaves Lua (our route) as the free-edition path.
- **Best short-form / 9:16 finds:** `iart-ai/tiktok-video-skills` (MIT) for hook, retention, loop and platform safe zones. `pycodebr/heditor` (licence NOASSERTION) for numeric mix targets and a caption safe area. `remotion-dev/skills` (5.3k stars, no licence file) for minimum text sizes and a safe area on a 1080-wide frame.
- **Manim-specific skills:** `adithya-s-k/manim_skill` (1.2k stars, MIT) handles planning and API correctness. `Yusuke710/manim-skill` (MIT) handles TTS and subtitle timing budgets. They say little about editing. **Manim MCP servers** (e.g. `abhiemj/manim-mcp-server`, 652 stars) only execute code and teach no craft.
- **Anthropic's `anthropics/skills`** has no video skill. `slack-gif-creator` holds the only animation guidance there: easing helpers, ≤ 3 s GIFs.
- **Curated lists** (`ComposioHQ/awesome-claude-skills`, `travisvn/awesome-claude-skills`, `VoltAgent/awesome-agent-skills`, `heilcheng/awesome-agent-skills`) list almost no video-*craft* skills. Mostly they list generation APIs (Sora, fal, Kling), Remotion, and downloaders. A direct GitHub search found more than the lists did.

---

## 1. Catalogue of finds

| Key | Repo | Stars / last push | Licence | What it teaches | Fits Manim + Resolve-Lua? |
|---|---|---|---|---|---|
| **video-use** | https://github.com/browser-use/video-use (`SKILL.md`) | 29,253 / 2026-10-08 | MIT | Hard rules for ffmpeg editing, cut craft, easing, SFX/music/loudness, self-eval loop, critic sub-agent | **High.** The rules are engine-neutral. Its ffmpeg EDL path is an alternative to Resolve; the craft rules carry over to Resolve directly. |
| **manim-video** | `browser-use/video-use/skills/manim-video/` (same as https://github.com/NousResearch/hermes-agent `skills/creative/manim-video`) | hermes-agent 254,877 / 2026-10-18 | MIT | 3B1B pacing table, opacity layering, tempo curve, typography scale, transitions, 9:16 render flag | **High.** Written for Manim CE (tested v0.20.1). |
| **hf-motion / hf-curve** | https://github.com/heygen-com/hyperframes `.agents/skills/motion-doctrine`, `cut-the-curve`, `seam-craft`; public `skills/hyperframes-audio` | 66,554 / 2026-10-18 | Apache-2.0 | Seam law (vector, current, carriers), velocity-matched cut parameters, timing intents, banned eases, voice/bed carving | **Medium.** The parameters are GSAP. They translate to Manim `camera.frame` moves and to cut placement in Resolve. The `.agents` skills are marked `internal: true`. |
| **resolve-mcp** | https://github.com/samuelgursky/davinci-resolve-mcp (local `docs/`, `src/utils/`) | 3,616 / 2026-10-18 | MIT | Editorial priorities, Rule of Six weights, rhythm audit, split-edit audit, mix plan, loudness standards, colour priorities, 21.1 native transitions and fades | **High for knowledge, low for tooling.** The tools need Studio. On free 21.1 only the Lua route works (see §2.3). |
| **tiktok** | https://github.com/iart-ai/tiktok-video-skills (`skills/short-form-video/SKILL.md`, `references/retention-pacing.md`) | 14 / 2026-06-22 | MIT | Hook in about 1 s, text by frame 1, no fade-up, a change every 2–4 s at uneven intervals, punch-in, loop, safe zones per platform | **Medium.** Remotion code; the rules are portable. Promotional footer for iart.ai. |
| **heditor** | https://github.com/pycodebr/heditor (`references/sound-design.md`, `captions-and-layout.md`) | 79 / 2026-10-16 | NOASSERTION (custom; not read) | Numeric mix targets, ducking timing, SFX gains by class, music section arc, 9:16 safe pixels, caption contrast | **Medium.** Built for talking-head reels, but the SFX gains and safe area apply to us. Check the licence before copying text. |
| **remotion** | https://github.com/remotion-dev/skills (`remotion-create/video-layout.md`, `remotion-markup/timing.md`, `sfx.md`, `transitions.md`) | 5,322 / 2026-10-16 | No licence file (API 404) | Video-first layout: safe area, minimum type sizes, "one thing first". Easing (bezier 0.16,1,0.3,1; spring damping 200). Perceptual-scale interpolation | **Low–medium.** Remotion-only code. The layout minimums carry over. Its SFX list is meme sounds of unstated licence, so it is **not CC0**. |
| **vertical** | https://github.com/nopefallacy/vertical-video-editing-skills (`skills/video-editing/SKILL.md`) | 61 / 2026-06-21 | MIT | 9:16 grammar: engineered hook 1–3 s, non-metronomic cuts down to 0.2 s, eased camera with an anti-jitter rule, sizing in container units | **Low–medium.** HyperFrames, talking-head oriented. |
| **mvd** | https://github.com/Miftahul-Islam-Efaz/Motion-graphics-skill (`motion-video-director`) | 129 / 2026-10-16 | NOASSERTION. **Proprietary: forbids redistribution** (SKILL.md §Licence) | Event-to-sound map, transient alignment in samples, Kenney/Freesound sourcing, −14 LUFS / ≤ −1.5 dBTP | **Medium for ideas.** Read it; do not copy it. |
| **adk-manim** | https://github.com/adithya-s-k/manim_skill (`manim-composer`, `manimce-best-practices`) | 1,184 / 2026-01-23 | MIT | Scene-plan template (`scenes.md`), 3B1B principles, `rate_func`/`run_time` reference | **Medium.** Planning and API correctness only; no editing or sound. |
| **yus-manim** | https://github.com/Yusuke710/manim-skill | 176 / 2026-10-07 | MIT | Narration → TTS → per-line time budgets → `add_subcaption`; Kokoro speaks ≈ 2.5 words/s | **Low** for a silent intro, **high** if we add a VO. |
| **manim-mcp** | https://github.com/abhiemj/manim-mcp-server | 652 / 2025-05-19 | MIT | Runs Manim code and returns the video. No craft guidance. | Utility only. |
| **anthropic** | https://github.com/anthropics/skills (`skills/slack-gif-creator`) | 181,943 / 2026-10-09 | Apache-2.0 for that skill | Easing helpers (ease_in/out, bounce_out for landings), ≤ 3 s GIF duration | Marginal. |
| **resolve-free** | https://github.com/emircbngl/davinci-resolve-mcp-free | 7 / 2026-10-15 | MIT | Lua bridge inside Resolve Free, FCPXML fallback. README: "written for 21.1's restricted Lua, not yet tried on a 21.1 install" | **Relevant to the transport only.** No craft guidance. Not tested by us. |

Seen but **not read** (listed for completeness, all **UNVERIFIED**): `nateherkai/herk-edit-kit` (1.8k stars, cut-silences/cut-mistakes skills), `chang416/cutcraft` (MIT), `latent-spaces/brag` (16.7k stars, launch videos), `wassermanproductions/unofficial-davinci-mcp` (Apache-2.0; README describes beat-grid snapping, colour matching, FCPXML for the free edition), `hiteshK03/davinci-resolve-mcp`, `lordhoell/davinci-resolve-mcp`, the ffmpeg MCPs (`video-creator/ffmpeg-mcp`, `egoist/ffmpeg-mcp`), MoviePy MCPs (all <5 stars). `mifi/editly` (5.5k stars, MIT, last push 2025-05) and `Zulko/moviepy` (15k stars, MIT) are libraries, not skills; neither ships agent craft guidance.

---

## 2. What each key source teaches

### 2.1 video-use (`browser-use/video-use/SKILL.md`)
- It labels its own values as "worked examples, not mandates". Only its 12 Hard Rules are mandatory, and those concern correctness.
- Hard rules that matter to us:
  - 30 ms audio fades at every segment boundary, or every cut pops.
  - Never cut inside a word; pad cut edges by 30–200 ms.
  - Subtitles go last in the filter chain.
  - Confirm the strategy before editing.
- Cut craft:
  - Silences ≥ 400 ms are the cleanest cut candidates; 150–400 ms is usable with a visual check; < 150 ms is unsafe.
  - Every cut must work on the audio and the video tracks together.
- Animation:
  - About 3 s minimum per card synced to narration, and 0.5–2 s for beat-synced accents.
  - **Hold the final frame ≥ 1 s.**
  - **Never reveal independent elements in parallel.**
  - Start the reveal `reveal_duration` early so the landing frame coincides with the payoff word.
  - **Never use linear easing**: ease-out cubic for single reveals, ease-in-out cubic for continuous draws.
- Sound:
  - "Fewer effects. Every effect is tied to something visible… ~20 stock whooshes/risers/impacts in 18 s reads as generic; ~8 reads as designed."
  - **Hit on the frame:** measure the attack (first sample above about −30 dBFS of the peak) and start the file that much before the contact frame.
  - Duck music −12 to −15 dB under speech, and ramp it out before a stinger or end card.
  - **Master once:** two-pass loudnorm to −14 LUFS, TP ≤ −1 dBTP, then measure each section.
- Self-eval:
  - Check every cut at ±1.5 s on the rendered output, plus the first 2 s and the last 2 s.
  - Measure with `ebur128`. "An end card 15 dB under the dialogue, or effects louder than speech, is a bug. You cannot listen: say so."
  - Use a critic sub-agent that is told to "roast". Cap self-eval at 3 passes.
- Output targets: `1080×1920@30` for vertical social; `1920×1080@24/30`.

### 2.2 manim-video (`video-use/skills/manim-video/`, from hermes-agent)
- SKILL.md:
  - "Geometry before algebra".
  - Opacity layering: primary 1.0, context 0.4, structure 0.15.
  - Breathing room: a `wait()` after every animation; "a 2-second pause after a key reveal is never wasted".
- Speed table:
  - Title: run 1.5 s, wait 1.0 s.
  - Key equation: 2.0 s + 2.0 s.
  - Transform: 1.5 s + 1.5 s.
  - Label: 0.8 s + 0.5 s.
  - FadeOut: 0.5 s + 0.3 s.
  - **"Aha" moment: 2.5 s + 3.0 s.**
- Typography (Manim units): title 48, heading 36, body 30, label 24, caption 20, minimum 18. `buff ≥ 0.5` at the frame edges.
- Fonts: it says to use monospace for all text, because "Pango produces broken kerning with proportional fonts". **UNVERIFIED and contradicted:** `yus-manim` instead says to prefer `Tex(...)` for prose. Our own prototype ships Space Grotesk in Manim.
- `production-quality.md`:
  - Tempo curve: slow → medium → fast (climax) → slow (conclusion).
  - **At most 6 actively visible elements.**
  - ≥ 15 % of the frame empty.
  - Between scenes "never hard-cut; always animate the transition", using a 0.5 s FadeOut + 0.3 s wait.
  - "The first 5 seconds determine if someone keeps watching".
- `scene-planning.md`: transitions are Clean Break (default), Carry-Forward, or Transform Bridge ("end scene with a shape, start next scene by transforming it").
- `animation-design-thinking.md`:
  - "**See then hear**": the visual appears slightly before the narration names it.
  - Add a dramatic pause before the key reveal.
  - Viewers can track 1–2 simultaneous animations.
- `rendering.md`: `manim --resolution 1080,1920` for 9:16; a music bed at `volume=0.15` through `amix`.

### 2.3 resolve-mcp (local `docs/` + `src/utils/`)
- `guides/editorial-decision-guide.md`:
  - Priority order: emotion/story > clarity > rhythm > eye trace / screen geography > continuity > coverage variety.
  - "Find the decisive frame… when a movement resolves, or the audience has received the needed information."
  - "Cut on completed or motivated motion."
  - "Let picture lead sound when surprise, reveal, or anticipation matters."
  - "Avoid cutting away before a thought has landed."
  - Sound-first spine: **Premise → Setup → Turn → Button.**
  - After any edit: run detect gaps/overlaps, check thumbnails at cut points, confirm the audio spine still reads.
- `src/utils/rule_of_six.py`: Murch's weights, verbatim:
  - emotion 0.51, story 0.23, rhythm 0.10, eye trace 0.07, 2D plane 0.05, 3D space 0.04.
  - It deliberately computes no composite score.
- `src/utils/rhythm_audit.py`:
  - A run of ≥ 6 shots with coefficient of variation < 0.15 counts as **metronomic**.
  - A pattern break ≥ 1.8× that lands on a marker counts as craft, not a fault.
  - The 14–16 cuts/min dialogue figure is labelled "descriptive not prescriptive".
- `SKILL.md` split-edit audit: "sound leads picture… treat the cut as a sound event first". It classifies J-, L- and straight cuts.
- `src/utils/mix_plan.py` defaults:
  - Bed −12 LU under dialogue; duck −6 dB.
  - Attack 0.15 s ("already down under the first syllable"), release 0.40 s, hold 0.35 s ("does not pump between sentences").
  - `kernels/audio-fairlight-kernel.md`: "The achieved loudness is measured, not derived"; true-peak overs are flagged, never silently normalised.
- `src/utils/delivery_targets.py`:
  - **web/social −16 LUFS ±2 LU, TP ≤ −1 dBTP**; podcast −16 ±1.5; EBU R128 −23 ±0.5; ATSC A/85 −24 ±2 / −2 dBTP.
- `guides/color-decision-guide.md`:
  - Correction order: technical transform/colour management → exposure/contrast → white balance → memory colours → continuity → creative look → output legality.
  - "Do not chase a look before the image is technically coherent."
  - Use scopes and eyes together.
  - Translate mood words into observable targets (density, highlight level, shadow colour, saturation).
- 21.1 API (`reference/resolve211-native-transitions.md`, `resolve211-speed-fades.md`, `resolve_scripting_changelog_21.1.md`):
  - `TimelineItem.AddTransition` takes `{type, category, position, alignment, duration}`. It **fails with zero handles**, and an omitted duration gave 8 frames on the tested fixture.
  - `SetFades {FadeIn, FadeOut}` takes integer frames.
  - `Timeline.NormalizeAudioLevel` exists.
  - All of this was validated on **Studio** 21.1.0.14. That these calls exist in **free 21.1 Lua** is **UNVERIFIED by this doc**, although our own `star_forge_edit_PROTOTYPE.lua` already relies on this route.
- `SKILL.md` "Free edition": "Resolve 21.1 moved Python scripting to Studio: on free 21.1 the Scripts menu no longer lists `.py` files". Lua remains.

### 2.4 hf-motion / hf-curve (HyperFrames)
- **Vector law:** "How Scene A exits determines how Scene B enters: same axis, same direction, matched speed, cut mid-motion on both sides." Never mirror; on the Z axis the sign of d(scale)/dt must match across the cut.
- **The current:** pick one dominant direction for the film. The other vectors are reserved and carry meaning:
  - upward = conclusion or reveal;
  - Z-forward = deeper into the same thought;
  - **Z-backward (inverse zoom) = ARRIVAL, "something bigger lands"**.
- Never run consecutive seams in opposite directions.
- **Carriers:** hand a concrete object across the cut. "Never a crossfade — it has no carrier at all."
- **Causal motion:** effects start on the causing frame, "never shortly after". Reactions scale with implied mass.
- **No idle wobble** (breathe / float / glow pulse): "Pause at any second — something meaningful must be mid-flight." *(This conflicts with our storyboard's "slowly breathing" star core.)*
- **Stillness before climax: 0.3–0.75 s** between the action and its result.
- Timing intents:
  - A single entry takes ≤ ~800 ms; an exit takes ≈ 75 % of the entry; total stagger ≤ 500 ms.
  - **`bounce.out` and `elastic.out` are forbidden**; `back.out(1.4–1.7)` is fine.
  - Similar elements share one ease.
- **Transition vocabulary: 2–3 types per film, repeated.**
- Cut-the-curve numbers:
  - Partial travel ~12 % of the frame (≈ 230 px at 1920).
  - Exit `power4.in` + entry `power4.out` over the same distance and duration.
  - Exit 0.2–0.4 s, entry ≥ exit, total ≈ 0.6 s.
- Zoom-through: exit scale 1 → 1.2 with blur 0 → 10 px in 0.2 s; swap; entry 0.75 → 1 with `expo.out` in 0.5 s.
- Inverse zoom-through: exit 1 → 0.8; entry 1.25 → 1; about 0.7 s total, 30/70 split.
- Blur peaks at 10 px for text and 18–20 px for full-frame surfaces.
- `seam-craft`: paint an opaque stage ground. Otherwise a cross-opacity dip composites over white and **flashes white at every seam on dark films**.
- `skills/hyperframes-audio` (public): use a voiceover "carve" (band ducking around 1–3 kHz) instead of ducking the whole bed. Set the limiter ceiling ≥ 2 dB under a hard delivery limit.

### 2.5 tiktok (`iart-ai/tiktok-video-skills`)
- **One idea per video.** Open a loop in the first ~3 s and close it last. No dead air.
- Hook in 0–1 s: "the hook line is **on-screen as text by frame 1** (85 % watch muted), and the most striking *visual* is also the first frame — never a slow ramp-in. **Do not fade up from black.**" One gap only.
- **A visual change every ~2–4 s**, at uneven intervals ("a metronome reads as boredom; uneven cuts read as momentum").
- A punch-in zoom of 1.0 → 1.1 on a spring is "the cheapest interrupt".
- Seamless loop: match the last 0.5 s back toward frame 0.
- Safe zones on 1080×1920: the universal box is the centre 900×1400, with clear bands of top ~120 px, bottom ~320 px, right ~120 px. TikTok Ads needs bottom 370 px.
- **UNVERIFIED stats** quoted without sources: "~87 % decide in 3 s", "70 %+ view-through", "interrupt every 4 s holds ~58 % vs ~41 %".

### 2.6 heditor (`pycodebr/heditor`)
- Mix:
  - Music ≈ 21.5 dB under the voice; background ≥ 12 dB under the voice at p95.
  - Ducking anticipates speech by ~120 ms and holds ~650 ms.
  - Multiband ducking: bands above 200 Hz duck fully, bass ducks less.
  - Master: two-pass loudnorm to −14 LUFS; re-limit if the **AAC true peak exceeds −1.5 dBTP** ("bright SFX can overshoot the WAV peak by 3 dB after AAC").
- SFX:
  - Every visual action gets a sound: appear, impact, reveal, UI, success.
  - Place strong impacts **50–120 ms before** the emphasised word. SFX that play over words sit at −20 dB or lower.
  - Don't repeat the same sample more than ~3 times in a row; vary the rate 0.92–1.1.
  - **Gains: impacts −11 to −14 dB, whooshes −14 to −18, UI ticks −18 to −30, textures −22 to −30.**
- Music arc:
  - The hook may hit on frame 0.
  - The development section is filtered (low-pass / "radio") so it does not compete.
  - **Before the turn, 0.2–0.4 s of silence (with a riser or tape stop), then the drop on the key word.**
  - Payoff: crescendo, then a 1 s fade.
- 9:16 safe area:
  - Top 0–270 px: no text.
  - Bottom ~350 px: atmosphere only.
  - Right edge 120 px between y 1000–1700: keep clear.
- Captions:
  - Cap height ≥ 60 px for phrase captions on a phone.
  - Active-word contrast ≥ 4.5:1.
  - 1–3 words (≤ 17 characters) for kinetic captions; never more than 2 lines.
  - In 16:9, captions are subtitles of ≤ 2 lines × 42 characters at ~50 px.

### 2.7 remotion (`remotion-dev/skills`)
- `video-layout.md`:
  - "You are designing a video, not a webpage."
  - Decide the one thing the viewer notices first.
  - At 1080 px wide, keep key text **≥ 80 px from the sides and ≥ 100 px from top and bottom**.
  - **Headline ≥ 84 px, supporting text ≥ 44 px**; scale with width.
  - No redundant elements.
- `timing.md`:
  - Suggested eases are `Easing.bezier(0.16, 1, 0.3, 1)` (expo-out-like) and `Easing.spring({damping: 200})` ("a push with no bounce").
  - Use **perceptual scale** for scale animations, because linear scale looks slower as it grows.
  - Posterization is allowed as a deliberate effect.
- `transitions.md`: fade, slide, wipe and clockWipe via `TransitionSeries`; its examples run 15–20 frames.
- `sfx.md`: a list of remotion.media meme sounds (vine-boom, bruh…) with **no licence stated**. It is unusable for a CC0 rule.

### 2.8 Smaller sources
- **mvd** (`local-sound-workflow.md`):
  - Align the perceived transient, not the start of the file: at 30 fps / 48 kHz one frame is 1,600 samples, and `placement = round(frame*sr/fps) − source_anchor`.
  - "Calm [camera] moves can intentionally be silent."
  - Text ticks run 40–150 ms on meaningful word groups; "don't spam 30 identical clicks per second".
  - Tie movement SFX to the velocity envelope, not a constant whoosh.
  - It names **Kenney** (CC0) and Freesound as sources.
  - "A global LUFS measurement does not prove clicks are audible." Preview in mono and at a quiet volume.
- **adk-manim**: "Transform objects rather than replacing them", "Pause for insight", "Vary the pace", "End scenes with resolution", "Pose questions… before revealing answers".
- **vertical**: "never metronomic 1 s cuts"; cuts down to 0.2 s when energy demands; camera zoom/push "always eased, never linear, never jittery".

---

## 3. Distilled craft rules for our pipeline

Every rule carries its source tags. Where sources conflict, the conflict is stated.

### 3.1 Pacing and beat timing
1. **Plan beats first.** Write the narration or beat list before animating; each beat is one change on screen. [manim-video design-thinking; adk-manim; resolve-mcp Premise→Setup→Turn→Button]
2. **One idea per clip; one new element at a time.** Never reveal two independent things in parallel. ≤ 6 active elements. [tiktok; video-use; manim-video]
3. **Give reveals time to land.** A key reveal takes 2.5 s of animation and 3 s of hold in 3B1B mode; labels take 0.8 s + 0.5 s. For beat-synced accents, 0.5–2 s is acceptable. [manim-video; video-use]
4. **Vary the tempo.** Use a slow → medium → fast-climax → slow curve. No metronomic runs: avoid ≥ 6 shots with CV < 0.15, and break the pattern on the key beat (≥ 1.8×). [manim-video production-quality; resolve-mcp rhythm_audit; tiktok; vertical]
5. **Stillness before the climax:** 0.3–0.75 s of hold before the payoff. In audio, 0.2–0.4 s of silence before the drop. [hf-motion; heditor]
6. **No idle wobble.** Something meaningful is mid-flight at every second. *Conflict:* 3B1B "breathing room" holds versus HyperFrames' ban on idle motion. Resolution: a hold is fine if it follows a reveal, so the viewer is reading; a looping "breathe" with nothing to read is not. [hf-motion vs manim-video]

### 3.2 Cut points and transition choice
7. **Cut on completed or motivated motion,** at the decisive frame when the information has landed. Never cut away before a thought lands. [resolve-mcp editorial guide]
8. **Sound leads picture** for setup (J-cuts). **Picture leads sound** for surprise and reveals. [resolve-mcp]
9. **A small transition vocabulary:** 2–3 types per film, repeated, with a meaning for each. [hf-motion]
10. **Crossfades are contested.**
    - manim-video says "never hard-cut; always animate the transition", using a 0.5 s FadeOut + 0.3 s wait.
    - hf-motion says "never a crossfade — no carrier" and prefers velocity-matched cuts.
    - Our reading: in Manim, the best transition is a **Transform bridge** (an object morphs into the next scene's object). It makes a dissolve in the editor unnecessary, and our storyboard is already built this way. Keep Resolve dissolves for the deliberate dip (e.g. the fusion white flash).
    - [manim-video scene-planning; hf-motion]
11. **If you move across a cut, match the vectors:**
    - same axis and direction, cut mid-motion;
    - mirrored ease-in / ease-out, partial travel ~12 % of the frame;
    - Z-sign rule: never answer a pull-back with a grow-from-small entry;
    - inverse zoom is reserved for an "arrival".
    - [hf-curve]
12. **Mechanics in Resolve:**
    - `AddTransition` needs source handles (it fails with zero handles).
    - Fades take integer frames.
    - Add 30 ms audio fades at every audio cut.
    - Paint an opaque ground under dissolves on dark material, or a white flash appears.
    - [resolve-mcp 21.1 refs; video-use rule 3; seam-craft]

### 3.3 Motion easing
13. **Never linear** for reveals or moves.
    - Ease-out (cubic or expo) for arrivals.
    - Ease-in-out for continuous draws and camera moves.
    - Remotion's default "push" is bezier(0.16, 1, 0.3, 1).
    - In Manim, `smooth` is the default; use `rush_from` for counters.
    - [video-use; remotion; manim-video animations.md]
14. **No bounce or elastic.** A small overshoot (`back.out` 1.4–1.7) is the maximum. Similar elements share one ease. [hf-motion] *(anthropic's gif skill suggests `bounce_out` for landings; that is a GIF/emoji context and does not apply here.)*
15. **Scale perceptually.** Linear scale looks slower as it grows. [remotion timing.md]
16. **Exit ≈ 75 % of entry duration;** a single entry takes ≤ 800 ms in fast styles. [hf-motion]

### 3.4 Typography and legibility on 9:16
17. **Safe area at 1080×1920:**
    - Keep key text ≥ 80–90 px from the sides.
    - Keep clear of the top 120–270 px and the bottom 320–370 px.
    - Avoid the right 120 px between y 1000–1700.
    - The universal safe box is the centre 900×1400.
    - [remotion; tiktok; heditor]
18. **Minimum sizes at 1080 px wide:**
    - Headline ≥ 84 px; supporting text ≥ 44 px; phrase captions ≥ 60 px cap height.
    - In Manim units, never below `font_size=18`; use `buff ≥ 0.5` at edges.
    - [remotion; heditor; manim-video]
19. **Contrast ≥ 4.5:1;** light text on dark. Use opacity layering (1.0 / 0.4 / 0.15) for hierarchy. [heditor; manim-video]
20. **Colour equals meaning,** kept across the whole clip. [manim-video]
21. **Fonts fail silently.** Assert that the font loaded, or pass an explicit font path. [video-use]

### 3.5 Sound design and mixing
22. **Fewer, motivated SFX.** Each one is tied to a visible event; about 8 cues per 18 s reads as designed, about 20 as generic. Documented silence is valid, and calm camera moves may be silent. [video-use; mvd] *(heditor's "every visual action gets a sound" is a talking-head reel style; it is the punchy end of the range.)*
23. **Hit on the frame.** Align the transient, not the file start: offset = attack time; one frame = 1,600 samples at 30 fps / 48 kHz. An impact can lead its visual by 50–120 ms. [video-use; mvd; heditor]
24. **Starting gains:** impacts −11 to −14 dB, whooshes −14 to −18, UI ticks −18 to −30, textures and ambience −22 to −30. Vary samples (rate 0.92–1.1); no more than ~3 identical in a row. [heditor]
25. **Ducking** (if there is music or VO): music −12 to −15 dB under speech, or bed −12 LU with a −6 dB duck. Attack 0.12–0.15 s, release 0.40 s, hold 0.35–0.65 s. A band-carve at 1–3 kHz beats a full duck. Ramp music out *before* an end card or stinger. [video-use; resolve-mcp mix_plan; heditor; hf-audio]
26. **Loudness target.**
    - Social: **−14 LUFS** integrated [video-use, heditor, mvd] or **−16 LUFS ±2** [resolve-mcp web standard].
    - TP ≤ −1 dBTP; ≤ −1.5 dBTP if the delivery is AAC.
    - Master once (two-pass loudnorm), then **measure** each section.
    - *Note:* our `make_edit.py` already chose −16 for a sparse SFX-only mix, so the boom is not squashed. That matches resolve-mcp's web band and its "measured, not derived" rule.
27. **SFX sourcing:** CC0 only, with the licence recorded per file. Kenney packs are CC0, as already used in `star-forge-edit/sfx/`. The Remotion SFX list is not CC0. [mvd; remotion sfx.md (negative example)]
28. **Verify honestly.** Run `ebur128` on the render, check RMS per section, preview in mono and at a quiet volume. Never claim "sounds good" from metrics alone. [video-use; mvd; resolve-mcp]

### 3.6 Colour and finishing
29. **Order:** technical transform → exposure/contrast → balance → continuity → creative look → output legality. No look before a technically coherent image. [resolve-mcp colour guide]
30. **Restraint on 8-bit or display-referred sources** (a Manim render is display-referred Rec.709 sRGB). Express mood as measurable targets. [resolve-mcp colour guide]
31. **Dark-background palettes** need bright, saturated accents; mid-greys disappear. [manim-video production-quality]
32. **Grade per segment, then one encode;** never re-encode twice. [video-use]

### 3.7 Hook (first 1–2 s)
33. **Short-form:** the best frame is frame 0, with **no fade-up from black**; hook text on screen by frame 1; one open question. [tiktok; vertical]
34. **3B1B explainer:** the opening poses a question or a surprising result (Discovery arc: Hook → Intuition → Formalize → Reveal → Extend). A short fade-in is acceptable in this mode, but "the first 5 seconds determine if someone keeps watching". [manim-video scene-planning, production-quality]
    - *Conflict:* our storyboard opens on a 2 s fade-up, which is exactly what tiktok bans. Which way to go is a style choice (§4).

### 3.8 Endings
35. **Hold the final frame ≥ 1 s**; for an aha or end card, hold 2–3 s. [video-use; manim-video]
36. **Close the loop the hook opened.** For short-form, the last 0.5 s can match back to frame 0 for a seamless loop. [tiktok]
37. **Music:** crescendo, then a 1 s fade, ramped *before* the card rather than decaying under it. The end card should not sit 15 dB under the rest of the mix. [heditor; video-use]
38. **End scenes with resolution;** a clean exit (FadeOut all) unless the poster frame must persist. [adk-manim; manim-video]

---

## 4. Three edit styles for the 14 s `star-forge` intro

Baseline: Manim "cut-4" render is 420 frames at 30 fps. Beats come from `star-forge-edit/make_edit.py`:
- star 0–2 s
- approach 2–4.8 s
- fusion flash ~4.8–5.2 s
- fuse 5.2–6.5 s
- pull-back 6.5–9 s
- C morph 9–10.5 s
- card 10.5–14 s

The storyboard file still says 13 s / 390 frames; cut-4 is 14 s. The styles below change grading, cut placement, sound and the Manim timing knobs; they keep the beat order. All are deliverable at 1920×1080 and 1080×1920 at 30 fps.

### Style A: "Calm Explainer" (3Blue1Brown)
Intent: wonder and clarity; an object-continuous film. Sources: manim-video, adk-manim, resolve-mcp, video-use.

- **Hook:** a 1.0–1.5 s fade-up on the star core is allowed. The question is posed visually: three nuclei approach, the viewer anticipates. (§3.7 #34)
- **Transitions:**
  - Transform bridges in Manim: nuclei → ¹²C → letter C. No editorial transitions except **one** dip-to-white on the fusion flash (12 frames).
  - Everything else is a straight cut inside the continuous render, so it is invisible. This drops the 10/14/10-frame dissolves in the current plan, which only blend identical continuous frames.
  - (§3.2 #9–10)
- **Timing:**
  - Equation write-on: ≥ 2 s + 2 s hold.
  - "Aha" (C with four dots): 2.5 s + hold.
  - Card: ≥ 3 s hold. That fits the 10.5–14 s window.
  - Slow → medium → fast (fusion) → slow (card) tempo curve.
  - `smooth` / ease-in-out on every camera move; no bounce.
  - (#3–4, #13–14, #35)
- **Sound:**
  - About 4–5 cues: ambience bed (space wind, −24 to −28 dB); one soft impact on the fusion contact frame, attack-aligned; one glass/pluck on the C morph; four very quiet ticks for the valence dots (−24 dB or lower), or silence; a soft confirmation under the card.
  - Pull-back camera move silent.
  - Integrated −16 LUFS, TP ≤ −1 dBTP (−1.5 for AAC).
  - (#22–24, #26)
- **Type / 9:16:**
  - Card sentence ≥ 44 px supporting / ≥ 84 px for the bold line, at 1080 wide.
  - Inside the 900×1400 box; nothing in the top 270 / bottom 350 px.
  - Opacity layering: nebula ≤ 0.4, structure 0.15.
  - (#17–19)
- **Colour:** no creative grade. Only check levels and legality, so cyan #3ee8ff and orange #ff9a1f do not clip on the scopes. (#29–30)
- **Ending:** the card holds to the poster frame; no fade to black; ambience fades over the final 1 s. (#35, #37)

### Style B: "Punchy Short" (vertical first)
Intent: survive the swipe; 9:16 first. Sources: tiktok, heditor, vertical, video-use, hf-motion.

- **Hook:**
  - **Frame 0 is the star at full brightness**: cut the fade-up; start at about 1.0 s into the render, or keep the push-in from frame 0.
  - A hook super on screen by frame 1, such as "Where did your carbon come from?", in the 9:16 safe box at ≥ 84 px. It closes on the card line, which answers the open loop.
  - (#33, #36)
- **Cuts:**
  - Trim the slow middle so a visual change lands every ~2–4 s, at uneven intervals (e.g. 0, 1.3, 3.4, 4.9, 7.1, 9.0, 10.4).
  - A punch-in from 1.0 to 1.08–1.10 on the fusion frame, spring with no bounce; Manim camera or Resolve zoom keyframe.
  - Cut the pull-back shorter, as one velocity-matched move, and avoid a dissolve.
  - Use only the cut-on-motion and the white dip; ≤ 2 transition types.
  - (#4, #9, #11)
- **Easing:** expo-out arrivals of ≤ 800 ms; staggers ≤ 500 ms for the four dots (e.g. 4 × 120 ms); exit ≈ 75 % of entry. (#14, #16)
- **Sound:**
  - About 7–8 cues in 14 s, so every visible action has a sound: whoosh as the nuclei enter (−16 dB); impact at the fusion, leading the flash by 50–120 ms (−12 dB); a sub-boom tail; pluck at the morph; four dot ticks varied in rate 0.92–1.1 (−22 dB); a confirmation chime on the card.
  - Optional CC0 music bed, low-passed through the body; full band and swell on the card.
  - −14 LUFS, TP ≤ −1.5 dBTP (AAC).
  - (#22–26)
- **Type / 9:16:** keep the hook super and card inside the 900×1400 box, with the right rail clear. Contrast ≥ 4.5:1. Card copy shortened to ≤ 2 lines per block. (#17–19)
- **Ending:** the card holds about 1.5 s. The last 0.5 s eases back toward the opening star glow for a seamless loop. Music ramps down *before* the final 0.5 s. (#35–37)

### Style C: "Cinematic Trailer"
Intent: awe and weight; the reveal is "earned". Sources: hf-motion/hf-curve, heditor music arc, resolve-mcp, video-use.

- **Hook:**
  - Open on black with sound first (J-cut): a low rumble rises for 0.5 s before the star appears. Then a slow push-in.
  - The 1.5 s fade-up is kept but motivated by the sound.
  - (#8)
- **Structure:**
  - **Stillness before climax:** freeze the approach about 0.5 s before contact, nearly still and nearly silent. A **0.3 s audio gap** with a riser, then the impact and the white flash hit together. (#5)
  - Consider a Resolve speed ramp to about 50 % into the contact. **UNVERIFIED** in free-21.1 Lua; the SetSpeed reference is Studio-validated only.
- **Transitions:**
  - Reserve the **inverse zoom-through** for the arrival of the card: the outgoing scene recedes 1 → 0.8; the card arrives at 1.25 → 1 over about 0.5 s with `expo.out` and a peak text blur of ≤ 10 px. Done in Manim, it is the "something bigger lands" vector.
  - Optionally a rack-focus blur cut on the C morph.
  - That gives ≤ 3 transition types: white dip, inverse zoom, rack focus.
  - (#9, #11)
- **Sound:**
  - Music arc: filtered build → 0.2–0.4 s silence → drop on the fusion flash → sustained pad under the pull-back → final swell into the card → 1 s fade.
  - SFX are low and heavy: sub-boom −11 dB, whoosh on the pull-back tied to its velocity envelope, nothing on the dots or a single soft shimmer.
  - −16 LUFS to keep dynamic range (the current plan's rationale), TP ≤ −1.
  - (#22, #25–26, #37)
- **Colour:** a restrained creative look applied after the technical pass. Slight highlight bloom on the star core; shadows a touch cooler toward #0d0626; protect the cyan/orange accent pair. The grain already planned under the pull-back dissolve fits. Optional letterbox in 16:9 only, never in 9:16. (#29–31)
- **Ending:** the card arrives on the inverse zoom and holds 2.5–3 s. The music tail is pre-faded so the card is not 15 dB under the climax. Cut to black on the last frame, or hold the poster frame for reduced motion. (#35, #37)

---

## 5. Unverified items and gaps

- That `TimelineItem.AddTransition`, `SetFades`, `SetSpeed` and `NormalizeAudioLevel` are available in **free** 21.1 Lua is not proved by the resolve-mcp docs, which validated them on Studio 21.1.0.14. Our prototype Lua is the evidence to check.
- manim-video's "monospace only, Pango kerning is broken" is a skill claim, contradicted by `yus-manim` (prefer `Tex`) and by our own Space Grotesk usage. Test it with a `-qm`/`-qh` still.
- The retention statistics in tiktok (87 %, 58 % vs 41 %, view-through thresholds) come with no sources.
- Licence status:
  - `remotion-dev/skills` has no licence file.
  - `heditor` and `Motion-graphics-skill` are NOASSERTION; Motion-graphics-skill explicitly forbids redistribution.
  - Quote rules from them in our own words; do not vendor their files.
- I found no skill that teaches **Resolve-by-Lua editing craft**. The Resolve MCPs teach API mechanics; the craft rules come from engine-neutral skills (video-use, resolve-mcp guides). No source gives a CC0-specific SFX workflow beyond "record source/licence per file" (mvd) and Kenney as a CC0 source.

## Sources (files read)

- `browser-use/video-use`: `SKILL.md`; `skills/manim-video/{SKILL.md, README.md, references/animation-design-thinking.md, production-quality.md, visual-design.md, scene-planning.md, rendering.md, animations.md}`
- `NousResearch/hermes-agent`: `skills/creative/` listing (origin of manim-video)
- `heygen-com/hyperframes`: `.agents/skills/{motion-doctrine, seam-craft, cut-the-curve}/SKILL.md`; `skills/hyperframes-audio/SKILL.md`; `skills/faceless-explainer/SKILL.md` (skimmed)
- `samuelgursky/davinci-resolve-mcp` (local install): `docs/SKILL.md`, `docs/guides/editorial-decision-guide.md`, `docs/guides/color-decision-guide.md`, `docs/kernels/audio-fairlight-kernel.md`, `docs/reference/resolve211-native-transitions.md`, `resolve211-speed-fades.md`, `resolve_scripting_changelog_21.1.md`, `src/utils/{rule_of_six.py, rhythm_audit.py, mix_plan.py, delivery_targets.py}`, `LICENSE`, `package.json`
- `iart-ai/tiktok-video-skills`: `skills/short-form-video/SKILL.md`, `references/retention-pacing.md`
- `pycodebr/heditor`: `skills/heditor/references/{sound-design.md, captions-and-layout.md}`
- `remotion-dev/skills`: `skills/remotion-best-practices/SKILL.md`, `skills/remotion-create/{SKILL.md, video-layout.md}`, `skills/remotion-markup/{timing.md, transitions.md, sfx.md, audio.md, multi-scene-video.md}`
- `nopefallacy/vertical-video-editing-skills`: `skills/video-editing/SKILL.md`
- `Miftahul-Islam-Efaz/Motion-graphics-skill`: `skills/motion-video-director/{SKILL.md, reference/local-sound-workflow.md, reference/cinematic-toolkit.md}`
- `adithya-s-k/manim_skill`: `skills/manim-composer/SKILL.md`, `skills/manimce-best-practices/rules/timing.md`
- `Yusuke710/manim-skill`: `skills/manim-skill/SKILL.md`
- `abhiemj/manim-mcp-server`: `README.md`
- `anthropics/skills`: `skills/` listing, `skills/slack-gif-creator/{SKILL.md, LICENSE.txt}`, `README.md`
- `emircbngl/davinci-resolve-mcp-free`, `wassermanproductions/unofficial-davinci-mcp`: `README.md` (transport claims only)
- Curated lists (README grep for video/manim/remotion/ffmpeg/resolve): `ComposioHQ/awesome-claude-skills`, `travisvn/awesome-claude-skills`, `VoltAgent/awesome-agent-skills`, `heilcheng/awesome-agent-skills`
- Repo metadata: `gh api repos/<owner>/<repo>` and `gh search repos` on 2026-10-18
- Local context: `wt-lesson00/prototypes/lesson-00/star-forge-storyboard.md`, `star-forge-edit/make_edit.py`
