# PROTOTYPE: `star-forge` in Style A, "Calm Explainer" (3Blue1Brown)

Throwaway. This is one of three styles for side-by-side comparison. It is built from the cut-4 work; `star-forge-manim/` and `star-forge-edit/` are untouched.

**Length: 24.97 s (749 frames at 30 fps).** Cut 4 runs 14 s. Style A is longer on purpose: every reveal gets the hold the research asks for (equation 2 s + 2 s, aha hold, card ≥ 3 s), and the climax gets a still beat before it.

## Deliverables (`out/`)

| File | What |
|---|---|
| `star-forge-style-a-16x9.mp4` | 1920×1080, 30 fps, H.264 about 11 Mb/s + AAC 48 kHz stereo. **Rendered by Resolve** (free 21.1.1) through `run-resolve-lua.sh`. |
| `star-forge-style-a-9x16.mp4` | 1080×1920, same, rendered by Resolve. |
| `poster-16x9.png` | Last frame (748) of the Resolve 16:9 render: the poster frame. |
| `manim/` | The clean continuous Manim renders (Resolve's input) and the beat logs `beats-<aspect>.json`. |
| `probe/` | Short probe renders used to choose the flash transition and check the finish. |

## How to rebuild

1. `manim/render.sh all` renders both aspects with the cut-4 venv and fonts, and writes `out/manim/beats-*.json`.
2. `../star-forge-manim/.venv/bin/python -I make_audio_a.py` reads the beat log and writes `audio/{amb,fx,ui}.wav`, `mix.wav` and `cues.json`.
3. `python3 make_lua_a.py` fills `star_forge_style_a.lua.in` with the contact and total frames from the beat log. It writes `star_forge_style_a_PROTOTYPE.lua` (final) and `star_forge_style_a_probe_PROTOTYPE.lua`.
4. `../run-resolve-lua.sh star_forge_style_a_PROTOTYPE.lua STYLE_A_REPORT 1500`. Each run makes its own project, `star-forge-STYLE-A-<random>`.

Picture, sound and the Resolve cut all come from one beat log, so they cannot drift apart.

## What is distinctive about Style A

- **One continuous, object-continuous film.** Nothing is cut away. Every beat turns into the next inside Manim:
  - 3 ⁴He → ¹²C through `ReplacementTransform` of the nucleons;
  - ¹²C label → the equation's ¹²C through `TransformFromCopy`, which shows where the term came from;
  - nucleus → letter C through `FadeTransform`;
  - the camera's push-in and pull-back.
- **Exactly one editorial transition:** a 10-frame Fusion **Glow** bloom on the fusion contact frame. There are no dissolves anywhere else.
- **Slow → medium → climax → slow tempo.** It has a 0.35 s stillness before contact and long reading holds.
- **Quiet, sparse sound.** Five cue types: bed, one impact, a shimmer, dot tings and a chime. The approach and the pull-back are silent. The integrated loudness is set by the bed, and the events sit only 2–5 LU above it.
- **Restrained finish:** a soft glow, barely-there grain, a gentle vignette, and no creative grade.

## Rules followed (with sources)

Tags: **[VEA §n]** = `research/video-editing-agent-skills.md` rule n (§3) or section; **[MRC §n]** = `research/manim-resolve-craft.md` section.

| Rule | How it is applied | Source |
|---|---|---|
| Fade-up allowed in 3B1B mode | A 30-frame fade from black (Resolve `SetFades`). The star `FadeIn` with push-in runs over 2.2 s in Manim. | VEA #34, §4 Style A "Hook" |
| Transform bridges, not editor dissolves | All beat changes are Manim transforms in one render. Resolve cuts it only once. | VEA #10, §4 Style A "Transitions"; MRC §3.2 |
| `FadeTransform` for very different shapes | nucleus → C | MRC §3.2 |
| `TransformFromCopy` to show provenance | ¹²C label → equation term | MRC §2, §3.2 |
| `path_arc` for moves | The ⁴He spiral in (−35°). The copy arcs into the equation (−40°). | MRC §2, §3.2 |
| One new element at a time | The ⁴He appear one by one (`LaggedStart`, lag 0.55). Dots grow one at a time with 0.12 s gaps. The merge comes before the equation (geometry before algebra). | VEA #2; MRC §3.7 |
| Key equation 2 s write + 2 s hold | `Write("3 ⁴He →")` 1.2 s + `TransformFromCopy` 0.8 s = 2.0 s, then a 2.0 s hold. `Write` gets an explicit `run_time` and `linear`. | VEA §2.2 speed table; MRC §3.1, §3.3 |
| Stillness before the climax, 0.3–0.75 s | A 0.35 s hold with the nuclei near the centre, then a 0.4 s ease-in rush to contact. | VEA #5 |
| Aha moment gets a hold | C + four dots, then a 0.7 s hold before the card moves. | VEA #3 |
| Card hold ≥ 3 s; final frame holds; no fade to black | 3.2 s hold on the finished card. The last frame is the poster. The ambience fades over the final 1 s. | VEA #35, #37, §4 Style A "Ending" |
| `smooth` / ease-in-out; never linear for moves; no bounce | `smooth` and `ease_in_out_sine` on every move and camera move. `linear` only for `Write`. The dots use `ease_out_cubic`. | VEA #13, #14; MRC §3.3 |
| One camera move at a time, calm | Push-in (2.2 s), drift-in (2.0 s), pull-back (2.4 s), reframe during the morph (1.2 s). Never two at once. | MRC §3.6 |
| Picture-led sync, transient on the frame | Each cue's transient (first sample within 30 dB of its peak) is placed on its visual frame. Measured on the Resolve render: impact −1 ms, chime −1 ms, dots and glass within ±2 frames (see below). | VEA #23; MRC §3.3 |
| Fewer, motivated SFX; calm moves silent | 5 cue types (8 events) in 25 s. The approach and the pull-back are silent. | VEA #22 |
| SFX gains: impacts loud, UI ticks very low | Impact −8 dB, glass −20, chime −21, dots −32 (pre-master trims). The bed carries the integrated level. | VEA #24 |
| Loudness −16 LUFS ±2, TP ≤ −1.5 dBTP for AAC | One master gain, plus a linked look-ahead limiter (one gain curve applied to all stems, so they still sum to the mix). Measured on the final AAC renders. | VEA #26; MRC §4.2 |
| CC0 only, licence logged per file | `sfx/SOURCES.md`. The dot tings are self-synthesised. | VEA #27; MRC §6 |
| Mix offline; Resolve only places stems | 3 stems on A1–A3 at unity. There is no Fairlight automation. | MRC §4.2 |
| 9:16 via `frame_width` / `frame_height` | `frame_width = 8`, `frame_height = 8·1920/1080`. The layout reflows per aspect. | MRC §3.5 |
| 9:16 type sizes and safe area | Card bold line `font_size` 50 (~89 px em), support 34. The equation is raised to y = −0.19·FH so it clears the bottom 350 px band. `safe_text` caps the width. | VEA #17, #18; MRC §3.5 |
| Colour = meaning, Arcade Cosmos | Cyan = nuclei, electrons and the arrow. Orange = the star. White = text and C. Muted = support line. JetBrains Mono carries the chemistry, Space Grotesk the card. No pixel fonts. The only numbers are 3, 4 and 12. | VEA #20; MRC §3.4; storyboard |
| Bloom in post, not Manim | Fusion `SoftGlow` (Threshold 0.62, Gain 0.38, XGlowSize 8) | MRC §3.4, §5.1 |
| Very light grain with `MasterStrength` | `FilmGrain` `MasterStrength` 0.02, `MasterXSize` 0.8, Monochrome | MRC §5.1 |
| Vignette = inverted `EllipseMask` on a darkening tool | `BrightnessContrast` Gain 0.72, masked by `EllipseMask` (Invert, SoftEdge 0.45) | MRC §5.1 |
| Native Fusion only, no ResolveFX, no Studio calls | SoftGlow, FilmGrain, BrightnessContrast, EllipseMask, and the pure-Fusion "Glow" transition | MRC §5.2, §5.3 |
| No creative grade; check levels only | No colour tools. Card text measures 250/255 after the finish; nothing new clips. | VEA #29, #30 |
| Lock only around structure; prove effects with rendered frames | `comp:Lock()` only around `AddTool`. Every effect was checked on rendered frames (below), not with `GetInput`. | MRC §5.1 |

## Timing table (scene clock = timeline; frames at 30 fps)

| Beat | Time (s) | Frames | What happens | Sound |
|---|---|---|---|---|
| 1 Star | 0.00–2.20 | 0–66 | 1 s fade from black (Resolve). The star core fades up, breathing slightly, with a slow push-in. | Bed fades in over 1 s |
| 2a ⁴He enter | 2.20–3.50 | 66–105 | Three ⁴He appear one at a time, each with its label. | silent |
| 2b Drift | 3.50–5.50 | 105–165 | They spiral in (path_arc). The labels fade over the last 0.5 s. | silent |
| 2c Stillness | 5.50–5.87 | 165–176 | Near-still hold before the climax | silent |
| 2d Rush | 5.87–6.27 | 176–188 | Ease-in to contact | silent |
| **3a Contact / flash** | **6.267** | **188** | Merge into ¹²C. Resolve **Glow** transition over frames 183–193. | **Soft impact** on frame 188 |
| 3b Merge | 6.27–7.27 | 188–218 | Nucleons → ¹²C. The ¹²C label fades in. | impact tail |
| 3c Equation write | 7.27–9.27 | 218–278 | `Write("3 ⁴He →")` 1.2 s, then the ¹²C label copies into the equation (0.8 s) | — |
| 3d Equation hold | 9.27–11.27 | 278–338 | Read time | — |
| 4 Pull-back | 11.27–13.67 | 338–410 | The camera pulls back. The star shrinks to a point and the carbon drifts out. The equation fades. | **silent** (bed only) |
| 4b Cell | 13.67–14.47 | 410–434 | The cell outline draws on | — |
| 5a Morph | 14.47–15.67 | 434–470 | `FadeTransform` nucleus → C. The camera reframes. | **Glass shimmer** at 14.933 (448) |
| 5b Dots | 15.87–17.43 | 476–523 | Four valence dots, one at a time (top, right, bottom, left) | **Tings** 478, 490, 502, 514 |
| 5c Aha hold | 17.43–18.17 | 523–545 | Hold | — |
| 6a Rise | 18.17–19.07 | 545–572 | The atom rises. The cell fades. | — |
| 6b Card | 19.07–21.07 | 572–632 | The bold line writes on (2.0 s) | **Chime** at 572 |
| 6c Support line | 21.07–21.77 | 632–653 | The muted line fades in | — |
| 6d Hold → poster | 21.77–24.97 | 653–749 | 3.2 s hold. The last frame is the poster. | Bed fades over the last 1 s |

## SFX list (all CC0 or self-made; details in `sfx/SOURCES.md`)

| Cue | Source | Licence | Stem | Hit (s / frame) | Trim |
|---|---|---|---|---|---|
| Ambience bed | `space-wind_0.mp3` (OpenGameArt, aquinn) + `spaceEngineLow_000.ogg` (Kenney Sci-Fi) | CC0 | A1 amb | 0 → end | −21 dB |
| Soft impact | `impactSoft_heavy_000.ogg` (Kenney Impact) + `lowFrequency_explosion_000.ogg` (Kenney Sci-Fi), low-passed at 300 Hz, layered 10 dB under. The click is shaved 9 dB. | CC0 | A2 fx | 6.267 / 188 | −8 dB |
| Glass shimmer | `glass_004.ogg` (Kenney Interface) + reverb | CC0 | A2 fx | 14.933 / 448 | −20 dB |
| 4 dot tings | self-synthesised sines, 880, 988, 1109 and 1319 Hz | own output | A3 ui | 478, 490, 502, 514 | −32 dB |
| Card chime | `confirmation_002.ogg` (Kenney Interface) + reverb | CC0 | A3 ui | 19.067 / 572 | −21 dB |

## Measured

**Loudness** (ffmpeg `ebur128=peak=true` on the final Resolve AAC renders; both aspects are identical):

- **Integrated −16.0 LUFS**
- **True peak −2.5 dBTP**
- LRA 2.2 LU

The offline `mix.wav` also measures −16.0 LUFS and −2.5 dBTP, so Resolve's unity-fader sum of the 3 stems plus AAC encoding changed nothing measurable.

Momentary loudness by section:

| Section | Momentary (LUFS) |
|---|---|
| Bed alone | −16 to −17.5 |
| Fusion impact | −10.9 |
| Morph and dots | −14.1 to −14.2 |
| Card chime | −12.6 |
| Final frame | −28.7 (the bed fade) |

Why the bed sits near −16: in a mix this sparse, the bed sets the integrated level, so it has to sit there to reach −16 integrated. The linked limiter takes about 5 dB for roughly 150 ms around the impact. Nothing else is limited.

These are metrics. Nobody listened to the mix, so it still needs a real listen, including in mono and at a quiet volume (VEA #28).

**Sync** (detected onset in the render's audio vs the visual frame):

| Cue | Offset |
|---|---|
| Impact (vs contact frame 188) | −1 ms |
| Chime (vs card frame 572) | −1 ms |
| Dots 1–4 | +12, −65, −44, +8 ms |
| Glass | −73 ms |

The dot and glass figures come from a band-pass detector, and the neighbouring tings and reverb leak into it. By construction every transient is placed on its frame. All cues are within ±2.2 frames.

**Picture** (checked on frames extracted from the Resolve renders at 18 beat times per aspect, `frames/final16/sheet.png` and `frames/final9/sheet.png`):

- The fade-up, the ⁴He entering one at a time inside the frame, the Glow bloom on 183–192, the equation, the pull-back, the morph, the dots, the card and the poster are all correct in both aspects.
- The effects were proved on rendered pixels:
  - SoftGlow halo is visible on the text and the star.
  - Vignette darkens the corners from 32.9 to 30.4 (8-bit mean).
  - Grain raises temporal noise in a flat dark patch from 0.06 to 0.33 std, and shows as fine texture on the white C in the poster.

## What Manim did vs what Resolve did

**Manim (CE 0.22, `manim/star_forge_a.py`):**

- All animation and every transition between beats: transforms, the camera, the write-ons, and the in-scene flash disc.
- All type and layout per aspect.
- The beat log.

**Resolve (free 21.1.1, Lua):**

- Built two timelines natively. Each has one continuous clip split at the contact frame (`AppendToTimeline` ×2).
- Added the **one** Fusion "Glow" transition on that cut (`AddTransition`, category `fusion`, 10 frames, centred).
- Applied the 30-frame fade from black (`SetFades`).
- Finished every clip with a Fusion comp: MediaIn → SoftGlow → FilmGrain → BrightnessContrast (EllipseMask vignette) → MediaOut.
- Placed the 3 CC0 stems on A1–A3.
- Rendered H.264 + AAC in both aspects.

**Offline (Python and ffmpeg):** the whole sound design and master. Resolve only places the stems.

## Resolve API findings on free 21.1.1 (new in this run)

- **`AddTransition` with `category = "fusion"` works on free.** `type = "Glow"` and `type = "Brightness Flash"` both returned a transition item, rendered with no watermark, and raised no modal.
  - Brightness Flash lifts the whole frame to a flat lavender wash, the harsh slab Style A avoids (`frames/probe/flash-compare.png`).
  - Glow is a bloom concentrated on the bright star, with no slab. It was chosen.
- **A transition between two halves of one continuous clip has handles automatically.** Splitting one source at frame N gives both sides real handles, so a centred fusion transition succeeds. Readback: `Glow@183+10` around the cut at 188.
- **`FilmGrain` `MasterStrength` takes effect.** It was confirmed by rendered-frame noise, not by `GetInput`. In cut 4 the grain was bypassed because `Strength` read back nil.
- **The `EllipseMask` vignette works:** `bc.EffectMask = ell.Mask`, with inputs `Width`, `Height`, `SoftEdge`, `Invert`. The input lists for `SoftGlow` and `EllipseMask` are in the report.
- **`SetRenderSettings({ VideoQuality = "Best" })` returns false on free H.264 MP4.** It is harmless; the default gave about 11 Mb/s.
- **Runner gotcha:** a newly copied script is not clickable in Workspace > Scripts until Resolve rebuilds the menu.
  - The first run failed with System Events error −1728 (menu item not found). Listing the menu (read-only, through System Events) showed the script; the re-run then worked.
  - Pre-copying the final script into `Fusion/Scripts/Utility/` before its run avoided the problem.
- Render time: about 7–8 s per 25 s aspect, including the Fusion comps and the transition.
