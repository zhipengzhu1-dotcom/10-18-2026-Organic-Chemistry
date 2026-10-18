# PROTOTYPE: star-forge Style A, sound sources

Every file in this folder is CC0 1.0, a public-domain dedication. No other licences are used. The originals are unmodified copies from `../../star-forge-edit/sfx/`, whose `SOURCES.md` records the downloads (2026-10-18). `../make_audio_a.py` does all the processing (trims, pitch, filters, reverb, transient alignment, mix) and writes the stems to `../audio/`.

| File | Source (URL) | Author | Licence | Used for in Style A |
|---|---|---|---|---|
| `space-wind_0.mp3` | https://opengameart.org/content/space-winds | aquinn (OpenGameArt) | CC0 | Ambience bed (A1 `amb`). Steady gusts are chained with 0.8 s crossfades, low-passed at 800 Hz and levelled. It fades in over 1.0 s with the picture and out over the last 1.0 s. |
| `spaceEngineLow_000.ogg` | https://kenney.nl/assets/sci-fi-sounds | Kenney | CC0 (`LICENSE-kenney-sci-fi-sounds.txt`) | Sub hum under the bed: 0.6× speed, a 1 s crossfaded loop, low-passed at 240 Hz (A1 `amb`). |
| `impactSoft_heavy_000.ogg` | https://kenney.nl/assets/impact-sounds | Kenney | CC0 (`LICENSE-kenney-impact-sounds.txt`) | The body of the single soft impact. Its transient sits on the fusion contact frame, 188 (6.267 s) (A2 `fx`). |
| `lowFrequency_explosion_000.ogg` | https://kenney.nl/assets/sci-fi-sounds | Kenney | CC0 (`LICENSE-kenney-sci-fi-sounds.txt`) | A low-passed (300 Hz) boom layered 10 dB under the soft impact, with its onset aligned to the impact's (A2 `fx`). |
| `glass_004.ogg` | https://kenney.nl/assets/interface-sounds | Kenney | CC0 (`LICENSE-kenney-interface-sounds.txt`) | Glass shimmer with a reverb tail as the nucleus becomes the letter C, 14.933 s (A2 `fx`). |
| `confirmation_002.ogg` | https://kenney.nl/assets/interface-sounds | Kenney | CC0 (`LICENSE-kenney-interface-sounds.txt`) | Soft chime as the card's bold line starts to write, 19.067 s (A3 `ui`). |
| *(no file)* four "tings" | self-synthesised in `../make_audio_a.py` (`ting()`): a sine with quiet 2nd and 3rd partials, a 4 ms attack and a 0.32 s decay | this prototype | Our own output; no third-party material | Valence dots 1–4 at 880, 988, 1109 and 1319 Hz (A5 B5 C♯6 E6), panned with the dots (A3 `ui`). |

The licence for each Kenney pack is the bundled `License.txt` ("Creative Commons CC0"), copied here as `LICENSE-kenney-*.txt`. Each OpenGameArt page lists CC0 as its only licence.
