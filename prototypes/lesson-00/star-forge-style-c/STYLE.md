# PROTOTYPE: star-forge, Style C "Cinematic Trailer"

Throwaway prototype for the three-style comparison. Manim CE animates it, and DaVinci Resolve free 21.1.1 edits and finishes it through Lua.

## Deliverables

All three live in `out/`:

- `star-forge-style-c-16x9.mp4`: 1920×1080, 30 fps, 510 frames, 17.0 s. 2.39:1 letterbox. Rendered by Resolve.
- `star-forge-style-c-9x16.mp4`: 1080×1920, 30 fps, 510 frames, 17.0 s. No letterbox. Rendered by Resolve.
- `poster-16x9.png`: frame 509, the card hold.

The cut is **17.0 s**, against 14.0 s for cut 4 (+3.0 s). The extra time comes from three places:

- the 0.7 s sound-only head in black;
- 0.7 s of hover plus snap before the hit;
- a longer final hold (2.5 s after the last element lands).

**Measured on the rendered files** (ffmpeg `ebur128=peak=true`, AAC from Resolve):

| File | Integrated | LRA | True peak |
|---|---|---|---|
| 16:9 | −16.2 LUFS | 7.2 LU | −2.8 dBTP |
| 9:16 | −16.2 LUFS | 7.2 LU | −2.8 dBTP |

The offline `audio/mix.wav` measures −16.2 LUFS and −2.6 dBTP, so Resolve passed the stems through at unity.

## How to rebuild

1. `./render_manim.sh`: renders the Manim half. It uses the cut-4 venv and writes `work/manim/`.
2. `../star-forge-manim/.venv/bin/python -I make_style_c.py`: builds the stems and mix, the FCPXMLs, the Lua PLAN block and the ffmpeg sync previews.
3. `../run-resolve-lua.sh star_forge_style_c_PROTOTYPE.lua STYLE_C_REPORT 900`: Resolve builds the edit, finishes it and renders `out/*.mp4`.

`timing.py` is the single beat plan that the Manim scene, the sound design and the Lua all read.

## Rules followed

Rule numbers refer to §3 of `research/video-editing-agent-skills.md` (VEAS). MRC is `research/manim-resolve-craft.md`.

| Rule | How it shows up | Source |
|---|---|---|
| Sound leads picture for the setup (J-cut) | The rumble starts on frame 0 in black. The picture starts at 0.70 s with a 36-frame fade from black. It is a real J-cut: the stems start at R0 and V1 starts at R21. | VEAS #8, §4 Style C hook; resolve-mcp split-edit audit |
| Slow, weighty camera, ease-in-out, never linear | One continuous 5 s push-in (camera updater, `ease_in_out_sine`) across the star and the approach. The pull-back is 2.5 s ease-in-out sine. No shake. | VEAS #13; MRC §3.6 |
| No idle wobble | Cut 4's "breathing" star was removed; the push-in is the motion. | VEAS #6 (hf-motion) |
| Stillness before the climax (0.3–0.75 s) | The ⁴He decelerate (ease-out cubic) to a 0.5 s near-still hover at the core's rim, then rush in over 0.2 s (`rush_into`). | VEAS #5 (hf-motion) |
| 0.2–0.4 s audio gap before the drop | The riser and the build stop dead at 5.60 s. There is 0.30 s of silence (−67.8 dBFS peak in the render), then the hit at 5.90 s. | VEAS #5 (heditor music arc) |
| Hit on the frame; align the transient | The Kenney boom and punch are placed by their measured attack. The impact onset in the render is at frame 176.96, against contact frame 177. The card thump peaks at R402.3, against the seam at R402. | VEAS #23 (video-use, mvd) |
| Causal motion: effects start on the causing frame | The contact frame is the section cut s2→s3. The Brightness Flash is centred on it and the HotSpot spike keys from its first frame. | VEAS #11 (hf-motion causal motion) |
| Small transition vocabulary (2–3 types) | Fade from black, Brightness Flash on the hit, inverse zoom-through to the card. All other cuts are invisible cuts inside the continuous render. | VEAS #9, #10 |
| Inverse zoom = arrival | Exit leg: content 1→0.8 over 0.2 s, power-in. Entry leg: card 1.25→1 over 0.5 s, expo-out. The Z-sign matches across the seam. A blur of up to 14 px across the seam is added in Resolve. | VEAS #11, §2.4 (hf-curve numbers) |
| One new element at a time | The card's bold line arrives with the zoom; the second line fades in 0.2 s after it lands. | VEAS #2 |
| Final hold 2.5–3 s | The card holds 2.5 s after its last element lands. The last frame is the poster. | VEAS #35, §4 Style C ending |
| Fewer, motivated, low and heavy SFX | About 8 cues: rumble, riser, hit stack, whoosh, one shimmer, reverse swell, card thump, plus the score. The four valence dots are silent. | VEAS #22; §4 Style C sound |
| Whoosh tied to the velocity envelope | Its level and low-pass cutoff follow sin(π·q), the derivative of the camera's ease. | VEAS §2.8 (mvd) |
| Music arc: build → gap → drop → pad → swell → fade before the end | See the table below. The music is silent from 16.50 s, 0.5 s before the end. The card swell measures −16.2 LUFS (section), against the hit's −12.2, so the card is not 15 dB under. | VEAS #25, #37 (heditor, video-use) |
| −16 LUFS for dynamic range; TP ≤ −1.5 dBTP for AAC | Measured −16.2 LUFS and −2.8 dBTP on the AAC renders. One master gain and one limiter gain curve are shared by all stems. | VEAS #26 (resolve-mcp web band, heditor AAC note) |
| Verify by measuring, not by claiming | Section loudness was measured in K-weighted LUFS. The impact was rebalanced twice because the build was within about 1 LU of the hit. I cannot listen to the mix; these are metrics only. | VEAS #28 |
| Technical pass before the look | ColorCorrector: master contrast 1.04 first. Then the creative lean: shadows cooler (blue ×1.06, red ×0.97 in shadows), highlights a hair warmer. | VEAS #29 (resolve-mcp colour guide) |
| Restrained look | SoftGlow (threshold 0.5–0.62); FilmGrain `MasterStrength` 0.015; EllipseMask vignette (gain 0.70, soft edge 0.45). The 2.39:1 letterbox is 16:9 only. | VEAS #30, §4 Style C colour; MRC §5.1 |
| Lens flare from native HotSpot, not ResolveFX | Two HotSpots on the star: a small hot core and an anamorphic streak (`Aspect` 12). Keyed: kindles, charges under the hover, spikes on the hit, dies as the star recedes. | MRC §5.1, §5.3 |
| 9:16 framing by frame_width/height | `frame_width = 8`, `frame_height = 8·1920/1080`. The card is centred in the safe box (top ≥ 270 px clear), body 48 / 32. | MRC §3.5; VEAS #17, #18 |
| ≥ 80 px side margins | The 16:9 card is capped at 82 % of the frame width. Cut 4's line ran to 40 px from the edge. | VEAS #17 (remotion) |
| Arcade Cosmos colours; only 4, 12, 3 on screen | Unchanged tokens. The only numbers are ⁴He, ¹²C and the coefficient 3. Chemistry is set in JetBrains Mono and the card in Space Grotesk; there are no pixel fonts. | storyboard |

## Timing

R = timeline frame at 30 fps; M = Manim frame (R = M + 21).

| Time (s) | R frames | Beat | Picture | Sound |
|---|---|---|---|---|
| 0.00–0.70 | 0–21 | Black | Nothing | Rumble rises (J-cut) |
| 0.70–2.70 | 21–81 | Star kindles | Fade from black (36 f); star fades in; push-in starts; flare kindles | Build drone opens; heartbeat pulses start at 1.5 s |
| 2.70–5.20 | 81–156 | Approach | Three ⁴He spiral in and decelerate; labels fade at the end | Riser; pulses accelerate and grow |
| 5.20–5.70 | 156–171 | Hover (stillness) | Near-still at the core rim; flare charges | Build peaks |
| 5.60–5.90 | 168–177 | Audio gap | Snap (R171–177) | **Silence 0.30 s** |
| 5.90 | 177 | **Fusion hit** | Contact; Brightness Flash R173–181; HotSpot spike; white flash and shock ring (Manim) | Boom + punch + sub drop + crack; braam drop |
| 5.90–8.40 | 177–252 | Fuse | ¹²C forms; label; "3 ⁴He → ¹²C" writes on (R183–228) | Braam decays into the Dm pad |
| 8.40–10.80 | 252–327 | Pull-back | Star shrinks to a point; carbon drifts out | Velocity whoosh (peak 9.65 s) |
| 10.80–11.50 | 327–345 | Cell | Membrane draws on | Pad |
| 11.50–12.20 | 345–366 | Morph | Nucleus → C | Shimmer at 12.2 s |
| 12.20–13.20 | 366–396 | Dots | Four valence dots, one at a time | Silent dots; swell starts at 12.0 s |
| 13.20–13.40 | 396–402 | Exit leg | Recede 1→0.8; blur 0→14 px | Reversed swell |
| 13.40–13.90 | 402–417 | **Card lands** | 1.25→1, expo-out; blur 14→0 | Sub thump; D major chord |
| 14.10–14.50 | 423–435 | Second line | Fades in | Pad |
| 14.50–17.00 | 435–510 | Hold | Poster frame | Music fades 15.2–16.5 s; silent last 0.5 s |

## Sound list

See `sfx/SOURCES.md` for URLs and licences. Stems sit on A1 `music`, A2 `sfx` and A3 `amb`; the cue log is `audio/cues.json`.

- **CC0:** Kenney `lowFrequency_explosion_000`, `impactSoft_heavy_000` and `glass_004`; OpenGameArt `space-wind_0` (aquinn).
- **Self-synthesised (numpy/scipy):** rumble, drone build, heartbeat pulses, riser, braam, pads, shimmer, sub drop, crack, velocity whoosh, reverse swell, card thump.

## What Manim did and what Resolve did

**Manim** (`star_forge_c.py`):

- all motion: push-in, spiral approach, hover and snap, flash and shock ring, merge, equation write-on, pull-back, cell, morph, dots;
- both legs of the inverse zoom;
- the layout for both aspects, including composing the 16:9 frame inside the 2.39:1 letterbox.

**Resolve** (`star_forge_style_c_PROTOTYPE.lua`):

- **Timeline.** Imported from FCPXML: a black head gap, 7 sections on V1, letterbox clips on V2/V3, and 3 stems on A1–A3.
- **Transitions and fades.** The Brightness Flash transition (fusion category) and the fade from black (`SetFades`).
- **Letterbox.** Crop on the V2/V3 black clips, so the flash cannot brighten the bars.
- **Fusion finish per section.**
  - Keyed HotSpot core plus anamorphic streak.
  - SoftGlow.
  - ColorCorrector grade.
  - FilmGrain.
  - EllipseMask vignette.
  - Keyed Blur across the zoom seam.
- **Render.** H.264 + AAC in both aspects.

**Offline (ffmpeg/numpy):** synthesis and the mix (Resolve has no API for Fairlight automation; MRC §4.2).

## Resolve API findings on free 21.1.1.10

- **Crash:** `Timeline:AddTrack("video")` (no subtype), called right after `CreateEmptyTimeline` and `AppendToTimeline`, crashed Resolve. The log shows `std::out_of_range: vector`, SIGABRT. Avoid it; build extra video tracks through FCPXML lanes instead.
- **Works:**
  - `AddTransition({category="fusion", type="Brightness Flash"})` and `type="Glow"`. No upsell; rendered frames show the effect.
  - `ImportTimelineFromFile` of FCPXML 1.10 with a leading `<gap>` that carries connected clips: video lanes 1–2 became V2/V3, audio lanes −1..−3 became A1–A3. The gap renders as black, and the render includes it.
  - `TimelineItem:SetProperty("CropTop"/"CropBottom", px)` returns true and reads back. The bars render, and the transition does not touch them.
  - `FilmGrain` `MasterStrength` sets and renders (frame difference confirms animated grain). Cut 4's `Strength` was the wrong name.
  - `HotSpot`: `PrimaryCenter` takes `{x, y}`; `PrimaryStrength` keys via `comp:BezierSpline`; `Aspect` < 1 stretches vertically and > 1 horizontally.
  - `Blur` `XBlurSize` keys.
  - `EllipseMask` (`Invert`, `SoftEdge`) on a `BrightnessContrast` `EffectMask` gives the vignette.
  - `SetFades` on a clip that starts after a gap.
- **Traps:**
  - With default HotSpot settings, `RadialOn=1` draws a hard horizontal seam and `LensAberration` draws a rainbow ring. Set both to 0.
  - Comp render range includes transition handles: on-screen frame 0 = `COMPN_RenderStart` + half the incoming centred transition.
  - A report line of several kB (a full `GetInputList` of ColorCorrector) truncates the report in ResolveDebug.txt; keep reports short.
  - A newly copied script appears in Workspace > Scripts only after the menu is re-read. Listing it through System Events accessibility, with no click and nothing brought to the front, was enough.
