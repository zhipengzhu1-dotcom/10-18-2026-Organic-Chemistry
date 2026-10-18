# PROTOTYPE: star-forge Style A, sound v2: sources

**Every sound in `sound-v2/` is self-synthesised by `make_sound_v2.py`** (numpy sines, filtered noise and a synthetic noise-burst reverb). No third-party audio is used. That includes none of the Kenney or OpenGameArt files in `../sfx/`, so there is no licence risk.

| Sound | Variant(s) | How it is made |
|---|---|---|
| Warm pad and chords | v1, v2 | Band-limited additive tones (partials ≤ 1.1 kHz, 1/k^2.2–2.6 roll-off), two detuned voices per note, slow raised-cosine envelopes |
| Low swells | v1, v2, v3 | Sines plus brown noise low-passed at 220–450 Hz; raised-cosine rise, smooth exponential fall |
| Felt/marimba plucks | v2, v3 | A sine fundamental (220–440 Hz) plus quiet, fast-decaying 2nd, 3rd and 4th partials (only where they are ≤ 1.1 kHz), and a tiny brown-noise "felt" thud low-passed at 500 Hz. 16 ms raised-cosine attack |
| Muffled thump | v3 | A sine gliding from 92 to 52 Hz plus brown noise, low-passed at 300 Hz, 20 ms attack |
| Low bell | v3 | Inharmonic bell ratios on D3 (73–793 Hz), 25 ms attack |
| Low tone | v1 | A band-limited D3 tone (partials ≤ 800 Hz), 120 ms attack |
| Wind bed and hum | v3 | Brown noise band-passed 120–700 Hz, low-passed at 1.2 kHz, slow gust modulation; D2 and A2 sines |
| Reverb | v2, v3 | A synthetic stereo IR (exponentially decaying noise, low-passed at 1.5–1.8 kHz) |

The slate font in `compare-16x9.mp4` is `../../star-forge-manim/fonts/SpaceGrotesk-wght.ttf` (SIL OFL, see `OFL-SpaceGrotesk.txt` there).
