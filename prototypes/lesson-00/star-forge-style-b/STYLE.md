# PROTOTYPE: `star-forge` Style B, "Punchy Short" (9:16 first)

Throwaway; one of three styles to compare. **Length: 12.0 s (360 frames at 30 fps), a seamless loop.** Cut 4 was 14.0 s.

The style is defined in `../research/video-editing-agent-skills.md` §4 "Style B", with the distilled rules in §3. Manim and Resolve mechanics come from `../research/manim-resolve-craft.md`. Below, **[V#n]** means rule n of `video-editing-agent-skills.md` §3, and **[MR §x]** means a section of `manim-resolve-craft.md`.

## Deliverables (`out/`)

| File | What |
|---|---|
| `star-forge-style-b-9x16.mp4` | **Rendered by Resolve** (free 21.1.1) through `../run-resolve-lua.sh`: 1080×1920, 30 fps, 360 frames, H.264 + AAC 48 kHz |
| `star-forge-style-b-16x9.mp4` | **Rendered by Resolve**: 1920×1080, same timing and audio |
| `poster-9x16.png` | Frame 330 of the Resolve 9:16 render: the answer card with the C and its four dots (the storyboard's reduced-motion poster). The "cover" for a feed is frame 0. |
| `preview-ffmpeg-*.mp4` | Not deliverables: the Manim picture muxed with `audio/mix.wav`, used to check before Resolve |

Sources: `manim/star_forge_b.py` (+ `manim/render.sh`), `make_style_b.py` (audio, white flash media, Lua plan), `star_forge_style_b_PROTOTYPE.lua` (the Resolve edit and render). Checks: `loopcheck.py`, `audiocheck.py`, `synccheck.py`, `finishcheck.py`, `sheet.sh`. Contact sheets are in `frames/`. Resolve reports are `probe/run*.log`; run 5 is final.

## What makes this style distinct

- **Frame 0 is the best frame.** The star is at full brightness and the hook line "Where did your carbon come from?" is already on screen. There is no fade-up.
- **Uneven beats on a music grid.** Visual changes come at 0, 1.5, 3.0, 4.0, 6.0, 7.0, 7.5, 8.0 and 11.4 s. Every beat sits on a 120 BPM grid of 15 frames per beat, from a self-synthesised music bed.
- **The drop.** There is 0.3 s of near-stillness and digital silence. Then an impact lands 88 ms before a 3-frame white pop and a 1.09 punch-in on the fusion.
- **The answer card closes the hook's open loop.** The card then dives back into the star, which is the same star as frame 0, and the hook returns. **Frame 359 flows into frame 0 seamlessly**, in picture and in sound.

## Rules followed (with source)

| Rule | How it is applied | Source |
|---|---|---|
| Best frame at 0, no fade-up from black; hook text on screen by frame 1 | The star is at full brightness and the hook is fully drawn on frame 0. Resolve adds **no** fade in. | [V#33] (tiktok, vertical) |
| One open question, closed at the end | Hook "Where did your carbon come from?" (no numbers) → card "Every carbon atom in you was forged in a star." | [V#33], [V#36] |
| A visual change every 2–4 s or sooner, at uneven intervals (no metronome) | Gaps between changes: 1.5, 1.5, 1.0, 2.0, 1.0, 0.5, 0.5, 3.4 (card hold), 0.6 s. The coefficient of variation is about 0.6, far from the "metronomic" < 0.15. | [V#4] (tiktok, resolve-mcp rhythm_audit, vertical) |
| Stillness before climax 0.3–0.75 s; 0.2–0.4 s audio silence before the drop | f66–87: the nuclei creep and nearly stop (0.7 s). The music is cut to digital silence over 2.70–3.00 s; the measured level over 2.72–2.90 s is −87 dBFS. | [V#5] (hf-motion, heditor) |
| Punch-in 1.0 → 1.08–1.10, spring with no bounce | Manim camera: frame width ÷ 1.09 over 15 frames with `ease_out_expo` (no overshoot), starting on the contact frame f90. | [V#4], style B brief (tiktok "cheapest interrupt") |
| 2–3 transition types only | (1) the invisible straight cut, (2) the white pop on the fusion (Resolve), (3) the zoom-through back into the star at the loop seam (Manim). No crossfades between scenes. | [V#9], [V#10] |
| Transform bridges instead of editor dissolves | Nuclei → ¹²C (ReplacementTransform), nucleus → disc → **C** (collapse, then Transform), star → point → star (Restore) | [V#10], [MR §3.2] |
| Never linear easing; expo-out arrivals ≤ 800 ms; exit ≈ 75 % of entry; no bounce/elastic | Arrivals use `ease_out_expo` (nuclei 0.5 s, equation 0.45 s, card lines 0.4 s each). Camera moves use `ease_in_out_cubic`. The card exit takes 5 frames against an entry of 7–9. The valence dots use `ease_out_back` (overshoot 1.7, the allowed maximum). Linear easing is used only for the slow continuous camera drift during the hook. | [V#13], [V#14], [V#16] |
| Similar elements share one ease; staggers ≤ 500 ms | Three nuclei at 89 ms stagger (lag 0.17). **Four dots 4 frames (133 ms) apart: 400 ms total.** Card lines are 0.22 lag apart. | [V#14], [V#16] |
| Never reveal two independent things at once; ≤ 6 active elements | The ¹²C label comes 0.5 s after the merge; the equation comes 0.5 s after the label; the hook leaves on the flash. | [V#2] |
| One velocity-matched pull-back, no dissolve | A single 1.0 s `ease_in_out_cubic` move (camera out + star shrinks + carbon drifts). The cell draws itself in the second half of the move. | Style B brief, [V#11] |
| Seamless loop: the last 0.5 s matches back to frame 0 | f342–360: the card and atom exit, and the camera and star `Restore` to their exact frame-0 states with ease-out. The hook fades back in. Measured on the Resolve render, \|f359 − f0\| = 1.78 against ordinary frame-to-frame motion of 1.3–1.6, so the seam is not visible as a jump. | [V#36] (tiktok) |
| 9:16 safe zones; no text in the top 270 px or the bottom 350 px; right rail 120 px clear; ≥ 80 px from the sides | Measured on rendered pixels: hook top at 329 px with 108 px side margins; equation bottom margin 369 px; card side margins 166 px and bottom margin 530 px. | [V#17] (remotion, tiktok, heditor) |
| Text minimums at 1080 wide | Hook: Space Grotesk Bold, about 62 px cap height (the 64-pt line is scaled to 6.4 units). Card headline: 56 pt scaled ×0.92, about 64 px cap. Supporting text: 38 pt ×0.92, about 46 px cap. Chemistry: JetBrains Mono at 64 pt, about 90 px cap after the punch-in. | [V#18], [MR §3.5] |
| Contrast ≥ 4.5:1, light on dark | White type over `#0d0626`. The hook also has a dark under-stroke because it sits over the nebula and the star halo. | [V#19] |
| Colour = meaning (Arcade Cosmos) | Cyan `#3ee8ff` for nucleons, electrons (dots), the arrow and the cell. Orange `#ff9a1f` for the star. Muted `#b9a8e8` for the supporting line. No pixel fonts anywhere, so none carry chemistry. | [V#20], storyboard |
| Only the numbers 4, 12 and 3 | ⁴He, ¹²C and "3 ⁴He → ¹²C". The hook and the card contain no digits. | brief |
| 9:16 framing via `frame_width`/`frame_height`, not just `-r` | `config.frame_width = 8`, `frame_height = 8·1920/1080` (135 px per unit in both aspects) | [MR §3.5] |
| Fonts must load (they fail silently) | `register_font()` with the bundled TTFs in `fonts/` (OFL) | [V#21] |
| ~8 motivated SFX, each tied to a visible event; vary rates 0.92–1.1 | 8 cue groups (table below). The whoosh rates are 1.08, 0.95 and 1.02, and the dot ticks run 0.92–1.10. No sample is repeated more than 3 times in a row. | [V#22], [V#24] |
| Hit on the frame: align the transient, not the file start; impact 50–120 ms before the visual | Every cue is placed by its measured onset (−20 dB of peak) or by its energy peak (whooshes). **Impact transient at 2.912 s measured in the render, 88 ms before the flash frame at 3.000 s.** | [V#23] (video-use, mvd, heditor) |
| Starting gains: impacts −11 to −14, whooshes −14 to −18, UI −18 to −30 | Impact −9 dB pre-master and boom −6. Whooshes −16 to −18 (pull-back −15). Dot ticks −20, chime −19, frame-0 shimmer −22. The music was balanced by section loudness. | [V#24] |
| Music arc: hook may hit on frame 0; filtered development; silence before the drop; full band at the payoff; ramp down before the last 0.5 s | The pad is filtered under the hook, then silence, then the drop at 3.0 s. It is "radio"-filtered (1.3 kHz) through the body and opens at 5.2 kHz with kicks on every beat for the card. Over 11.0–11.4 s it ramps back down to the hook level. The low "bloom" hits on frame 0 and on every loop seam. | [V#25], [V#37] (heditor) |
| −14 LUFS; TP ≤ −1.5 dBTP for AAC; master once, then measure per section | One master gain plus one shared look-ahead limiter curve applied identically to all stems, so the stems still sum to the mix. Measured on the Resolve renders (below). | [V#26], [V#28] |
| CC0 only, licence per file | `sfx/SOURCES.md` covers Kenney and OpenGameArt (CC0) plus the self-synthesised music | [V#27] |
| Resolve: AddTransition needs handles; free-safe tools only; never Lock across SetInput; prove effects with rendered frames | Record == source on one continuous render, so every dissolve has handles. Only SoftGlow and FilmGrain (native Fusion) and Cross Dissolve are used. Effects are proven by pixel statistics (below). | [V#12], [MR §4.1], [MR §5.1] |

**Deviations, stated:**

- The support line runs to 3 lines in 9:16 ("Organic chemistry is what / that carbon learned / to do next."). The Style B brief asks for ≤ 2 lines per block. Two lines would need about 31 pt (about 38 px cap), under the 9:16 body minimum. The spec copy is kept verbatim, so legibility beat the line count.
- The card holds 2.4 s, longer than the brief's about 1.5 s, so that 19 words can be read. A metronome check still passes.

## Timing table (frames at 30 fps; 15 frames = one beat at 120 BPM)

| Frames | Time (s) | Picture (Manim unless noted) | Sound |
|---|---|---|---|
| 0–45 | 0.0–1.5 | **Star at full brightness + hook line on frame 0**; slow linear push-in (×0.965) | Low bloom + shimmer on f0 (wrapped from the loop); filtered Bm add9 pad; quarter-note bass |
| 45–66 | 1.5–2.2 | Three ⁴He snap in from left, right and below (expo-out, 89 ms stagger), with labels | 3 whooshes peaking on each arrival (L/R/C) |
| 66–87 | 2.2–2.9 | **Stillness**: nuclei creep, labels fade | Riser 2.0–2.7; **digital silence 2.70–3.00** |
| 87–90 | 2.9–3.0 | Snap together (ease-in, 3 frames) | **Impact transient at 2.912 (88 ms before the flash)** |
| 90–105 | 3.0–3.5 | **FUSION**: contact, Manim flash, merge to the ¹²C nucleus, **1.09 punch-in**, hook leaves. **Resolve:** a white pop. Cross Dissolve f89–90 into 3 white frames, then a dissolve out over f92–93. | **Drop**: sub boom on f90; music opens (Gmaj7, kick, 8th-note bass, 16th arp) |
| 105–120 | 3.5–4.0 | ¹²C label lands | (music) |
| 120–180 | 4.0–6.0 | **3 ⁴He → ¹²C** lands (scale 1.18 → 1, expo-out) and holds | Kick on the downbeat at 4.0 |
| 180–210 | 6.0–7.0 | **Pull-back** in one move: star → soft point; carbon drifts out; the cell draws in | Low whoosh peaking at the move's mid-point (6.5); Em7 |
| 210–225 | 7.0–7.5 | Nucleus collapses to a disc, and the disc becomes **C** | Glass ping at f216 (7.2) |
| 225–240 | 7.5–8.0 | **Four valence dots**: top, right, bottom, left, 4 frames apart | Four ticks at f226/230/234/238, rate 0.92 → 1.10, panned with the dots |
| 240–270 | 8.0–9.0 | C lifts; card lands line by line | Chime at f250 on the first line; D add9, the filter opens, kick on every beat |
| 270–342 | 9.0–11.4 | Card holds (2.4 s) | Music full, ramping down over 11.0–11.4 |
| 342–360 | 11.4–12.0 | **Loop dive**: the card leaves in 5 frames; camera and star Restore to frame 0; the hook returns. f359 → f0. | Reversed whoosh + reversed shimmer swelling into the seam, landing on the f0 bloom |

## SFX list (8 cue groups, all CC0 or self-made)

| # | Cue | File | Licence | At |
|---|---|---|---|---|
| 1 | Bloom on frame 0 / loop seam | `lowFrequency_explosion_000.ogg` 0.8×, LP 400 Hz + `glass_004.ogg` 0.7× with reverb | CC0 (Kenney) | 0.000 |
| 2 | ⁴He snap-in whooshes ×3 | `whoosh2_0.wav` (rates 1.08, 0.95, 1.02) | CC0 (OpenGameArt, pyranostudios) | peaks 1.55 / 1.64 / 1.73 |
| 3 | Impact before the flash | `impactSoft_heavy_000.ogg` | CC0 (Kenney) | transient 2.912 (render-measured) |
| 4 | Sub boom on the flash | `lowFrequency_explosion_000.ogg` | CC0 (Kenney) | onset 3.000 |
| 5 | Pull-back whoosh | `whoosh2_0.wav` 0.85×, LP 3.5 kHz | CC0 (OpenGameArt) | peak 6.50 |
| 6 | Disc → C ping | `glass_004.ogg` | CC0 (Kenney) | 7.20 |
| 7 | Valence-dot ticks ×4 | `pluck_002.ogg` (0.92–1.10) | CC0 (Kenney) | 7.53 / 7.67 / 7.80 / 7.93 |
| 8 | Card chime | `confirmation_002.ogg` | CC0 (Kenney) | 8.33 |
| (8b) | Loop dive | `whoosh2_0.wav` reversed + `glass_004.ogg` reversed | CC0 | 11.1 → 12.0 |
| — | Music bed (pad, bass, kick, arp, riser) | synthesised in `make_style_b.py` | own work | throughout |

URLs and details are in `sfx/SOURCES.md`. `audio/cues.json` lists every placement, its anchor and its gain.

**How the loop audio works.** Every bus is a 12.0 s ring. Any tail that runs past 12.0 s wraps onto the start: the chime's reverb, the pad's release, and the filter state, which is pre-rolled from the loop's end. Picture and sound therefore loop with no click; the mix's sample step across the seam is smaller than its neighbours. There is one caveat from the container. Resolve's AAC stream is 12.075 s against 12.000 s of video, and the last 31 ms of decoded audio are encoder padding (silence). A player that loops the .mp4 file naively gets a 31 ms audio hole at the seam. Platforms re-encode, so this matters only for local looping.

## Measured loudness (ffmpeg `ebur128=peak=true` on the Resolve renders)

| Render | Integrated | True peak | LRA |
|---|---|---|---|
| `star-forge-style-b-9x16.mp4` (AAC) | **−14.0 LUFS** | **−2.1 dBTP** | 2.4 LU |
| `star-forge-style-b-16x9.mp4` (AAC) | **−14.0 LUFS** | **−2.1 dBTP** | 2.4 LU |
| `audio/mix.wav` (offline master) | −14.0 LUFS | −2.1 dBTP | 2.4 LU |

Per section (9:16 render): hook 0–2.7 s at −17.0 LUFS; drop/fuse 3–6 s at −13.4; pull/morph 6–8 s at −14.1; card 8–11.4 s at −12.8; loop dive at −16.0. The pre-drop hole measures −87 dBFS.

Resolve passes the mix through untouched. The decoded render audio cross-correlates with `mix.wav` at **0-sample lag**, and the residual is −39 dB (AAC only).

**Honest limit:** these are meters, not ears. I could not listen. The balance between the music and the SFX, and whether the synthesised bed sounds good rather than merely correct, need a human pass, in mono and at low volume [V#28].

## What Resolve did vs what Manim did

**Manim CE 0.22** (`manim/star_forge_b.py`) made every frame of picture. That covers the hook and card typography, the nuclei, the merge, the 1.09 camera punch-in, the pull-back, the morph to C, the staggered dots and the loop dive back into frame 0. It rendered one continuous 360-frame take per aspect, and frame counts are exact (`rt(n) = (n − 0.5)/30`, plus a ticking updater so no wait takes Manim's frozen-frame path).

**Resolve free 21.1.1** (`star_forge_style_b_PROTOTYPE.lua`, run 5, no `!` lines in the report):

- created project `star-forge-STYLE-B-<random>` and imported the media and stems;
- built a 1080×1920 and a 1920×1080 timeline natively, with `AppendToTimeline` and record == source (4 V1 items each, frame-exact on readback);
- added the **fusion white pop** as 2 × `AddTransition("Cross Dissolve")` around 3 white frames;
- added a **Fusion finish on every Manim clip**: `MediaIn → SoftGlow (Threshold 0.62, Gain 0.5) → FilmGrain (MasterStrength 0.06, Monochrome, MasterXSize 0.8) → MediaOut`. It is identical on every clip, so no cut or loop seam shows a look change;
- placed 3 stereo stems on A1–A3 at unity;
- rendered H.264/AAC for both aspects.

Effects were proven from rendered pixels against the Manim source (`finishcheck.py`), never from `GetInput`:

- **Glow:** mean luma rises 31.5 → 34.2 and pixels above 200 rise 2.69 % → 3.00 % on frame 300.
- **Grain:** high-frequency noise in a flat dark patch rises 0.16 → 0.44 (std). At MasterStrength 0.02 it was invisible (0.16 → 0.18); 0.06 gives subtle, visible grain.
- **No watermark** on any frame inspected.

## Resolve API findings on free 21.1.1 (new in this run)

- **`AddTransition({category="fusion", type="Brightness Flash"})` works on free**, with no modal and no watermark. It returned an item (`Brightness Flash @24 dur 12`) and rendered a real flash, which peaks on the cut frame (`probe/probe-brightness-flash-audio-16x9.mp4`, frame 30). I did not use it in the cut: it washes the whole frame lavender, while the 3-frame white pop reads cleaner on this dark material.
- **`FilmGrain:SetInput("MasterStrength", v)` takes effect** (readback matches and grain is visible in the render). The call returns nothing, so its return value is nil, not true. 0.02 is visually nil at 1080p after H.264; 0.06 is subtle.
- **`TimelineItem:SetProperty("AudioVolume", -6)` works on free 21.1.1.** It returned true, `GetProperty` read back −6, and there was no modal. The MCP note that "volume writes return False" (from 21.0) is stale for 21.1.1.
- **`SetFades` on an audio item works.** It returned true and `GetFades` gave in=15, out=15.
- **A centred dissolve after a very short clip is clamped.** On the 3-frame white clip, the second dissolve asked for 4 frames and got 2: Resolve gave each centred transition at most the half-clip it could have. Cut 4 showed the same thing (12 requested, 8 given). Plan the white leg as at least (d1 + d2) / 2 + 1 frames, or accept the clamp, as I did here for a snappier pop.
- `AppendToTimeline` `endFrame` is still **exclusive** (a 0..10 probe gives 10 frames).
- **Scripts-menu lag.** A freshly copied script was not in Workspace > Scripts on the first AXPress (`Can't get menu item`, error −1728). The menu listed it about a minute later, and the rerun worked. The runner could poll the menu before pressing.
- **Resolve's MP4 adds a `tmcd` data stream.** `ffprobe` stream lists come back with an extra row, so tooling should map `0:v:0` and `a:0` explicitly.
