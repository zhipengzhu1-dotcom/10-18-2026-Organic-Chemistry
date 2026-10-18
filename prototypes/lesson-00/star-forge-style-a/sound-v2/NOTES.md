# PROTOTYPE: star-forge Style A, sound v2 (three gentle alternatives)

The owner liked Style A's picture and tempo, but said its sound "hurts human ears". This folder holds three replacement soundtracks to audition on the **unchanged Style A picture**. Nothing outside `sound-v2/` was modified.

**Nobody has listened to these. They are designed conservatively and verified only by measurement.**

## What was wrong with v1 (measured by the parent)

- The mix was normalised to −16 LUFS with `master_gain_db` +19.5. A sparse, SFX-only track was pushed up about 20 dB, which raised everything, including the bright transients.
- The fx stem carried strong energy above 6 kHz (the Kenney glass shimmer).
- The impact peaked at −1.6 dBFS before the limiter.
- The dot tings were pure sines at 880–1319 Hz.

## Principles used for all three

| Rule | How |
|---|---|
| Calm loudness | −23 LUFS integrated (EBU R128 broadcast level), reached with **one static gain**: −0.1 / −3.2 / +4.7 dB. There is **no limiter or compressor**, so gain reduction is 0 dB. |
| Dark spectrum | No oscillator partial above 1.1 kHz anywhere. The master is a 30 Hz high-pass plus an 8th-order low-pass (1.5 kHz for v1, 2.5 kHz for v2 and v3). The reverb IRs are low-passed at 1.5–1.8 kHz. |
| No hard transients | Every event attack is a raised cosine of **≥ 16 ms** (plucks 16 ms, bell 25 ms, thump 20 ms, tone 120 ms, swells ≥ 0.47 s). Pads and chords use ≥ 0.6 s attacks and 1.2 s crossfades. |
| No clicks | Every envelope starts and ends at exactly zero. The master has a 1.2 s fade-in and a 1.8 s fade-out (sin²/cos²), so the first and last samples are exactly 0. |
| Picture-locked | Cue frames come from `../audio/cues.json`: contact 188, C legible 448, dots 478 / 490 / 502 / 514, card 572. Short events are placed so their **attack midpoint** lands on the frame. Swells are placed so their **crest** lands on the frame. |
| Self-synthesised | Zero licence risk. See `SOURCES.md`. |

## The three variants

### v1-hush: nearly silent

- **Pad:** one open-fifth pad (D2 A2 D3 A3), warm roll-off, low-passed at 1.5 kHz, that "breathes" with the beats.
  - It eases up by about 3 dB over the approach to the fusion.
  - It settles under the equation, dips about 5 dB on the pull-back, and lifts again on the C and the card.
- **Fusion:** one low swell (A1 / A2 / D3 sines plus brown noise ≤ 240 Hz). It rises over 1.4 s and crests on the contact frame. There is no transient at all.
- **Card:** one gentle low D3 tone with a 120 ms attack, decaying over about 2 s.
- **Silent:** nothing on the dots or the C.

### v2-ambient-score: a slow, warm chord score in D

| Time (s) | Picture | Chord | Level |
|---|---|---|---|
| 0–2.8 | star | D(add9, no 3rd): D3 A3 E4 | quiet opening |
| 2.2–4.1 | ⁴He arrive | Bm7 | |
| 3.5–5.9 | drift | G(add9) | rising |
| 5.3–8.1 | stillness, rush, **contact** | A sus4 + a low swell cresting on 188 | the top of a gentle rise (+1.5 dB) |
| 6.2–12.1 | equation | Em9 | settles |
| 11.3–15.1 | pull-back | A7sus4 | quietest section |
| 14.6–19.9 | **C legible (448)** | D(add9) | soft resolve |
| 18.7–end | card | D(add9) with low D2 | warm sustain, fades over the last 1.8 s |

- **Dots:** four soft felt plucks, A3 → D4 → F♯4 → A4 (220–440 Hz). They form a rising arpeggio of the D chord the pad is holding, panned with the dots, in the same dark reverb.

### v3-soft-sfx: Style A's cue map, tamed

| Style A cue | v3 replacement |
|---|---|
| Space-wind bed + sub hum | A very quiet synthetic low wind (brown noise, 120–700 Hz band-pass, ≤ 1.2 kHz) plus a soft D2/A2 hum |
| Impact on 188 | A muffled low thump: a 92 → 52 Hz glide plus noise, low-passed at 300 Hz, 20 ms attack |
| Glass shimmer on 448 | A soft low swell (D3 A3 D4 plus noise ≤ 450 Hz) cresting when the C becomes legible |
| Sine tings 880–1319 Hz | Soft low plucks A3 D4 F♯4 A4, 16 ms attack |
| Confirmation chime on 572 | A soft low bell on D3 (partials 73–793 Hz), 25 ms attack |

## Measurements (`measure_v2.py` → `measurements.json`)

Measured on each final WAV. Loudness and true peak were also measured on the AAC track of every audition mp4.

| Check (guardrail) | v1-hush | v2-ambient-score | v3-soft-sfx |
|---|---|---|---|
| Master gain (one static stage; ≤ +6 dB) | −0.1 dB | −3.2 dB | +4.7 dB |
| Limiter / compressor gain reduction (≤ 2 dB) | none (0 dB) | none (0 dB) | none (0 dB) |
| Integrated, WAV (−24…−22 LUFS) | −23.0 | −23.0 | −23.0 |
| Integrated, AAC 16:9 / 9:16 | −23.0 / −23.0 | −23.1 / −23.1 | −23.0 / −23.0 |
| True peak, WAV (≤ −6 dBTP) | −12.5 | −8.5 | −7.1 |
| True peak, AAC 16:9 / 9:16 | −12.5 / −12.5 | −8.5 / −8.5 | −7.1 / −7.1 |
| Short-term (3 s) max (≤ −16 LUFS) | −20.4 | −19.5 | −18.7 |
| Momentary max (≤ −14 LUFS) | −18.5 | −18.1 | −15.7 |
| >5 kHz vs full band, literal `highpass=f=5000` + ebur128 (≤ −30 LU) | −47.0 * | −44.1 | −43.6 |
| >5 kHz vs full band, 8th-order (4× `highpass`) | −47.0 * | −47.0 * | −47.0 * |
| 2–5 kHz vs full band, literal `highpass=f=2000,lowpass=f=5000` (≤ −18 LU) | −41.0 | −33.0 | −30.8 |
| 2–5 kHz vs full band, 8th-order | −47.0 * | −47.0 * | −47.0 * |
| Tonal peaks above 1.2 kHz (STFT local maxima ≥ 15 dB above the local median and within 60 dB of the frame max) | 0 | 0 | 0 |
| Loudest bin above 1.2 kHz vs the frame max | −82 dB | −81 dB | −31 dB † |
| Shortest event attack, 10–90 %, solo render of each instrument (a true 8 ms attack reads 4.75 ms) | 64 ms (tone) | 9.75 ms (pluck) | 9.75 ms (pluck) |
| Shortest onset on the events stem (same meter) | 68.8 ms | 5.2 ms ‡ | 2.8 ms ‡ |
| Meter self-test: true 2 / 4 / 8 / 16 ms attacks read | 2.0 / 2.5 / 4.75 / 9.5 ms | same | same |
| Largest sample-to-sample step / peak above 8 kHz | −45 / −139 dBFS | −38 / −139 dBFS | −36 / −139 dBFS |
| First / last sample | 0 / 0 | 0 / 0 | 0 / 0 |
| Fade-in (1.2 s): RMS 0–0.1 s → 1.2–2.2 s | −110 → −26 dBFS | −113 → −32 dBFS | −69 → −27 dBFS |
| Fade-out (1.8 s): RMS T−3.3…T−1.8 s → last 0.1 s | −25 → −75 dBFS | −26 → −76 dBFS | −26 → −75 dBFS |

Notes on the table:

- \* `ebur128` reports −70 LUFS, its absolute floor, so the true ratio is lower still.
- The literal single 2-pole high-pass leaks low-mid energy. That is why it reads higher than the steep version. Both versions pass.
- † In v3 this is wind noise at 1201 Hz, about −73 dBFS, at 14.2 s. It is broadband, not a tone.
- ‡ Both short readings are a new pluck starting over the previous dot's ringing tail. The two notes are 70–74 Hz apart, and their beating rises from trough to peak in about 3 ms.
  - The solo render of the same pluck reads 9.75–11 ms.
  - The attack meter's self-test (injected 2 / 4 / 8 / 16 ms raised-cosine attacks) reads 2.0 / 2.5 / 4.75 / 9.5 ms, which matches theory (10–90 % of a raised cosine ≈ 0.59 × its length).
- An onset meter run on the full mix was abandoned: a held chord's own beating fools it. The events-stem and solo measurements replace it.

### Cue sync (offset = detected − frame time)

"Stem" measures the isolated events stem: the attack midpoint for short events, the envelope maximum for swells. "Mix" is a band-limited detector on the final mix, whose band-pass group delay adds about 5–25 ms. One frame is 33 ms.

| Cue (frame) | v1 stem / mix | v2 stem / mix | v3 stem / mix |
|---|---|---|---|
| Contact (188) | swell crest −101 / +92 ms; the −1 dB crest spans −285…+172 ms | swell crest −33 / +38 ms; −1 dB crest −166…+188 ms | thump +2 / +6 ms |
| C legible (448) | — | (chord change, no event) | swell crest +19 / −131 ms; −1 dB crest −78…+336 ms |
| Dot 1 (478) | — | +2 / +25 ms | +2 / +20 ms |
| Dot 2 (490) | — | +4 / +18 ms | +3 / +17 ms |
| Dot 3 (502) | — | −10 / +11 ms | −2 / +16 ms |
| Dot 4 (514) | — | 0 / +13 ms | +3 / +12 ms |
| Card (572) | tone +6 / +11 ms | (chord change, no event) | bell +8 / +27 ms |

- Every short event lands within ±10 ms on the stem, under a third of a frame.
- A swell's "crest" is broad by design, a few hundred ms within 1 dB, and the contact frame sits inside it.

### Audition files

- In every audition mp4 the video stream is a **bit-identical copy** of the ORIGINAL renders. The `-c copy` MD5 of the video stream matches: 16:9 `a4f38c8b…`, 9:16 `786deee3…`. Each file has 749 frames and lasts 24.967 s.
- Audio is AAC-LC 48 kHz stereo at a 256k target. ffprobe reports 188–226 kb/s on average, because the content is so quiet.
- `compare-16x9.mp4` (77.9 s, 2337 frames = 3 × (30 + 749)) plays the slates "1 hush", "2 ambient score" and "3 soft sfx" (1 s of black and silence each), each followed by its variant on the 16:9 picture. Integrated −23.0 LUFS. The video is re-encoded (x264 CRF 16) because the slates are new frames.
- **Deviation:** this machine's ffmpeg builds (Homebrew 9.0.1, Remotion's and Playwright's) have **no `drawtext` filter** (no libfreetype). The slate text is drawn with Pillow in Space Grotesk from `star-forge-manim/fonts/`, then joined in ffmpeg.

## Files

| File | What |
|---|---|
| `v1-hush.wav`, `v2-ambient-score.wav`, `v3-soft-sfx.wav` | Final stereo 48 kHz 24-bit masters |
| `<variant>-16x9.mp4`, `<variant>-9x16.mp4` | Auditions: the ORIGINAL picture with the video copied, plus AAC 256k |
| `compare-16x9.mp4` | All three back to back with slates |
| `stems/<variant>-bed.wav`, `-events.wav` | Mastered stems; bed + events = the mix (the chain is linear). They can be placed on A1/A2 at unity in Resolve. |
| `build.json` | Master gain, low-pass and cue list per variant |
| `measurements.json` | Every measurement above |
| `make_sound_v2.py`, `measure_v2.py` | Build and verify |

## Rebuild

From `star-forge-style-a/sound-v2/`:

```sh
../../star-forge-manim/.venv/bin/python -I make_sound_v2.py   # ~15 s: WAVs, stems, mp4s, compare, build.json
../../star-forge-manim/.venv/bin/python -I measure_v2.py      # prints the table, writes measurements.json
```

- Needs ffmpeg plus numpy, scipy and Pillow (all in the cut-4 venv).
- The output is deterministic (fixed seeds).
- To retune, change a cue's `gain_db` in its variant function. `make_sound_v2.py` refuses to master if the static gain would exceed ±6 dB.

## Honest uncertainties (unheard)

- **Laptop and phone speakers:**
  - v1 and much of v3's thump live below about 150 Hz, which small speakers barely reproduce. On a phone, v1 may come across as near-silence with a faint tone at the card, and v3's thump may be felt more than heard.
  - That is "gentle", but it may read as "missing".
- **−23 LUFS is quiet** next to typical web video (−14 to −16). If the intro plays next to louder lesson audio, the step down may be noticeable.
  - It is still the right level for calm, sparse content, per the brief.
  - Raising it later is just one gain change: v1 has 6.5 dB of true-peak headroom, v2 2.5 dB and v3 1.1 dB to −6 dBTP.
- **v2's harmony was chosen on paper:**
  - D-major area: Dadd9 → Bm7 → Gadd9 → Asus4 → Em9 → A7sus4 → Dadd9.
  - The pads beat gently by design (±3–4 cent detune). Whether the chords feel "calm" or "new-age generic", and whether the dots stand out from the pad (they sit about 2–4 dB above it), needs a listen.
- **Swells have no defined "hit".** The fusion in v1 and v2 is a crest, not an attack. The flash may feel slightly unaccompanied. If so, the v3 thump could be borrowed at a low level.
- **The v3 thump** is the loudest moment of any variant (momentary −15.7 LUFS, true peak −7.1 dBTP). It is the one cue most likely to still feel "too much". Its trim is `-17.0` in `v3_sfx()`.
- **Band-limiting to ≤ 1.1 kHz partials** makes everything dark and muffled on purpose. On good headphones it may sound dull rather than warm.
