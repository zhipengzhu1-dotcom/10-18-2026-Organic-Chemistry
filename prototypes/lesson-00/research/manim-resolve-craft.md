# PROTOTYPE research: Manim CE craft for 3b1b-style explainers, and finishing in free DaVinci Resolve 21.1.1 with Lua

Research for Lesson 0 (`star-forge`), 2026-10-18. Throwaway. The companion note `video-editing-agent-skills.md` covers general video-editing agent skills. This note goes deep on Manim and on Resolve scripting.

How much to trust each claim:

- **[V-src]**: checked against source code or vendor files on this machine (Manim CE 0.22.0 in `star-forge-manim/.venv`, Resolve 21.1.1 free install, the davinci-resolve-mcp docs).
- **[V-run]**: verified earlier in our own Resolve run.
- **[V-web]**: read on the cited web page today.
- **[Community]**: a rule from an agent skill. It is an opinion, not a spec.
- **[Unverified]**: not checked. Probe it before relying on it.

---

## 1. Manim agent resources on GitHub (what exists)

| Resource | What it is | Signal |
|---|---|---|
| [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) (MIT, about 1.2k stars) | Three skills: `manim-composer` (plans a `scenes.md`), `manimce-best-practices` (rules for timing, transforms, camera, colours, text and more), `manimgl-best-practices` | The most-starred Manim skill. Its rules are generic API notes. The useful parts are the composer's "3b1b principles" and its timing table. |
| [NousResearch/hermes-agent `skills/creative/manim-video`](https://github.com/NousResearch/hermes-agent/tree/main/skills/creative/manim-video) (MIT) | A full plan, code, render, stitch and review pipeline with 14 reference files | Copied widely: the same `manim-video` SKILL.md appears in graniet/kheish, ArgentAIOS, AlexAI-MCP/hermes-CCC and others. It has the most opinionated craft rules (opacity layering, "breathing room", timing tables, type scale). |
| [AmitSubhash/3brown1blue](https://github.com/AmitSubhash/3brown1blue) (MIT) | A Claude Code skill and CLI. `rules/animation-design-thinking.md`, `production-quality.md`, `visual-design-principles.md` and others | Shares text with the Hermes refs (one is derived from the other). It has the best "pacing and cognitive load" guidance. |
| [affaan-m/everything-claude-code `skills/manim-video`](https://github.com/affaan-m/everything-claude-code) | A shorter manim-video skill | Forked into many "everything-*" repos. |
| [iart-ai/manim-skills](https://github.com/iart-ai/manim-skills), [Yusuke710/manim-skill](https://github.com/Yusuke710/manim-skill) (TTS and subtitle lint tools), [mathifylabs/ManimAgentPrompts](https://github.com/mathifylabs/ManimAgentPrompts) (layout-safe system prompts) | Smaller skills and prompt sets | Low added value over the three above. |
| [abhiemj/manim-mcp-server](https://github.com/abhiemj/manim-mcp-server) (about 650 stars) | An MCP server with just two tools, `execute_manim_code` and `cleanup_manim_temp_dir` [V-src] | It only executes code and teaches no craft. Others (wstcpyt, paulnegz, Avik-creator) are similar. |
| [3b1b/videos](https://github.com/3b1b/videos) | Grant Sanderson's real scene code (ManimGL, not CE). It now ships a **`CLAUDE.md`** | The primary human source. Section 2 has measured patterns from it. |

A search for "manim cursor rules" found no dedicated repos. Manim guidance lives in SKILL.md-style files instead.

---

## 2. What 3b1b actually does (measured from 3b1b/videos)

Sources: [3b1b/videos `CLAUDE.md`](https://github.com/3b1b/videos/blob/master/CLAUDE.md) and [`custom_config.yml`](https://github.com/3b1b/videos/blob/master/custom_config.yml). I tallied four 2025 scene files (`_2025/laplace/exponentials.py`, `_2025/laplace/main_equations.py`, `_2025/cosmic_distance/planets.py`, `_2025/cosmic_distance/paralax.py`; 8,261 lines, 576 `self.play` calls). [V-src]

- **Render config:** 3840×2160 at 30 fps, background `#000000`, `file_writer.saturation: 1.5` (output saturation is boosted), `text.font: "CMU Serif"`.
- **Scenes are short clips, cut together in an editor.** `stage_scenes.py` stages rendered scenes in order for the edit. Pacing to the voiceover happens in the NLE, not in code. That is why **243 of 284 `self.wait` calls are a bare `self.wait()` (1 s)**. Long holds are trimmed or extended in the edit.
- **`run_time` is longer than the skills suggest.** The most common values are 2 s (78), 3 (49), 5 (43), 4 (32), 1 (21), 8 (15), 10 (13) and 12 (10). Slow evolutions and camera moves of 8–20 s are normal.
- **Rate functions:** the default `smooth` is used almost everywhere. Overrides are rare: `linear` (13, for continuous motion and time evolution), custom lambdas (12), `wiggle` (10), `there_and_back` (6) and `rush_into` (2). There are no bouncy or elastic eases.
- **Animation mix:** FadeIn 174, FadeOut 159, Write 84, ShowCreation 72 (CE's `Create`), **TransformFromCopy 55**, LaggedStart 45, FadeTransform 32, LaggedStartMap 31, ReplacementTransform 24, GrowArrow 23, Transform 19, TransformMatchingTex 15, FlashAround 4.
- **Stagger:** `lag_ratio=0.1` dominates (40 uses), then 0.25, 0.05, 0.5 and 0.2.
- **Arcs:** when things move to a new place they often take `path_arc=45°` or `±90°`.
- **Camera:** `self.frame.animate.reorient(...)` appears 122 times across the four files. The camera moves often but slowly.
- **Code style** (from CLAUDE.md): use `.arrange()`, `.next_to()` and `.move_to()` rather than coordinate arithmetic. Use `t2c={...}` colour maps on Tex. Use `LaggedStart(*anims, lag_ratio=0.1)`. Follow `Write(eq)` with `self.wait()`.

**Takeaway for us:** we have no voiceover, so the Manim render is the timing. We have to write the holds into the code ourselves, which 3b1b leaves to the edit. Alternatively, render beats as sections (we already use `--save_sections`) and set the holds in Resolve.

---

## 3. Concrete Manim CE rules

### 3.1 Defaults you are fighting (Manim CE 0.22.0 source) [V-src]

- `Animation`: `run_time=1.0`, `rate_func=smooth`, `lag_ratio=0` (`manim/animation/animation.py`). `self.wait()` lasts 1.0 s (`DEFAULT_WAIT_TIME`).
- `Write`: `rate_func=linear`. **`run_time` is 1 s if the mobject has fewer than 15 sub-paths, else 2 s.** `lag_ratio = min(4/n, 0.2)` (`creation.py::_set_default_config_from_length`). A long sentence therefore writes in 2 s regardless of length, so pass `run_time` explicitly. A rough guide is 1 s per 3–4 words for a card line.
- `DrawBorderThenFill`: `run_time=2`, `rate_func=double_smooth`. This is the "stroke then fill" look.
- `smooth` is a sigmoid with `inflection=10`. `rush_into` and `rush_from` are its halves. `there_and_back` returns to the start, which makes it good for pulses. `smoothstep`, `smootherstep` and `smoothererstep` exist for gentler ease curves.
- `TransformMatchingShapes` matches sub-paths by a hash of their normalised point coordinates. It suits morphing text into text that shares glyphs.
- Docs: [rate_functions](https://docs.manim.community/en/stable/reference/manim.utils.rate_functions.html), [Write](https://docs.manim.community/en/stable/reference/manim.animation.creation.Write.html), [FadeTransform](https://docs.manim.community/en/stable/reference/manim.animation.transform.FadeTransform.html), [MovingCameraScene](https://docs.manim.community/en/stable/reference/manim.scene.moving_camera_scene.MovingCameraScene.html).

### 3.2 Which transform to use

| Situation | Use | Why |
|---|---|---|
| Similar geometry (equation step, circle to ellipse, nucleus to slightly bigger nucleus) | `ReplacementTransform(a, b)` | The target becomes the live object, so you animate `b` next. Plain `Transform` leaves `a` on screen looking like `b`, and `b` is never added, so later animations of `b` do nothing [Community, consistent with the CE docs]. |
| Very different shapes (nucleus to the letter **C**, diagram to chart, text to equation) | `FadeTransform(a, b)` | `Transform` interpolates control points and makes ugly intermediate shapes. `FadeTransform` cross-fades while stretching to match [Community: 3brown1blue `animations.md` Pattern 5; the CE class is V-src]. |
| Keep the source and spawn a derived copy (each ⁴He label feeding the "3 ⁴He" term) | `TransformFromCopy(a, b)` | It is 3b1b's second most common transform (55 uses). It shows where a thing came from. |
| Equation to equation with shared terms | `TransformMatchingTex` (split the TeX into parts), or `TransformMatchingShapes` for `Text` | Shared parts glide and new parts fade. |
| Moving to a new place | add `path_arc=45*DEGREES` | Curved paths read as intentional (a 3b1b habit). |

### 3.3 Timing and "let it breathe"

Merged from the skills [Community], checked against 3b1b's numbers (section 2):

| Beat | run_time | Hold after |
|---|---|---|
| Supporting label or small FadeIn | 0.5–1 s | 0.3–0.5 s |
| Key text or equation first appears (Write) | 1.5–2 s | **2–3 s** (the viewer must read it) |
| Transform or morph | 1.5–2 s | 1–1.5 s |
| Camera push or pan | 2–3 s (3b1b uses up to 8 s or more) | 1 s |
| Climax reveal (our "Every carbon atom in you was forged in a star.") | 2–2.5 s | **3 s** |
| FadeOut cleanup | 0.3–0.5 s | 0.3 s |

- **Three changes, then a pause.** Viewers track about three new visual changes before they need to consolidate, so add `self.wait(1–2)` after every 3–4 animations. One or two things should move at once, not five ([3brown1blue `animation-design-thinking.md`](https://github.com/AmitSubhash/3brown1blue/blob/main/src/three_b1b/skill/rules/animation-design-thinking.md)).
- **Rhythm:** "fast-fast-SLOW-fast-fast-SLOW". Be quick through setup and slow at the insight ([manim_skill `visual-techniques.md`](https://github.com/adithya-s-k/manim_skill/blob/main/skills/manim-composer/references/visual-techniques.md)).
- **Visual leads audio by 0.3–0.5 s.** An SFX or narration cue should land just after the thing appears, never before. For us, put the whoosh peak at or slightly after the start of motion, and the boom on the flash frame.
- **Hold the end.** Each scene ends on its visual "therefore". Our poster frame (13.0 s) already does this.
- Use `smooth` by default. Use `linear` only for continuous drift (stars, the nebula, the breathing glow driven by an updater). Use `there_and_back` for pulses and flashes. **Avoid `ease_out_bounce` and `elastic` in a 3b1b look**, because 3b1b never uses them.

### 3.4 Colour, contrast and attention

- **Opacity layering:** use 1.0 for the thing being explained now, about 0.4 for context, and about 0.15 for structure (grids, the cell outline). Dim the old thing as you bring in the new one: `self.play(old.animate.set_opacity(0.4), FadeIn(new))` ([Hermes manim-video SKILL.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/creative/manim-video/SKILL.md), [3brown1blue `visual-design-principles.md` §2](https://github.com/AmitSubhash/3brown1blue/blob/main/src/three_b1b/skill/rules/visual-design-principles.md)) [Community].
- **Colour means something.** Pick it once and keep it across lessons. In Arcade Cosmos, cyan `#3ee8ff` is electrons, nuclei and "correct", and orange `#ff9a1f` is the star core and heat. Do not reuse cyan for decoration.
- The classic 3b1b palette is background `#1C1C1C` (the real config uses `#000000`), blue `#58C4DD`, green `#83C167` and yellow `#FFFF00`. Ours is already a distinct, consistent palette, which is the point.
- Avoid distinctions that rely only on red versus green. Use gradients sparingly ([manim_skill `colors.md`](https://github.com/adithya-s-k/manim_skill/blob/main/skills/manimce-best-practices/rules/colors.md)).
- Minimum sizes so things stay visible at phone size: dot radius ≥ 0.06 units, stroke opacity ≥ 0.8, data fill opacity ≥ 0.6 ([3brown1blue `production-quality.md` §4](https://github.com/AmitSubhash/3brown1blue/blob/main/src/three_b1b/skill/rules/production-quality.md)) [Community].
- **Manim has no bloom.** Render clean edges and let Resolve's SoftGlow do the bloom (section 5.2). The alternative is faking glow in Manim with 3–5 stacked copies of increasing stroke width and falling opacity. That looks fine but costs render time.

### 3.5 9:16 text sizing and framing

- **Gotcha [V-src]:** `manim -r 1080,1920` sets **pixels only**. The CLI handler does not recompute `frame_width`, and `Camera.resize_frame_shape()` then keeps width 14.22 and stretches height to about 25.3 units. Meanwhile `config.frame_height` stays 8, so `to_edge(UP)` and `to_edge(DOWN)` land in the middle of the tall frame. The Hermes skill's `--resolution 1080,1920` tip has this bug. **Set `config.frame_width = 8` and `config.frame_height = 8*1920/1080` explicitly**, as `star_forge.py` already does.
- With `frame_width = 8` at 1080 px wide there are **135 px per unit, the same as 16:9 1080p** (1920/14.22). Font sizes therefore carry over between aspects pixel for pixel.
- Measured cap height of `Text("H")` at 1080×1920 [V-src, run in the project venv]:

  | font_size | 24 | 32 | 36 | 40 | 48 | 60 | 72 |
  |---|---|---|---|---|---|---|---|
  | cap height (px) | 30 | 40 | 45 | 50 | 60 | 74 | 89 |

- The skills' scale is title 48, heading 36, body 30, label 24, caption 20, minimum 18 [Community]. That scale was **written for 16:9 desktop**. For 9:16 on a phone, use **body ≥ 40 (about 50 px cap) and labels ≥ 32**, and give the star-line card 44–56 [Unverified convention: there is no primary source for phone legibility thresholds]. In 9:16 the frame is only 8 units wide, so pass `Text(...)` through a "safe_text" cap: `if t.width > 7.0: t.scale_to_fit_width(7.0)`.
- Use edge buffers of `buff ≥ 0.5`. Keep the bottom 20% for captions only, and never place visuals there ([3brown1blue §16](https://github.com/AmitSubhash/3brown1blue/blob/main/src/three_b1b/skill/rules/visual-design-principles.md)). That skill's sample `caption.move_to(DOWN * CAPTION_Y)` with `CAPTION_Y = -3.0` actually puts the caption at the **top**, so do not copy it. On TikTok, Reels and Shorts, the app UI also covers roughly the bottom 20–25% and a right-hand strip [Unverified]. Keep the card and the C above about y = −3 of the ±7.1 range.
- Fonts: the Hermes and 3brown1blue skills say "monospace for all Text because Pango kerning is broken with proportional fonts" [Community; I did not test it]. We use Space Grotesk for the card. Render one still at final size and inspect the kerning before believing either side.

### 3.6 Camera

- Use `MovingCameraScene` and `self.camera.frame.animate.scale(0.8).move_to(target)`. Call `self.camera.frame.save_state()` before a complex move and `Restore(self.camera.frame)` to return ([manim_skill `camera.md`](https://github.com/adithya-s-k/manim_skill/blob/main/skills/manimce-best-practices/rules/camera.md)).
- Moves are slow and calm, use `smooth`, and never shake. Our storyboard already says this, and 3b1b's 2–8 s camera `run_time`s back it up. In 3D, rotate the camera sparingly.
- Do one camera move at a time, and keep other motion small while the camera moves, so the viewer's eye has one job.

### 3.7 Clutter and lifecycle [Community]

- Fade out or move whatever occupies a region **before** new content enters it. Labels go `next_to` their target and follow it with an updater. Never animate a mobject that was not added. End each scene clean, for example with `FadeOut(Group(*self.mobjects))`, unless the next shot continues it.
- Build density up gradually (a "density ramp"), with maximum density only at the climax. Show geometry before algebra: the nuclei merge first, then "3 ⁴He → ¹²C" writes on.

---

## 4. Resolve scripting resources (local docs read)

Primary vendor files on this machine [V-src]:

- `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/README.md` (Lua 5.1/LuaJIT; Lua dicts are `{ key = value }` tables; Studio-only calls return False on free) and **`DaVinciResolveScript.pyi`** (the 21.1 typed API; the Lua method names are the same).
- `…/Developer/Fusion Fuse/` (Fuse SDK PDF and examples) and `…/Developer/Fusion Templates/Transitions/Noise Dissolve.setting` (an example Fusion transition).
- **`/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Resources/Fusion/Templates/Templates.drfx`**: a zip of all 417 built-in Fusion templates. It is the best reference for real tool IDs and input names (section 5).

davinci-resolve-mcp docs (`~/Library/Application Support/davinci-resolve-mcp/docs/`), the relevant parts:

- `reference/resolve211-native-transitions.md`, `reference/resolve211-speed-fades.md`, `reference/resolve_scripting_changelog_21.1.md`.
- `reference/api-limitations.md`: the Fusion render traps, the free-edition modal, and the audio gaps.
- `kernels/fusion-composition-kernel.md`, `kernels/audio-fairlight-kernel.md`, `kernels/render-deliver-kernel.md`, `guides/editorial-decision-guide.md`.
- All of their live validation is on **Studio** (19.1.3 to 21.1.0.14), except a few notes from free 21.0.3.7. Treat their claims as "Studio-verified, free unverified" unless they say otherwise.

Public GitHub has **no Lua example of `AddTransition`** yet. A code search for `AddTransition` in Lua finds only unrelated state machines. The API arrived in 21.1 (changelog dated 1 Sep 2026). Our `star_forge_edit_PROTOTYPE.lua` is the reference implementation.

### 4.1 Transitions: `TimelineItem:AddTransition(opts)` (21.1) [V-src stub, V-run on free 21.1.1]

```lua
local tr = item:AddTransition({ type = "Cross Dissolve", category = "simple",
                                position = "end", alignment = "center", duration = 12 })
-- returns the transition TimelineItem, or nil on failure
```

- `category` is one of `simple` (built-in Video Transitions), `fusion` (the Fusion templates in section 5), `ofx` or `audio`. `position` is `start` or `end`, and `alignment` is `left`, `center` or `right`. `duration` is in frames; omit it to get an automatic length, which was 8 frames on one Studio fixture and is not a documented default.
- **It needs source handles.** A centred dissolve with zero handles returns failure and creates nothing ([MCP doc, Studio 21.1.0.14]). Manim sections butt-joined with no handles fail, so render each beat with about 0.5 s extra, or use `alignment="left"` or `"right"` so the transition eats only one side [Unverified on free].
- **A transition is added to the item list** (`GetItemListInTrack`), so **item indexes after it shift**. Re-query the track before you touch the next item [MCP doc].
- `AddTransition` takes no colour or parameter arguments. "Dip To Color Dissolve" uses its default colour, which is black [Unverified]. For a dip to white, keep our white-clip approach or set a Fusion flash (section 5.1).
- `fusion` category names are the template names, for example `"Glow"`, `"Tunnel of Light"` or `"Noise Dissolve"` [Unverified via the API on free: probe one with a nil check before relying on it].
- `audio` category names in the UI are "Cross Fade -3 dB", "Cross Fade 0 dB" and "Cross Fade +3 dB" [Unverified via the API].
- "Smooth Cut" is believed to be Studio-only [Unverified]. Avoid it.

### 4.2 Fades and audio

- `TimelineItem:SetFades({ FadeIn = 24, FadeOut = 24 })` and `GetFades()` are new in 21.1, take frames as **integers** (fractions are refused), and work on **video or audio** faders per the stub docstring. Readback may be a float [V-src stub; video fades are V-run in our cut; audio fades Unverified on free].
- Clip volume: the 21.1 `TimelineItemProperties` adds `AudioVolumeEnabled` and **`AudioVolume` (−100 to +30 dB)**, plus `AudioPan`, `AudioPitch*` and others, via `SetProperty` or `SetProperties` [V-src stub]. **The MCP's limitation entry (tested on 21.0) says volume writes return False.** That was before 21.1 added "native audio properties" (changelog). On 21.1.1 free, try `item:SetProperty("AudioVolume", -6)` and read it back with `GetProperty` [Unverified]. `SetProperties` is all-or-nothing and returns False with an error naming the bad key.
- Whole-timeline loudness: `Timeline:NormalizeAudioLevel(items, { normalizationMode = ..., targetLoudness = -14.0 })`, with the valid modes from `Timeline:GetNormalizeAudioModes()` [V-src stub; Unverified on free].
- **There is still no API for Fairlight automation curves, EQ or FairlightFX.** The workaround is `Project:ApplyFairlightPresetToCurrentTimeline(name)` with a preset saved once in the UI [MCP doc]. Practical rule: **mix offline (ffmpeg, as `make_edit.py` already does) and import one finished stem or a few stems.** Use Resolve only for placement, fades and per-clip gain.
- **A free-edition trap [MCP doc, free 21.0.3.7]:** calling a Studio-only function returns False **and raises a modal upsell dialog**. While that dialog is up, *unrelated later calls* fail too (for example `SaveProject`). Known gated calls are transcription and subtitles from audio. If one call fails, re-run a known-good read before trusting anything else.

### 4.3 Render

- `Project:SetCurrentRenderFormatAndCodec("mp4", "H264")`, then `SetRenderSettings({ SelectAllFrames=true, TargetDir=..., CustomName=..., FormatWidth=1080, FormatHeight=1920, ExportVideo=true, ExportAudio=true, AudioCodec=..., AudioSampleRate=48000 })`, then `AddRenderJob()`, `StartRendering(job)`, poll `IsRenderingInProgress()`, and finally read `GetRenderJobStatus(job)` [V-src stub; V-run].
- Presets (21.1): `LoadRenderPreset`, `GetRenderPresetList`, `UpdateRenderPreset(name)` (saves the current settings into a preset), `ImportRenderPreset(path)` and `ExportRenderPreset`. Save a "Lesson 9x16" and a "Lesson 16x9" preset once, then just `LoadRenderPreset` [V-src stub].
- `GetAudioRenderCodecs(ext)` takes an **audio format file extension** from `GetAudioRenderFormats()`, which returns a dict of format to extension. This settles the "argument form is undocumented" question in our Lua [V-src stub].
- `MarkIn` and `MarkOut` below the timeline start are clamped, not refused. `GetRenderSettings` readback is unreliable, so prove a render by probing the output file [MCP doc]. **The free edition caps output at UHD 60 fps** [V-web: Blackmagic and reseller comparisons], which is fine for 1080×1920 at 30 fps.

---

## 5. Fusion effects and transitions for a space/electron intro

### 5.1 Fusion tool IDs and input names, read from the free 21.1.1 bundle [V-src]

The tool IDs and input names below come from the shipped `Templates.drfx`. Use them in `comp:AddTool("<ID>")` and `tool:SetInput("<Input>", v)`.

| Tool ID | Inputs that the templates actually set | Use for us |
|---|---|---|
| **SoftGlow** [V-run] | `Threshold`, `Gain`, `XGlowSize`, `Filter` (`FuID{"Fast Gaussian"}`), `ColorScale`, `Blend`, `GlowMask` | Bloom on cyan electrons and the orange core. Set `Threshold` high (about 0.6–0.8) so only bright things bloom. |
| **Glow** | `XGlowSize`, `Glow`, `Blend`, `Filter` | A harder glow. Used inside the Galaxy Swarm, Bokeh and Lens Leaks particle templates. |
| **FilmGrain** | **`MasterStrength`** (for example 0.02), **`MasterXSize`** (0.5), `Monochrome`, `MasterOffset` | **This explains our nil:** the input is `MasterStrength`, not `Strength`. The MCP's offline `film-grain.js` template uses `Power`, `ColorAmount` and `GrainSize`, which do not match the shipped templates, so do not copy it. |
| **HotSpot** | `PrimaryCenter`, `PrimaryStrength`, `HotSpotSize`, `Aspect`, `LensAberration`, `Radial`, `RadialOn`, `RadialLength`, `RadialDensity`, `SecondaryStrength`, `Mix` | Star-core flare and rays. All 40 "Lens Flare Vxx" Fusion templates are pure HotSpot (native Fusion, not the ResolveFX Lens Flare). |
| **Highlight** | `Threshold`, `Length`, `NumberOfPoints`, `Angle`, `Curve`, `Low` | Star-shaped glints on the fusion flash. |
| **DirectionalBlur** | (Fusion's "Tools/Chromatic Aberration" template is one DirectionalBlur) | Subtle chromatic fringing. The native tool, not the ResolveFX one. |
| **Trails** | `GainRed`, `ApplyMode`, `XScale` | Motion streaks on the incoming ⁴He nuclei. |
| **FastNoise** | (138 uses) | Nebula texture and noise-dissolve masks. |
| **pEmitter → pTurbulence → pRender → Renderer3D** | | Drifting star particles. The "Starfield" generator and "Fireflies" are built from these. |
| **BrightnessContrast**, **ColorCorrector**, **EllipseMask** (`SoftEdge`, `Invert=1`) | | Vignette: an inverted soft ellipse mask on a darkening tool. There is **no native "Vignette" tool**, so the MCP template builds one from Background and EllipseMask. |

How to probe inputs on free with Lua (no `io` needed): `for _, inp in pairs(tool:GetInputList()) do print(inp:GetAttrs().INPS_ID) end`. Our Lua already does this. Also, `GetInput` can be nil for an animated or connected input.

**Fusion render traps** [MCP doc, Studio-measured]:

- **Wire `MediaIn → … → MediaOut`.** A comp whose MediaOut has no path from MediaIn is silently bypassed, and an unrooted tool can fail the render job.
- **Never hold `comp:Lock()` across a `SetInput` value write.** The value reads back correctly but is not rendered. Lock only around `AddTool` and `ConnectInput`.
- **Prove effects with a rendered frame, never with `GetInput` readback.**
- In Lua, `tool:SaveSettings(path)` and `tool:LoadSettings(path)` move `.setting` files without the `io` library. `comp:Paste(bmd.readfile(path))` is the Fusion-scripting way to drop a whole saved graph in [Unverified on our setup].

### 5.2 Built-in Fusion transitions in free 21.1.1 and what to use

All 70 come from `Templates.drfx/Edit/Transitions`. I checked each `.setting` for embedded ResolveFX (OFX) nodes [V-src].

**Pure native Fusion, so safest on free.** These suit a space intro:

- **Glow**: two SoftGlows plus a Merge. A bloom-through cross. Good on the flash.
- **Tunnel of Light**: SoftGlow, Dent, EllipseMask and Dissolve. A radial light-tunnel push. Good on the star-to-nebula pull-back.
- **Brightness Flash** and **Three Color Flash**: a flash to bright. A natural fusion "flash" in place of our white clip.
- **Noise Dissolve**: FastNoise and Dissolve. An organic nebula-like dissolve.
- **Detail Dissolve**, **Inverse Flash**, **Warp** (Vortex and FastNoise), **RGB Splitter** (a chromatic split).
- Also native: Cross Dissolve (the Fusion version), Luma Wipe, Slide or Pan family, Zoom In, Flip 3D, Shatter and others (not all inspected).

**These embed ResolveFX.** They could be watermarked on free if that ResolveFX is Studio-gated [Unverified which are gated]. Avoid them or test one render first:

- Block Glitch (JPEGDamage, MosaicBlur); Camera Shake (MosaicBlur); Circle Spin and Radial (RadialBlur); Crash Zoom (Transform, ZoomBlur).
- Edgy (EdgeDetect); Glitch and every Mosaic variant (MosaicBlur); Stretch Blur (DirectionalBlur); Zoom In and Out (PrismBlur).

Fusion generators and particles that fit (native) include Starfield, Galaxy Swarm, Fireflies, Bokeh Full Frame, Lens Leaks, Blue Rays and Rotate Rays (backgrounds), and Lens Flare V01–V40 (HotSpot).

### 5.3 Studio-only items to avoid (official wording)

[Blackmagic's Studio page](https://www.blackmagicdesign.com/products/davinciresolve/studio) [V-web] says Studio adds "45+ extra Resolve FX" that "include effects for adding lens flares and reflections, analog damage, sharpening and more". It also lists **Film Look Creator** (film stocks, halation, grain, gate weave), **AI UltraNR** and temporal/spatial noise reduction, and Neural Engine tools (Magic Mask and similar).

The rule is: **use native Fusion tools (SoftGlow, Glow, HotSpot, Highlight, FilmGrain, Trails, particles) rather than the ResolveFX of the same name** (ResolveFX Lens Flare, Lens Reflections, Light Rays, Glow, Film Grain, Film Look Creator, Analog Damage). The Effects Library marks Studio-only ResolveFX, and free renders them with a watermark [Unverified per item; check the badge in the UI]. The page does not mention ResolveFX Light Rays, Glow or Aperture Diffraction at all.

**Recommended finish for `star-forge`:**

- Manim renders clean, with no bloom.
- On V1, a per-beat Fusion comp: `MediaIn → SoftGlow (Threshold ≈ 0.7, Gain 1.2–1.6) → FilmGrain (MasterStrength 0.01–0.02) → MediaOut`.
- A HotSpot flare on the star core in beats 1–3 only.
- An EllipseMask vignette.
- Transitions:
  - Cross Dissolve (simple, 8–14 frames) between calm beats.
  - "Brightness Flash" or "Glow" (fusion) on the fusion moment, about 6–10 frames.
  - "Tunnel of Light" or Noise Dissolve on the pull-back.
- Keep the poster frame (13.0 s) free of any transition or grain change.

---

## 6. Free sound sources beyond Kenney and OpenGameArt (licences checked)

| Source | Licence | Verdict |
|---|---|---|
| **Freesound**, [CC0-filtered search](https://freesound.org/search/?q=whoosh&f=license:%22Creative+Commons+0%22) | Per sound: **CC0**, CC BY or CC BY-NC (plus legacy Sampling+) ([FAQ](https://freesound.org/help/faq/)) [V-web] | **Use it, with the filter** `f=license:"Creative Commons 0"`. That query returned 2,309 CC0 "whoosh" sounds today. **Re-check the licence on each sound's page** and record the URL and author in `SOURCES.md`, as we do now. The "Free Cultural Works" filter also lets CC BY through. |
| [OpenGameArt: 512 Sound Effects (8-bit style)](https://opengameart.org/content/512-sound-effects-8-bit-style), by SubspaceAudio (Juhani Junkala) | **CC0** (the page's licence field) [V-web] | Good UI blips and retro hits. It is OGA, but a pack worth knowing. |
| Self-generated: ffmpeg/sox synthesis (sine sweeps, filtered noise), or sfxr-family generators (jsfxr, bfxr, ChipTone) | Our own output | No licence risk for ffmpeg/sox output. The generators' terms say you own what you make [Unverified per tool]. |
| [HoliznaCC0 on Free Music Archive](https://freemusicarchive.org/music/holiznacc0/) (music beds) | The album text says "completely Public Domain" [V-web, partial] | Plausible CC0 music. **Check the licence badge on each track page** before using it. |
| Pixabay sound effects and music | **Pixabay Content License, not CC0.** No attribution needed, but no standalone redistribution ([summary](https://pixabay.com/service/license-summary/)) [V-web] | Usable, but not CC0. Our spec says CC0 only, so avoid it. |
| Sonniss GDC Game Audio Bundle | **A custom royalty-free licence, not CC0.** Video and YouTube use is allowed, no attribution, **AI/ML training is prohibited**, and no redistribution as SFX ([licence](https://sonniss.com/gdc-bundle-license/)) [V-web] | High quality, but not CC0. Avoid it under a CC0-only rule, and keep it out of the repo. |
| BBC Sound Effects (RemArc) | Commonly cited as personal, educational or research use only [Unverified: the licence page blocked fetching] | Avoid it. Not CC0, and commercial use is doubtful. |
| Mixkit, Zapsplat, YouTube Audio Library, Kevin MacLeod (CC BY 4.0) | Their own licences or attribution | Not CC0. Avoid them. |

---

## 7. Open questions to probe next (cheap, one Lua run each)

1. `item:SetProperty("AudioVolume", -6)` with a `GetProperty` readback on free 21.1.1.
2. `SetFades` on an **audio** item.
3. `AddTransition` with `category="fusion", type="Brightness Flash"` (and `"Glow"`), followed by a rendered frame check for a watermark.
4. `AddTransition` with `category="audio", type="Cross Fade 0 dB"`.
5. `FilmGrain:SetInput("MasterStrength", 0.02)` and a render to confirm grain is visible.
6. Whether a butt-joined Manim section pair with zero handles fails a centred dissolve on free, as it does on Studio.
