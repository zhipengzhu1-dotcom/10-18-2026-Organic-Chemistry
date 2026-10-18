# PROTOTYPE: star-forge cut 4, sound sources

Every file here is CC0 1.0 (public domain dedication). There are no other licences. The originals are kept unmodified. `../make_edit.py` does all processing (trims, pitch, filters, reverb, mix) and writes the stems to `../audio/`.

| File | Source (URL) | Author | Licence | Used for |
|---|---|---|---|---|
| `space-wind_0.mp3` | https://opengameart.org/content/space-winds | aquinn (OpenGameArt) | CC0 | Ambience bed. Its steady gusts are chained with crossfades, low-passed at 900 Hz and levelled (A1 `amb`). |
| `spaceEngineLow_000.ogg` | https://kenney.nl/assets/sci-fi-sounds | Kenney (kenney.nl) | CC0 (`LICENSE-kenney-sci-fi-sounds.txt`) | Sub hum under the bed, slowed to 0.6× and low-passed at 260 Hz (A1 `amb`). |
| `whoosh2_0.wav` | https://opengameart.org/content/air-whoosh | pyranostudios (OpenGameArt) | CC0 | Three approach whooshes, one per ⁴He nucleus, panned to where each one enters and peaking 4.55, 4.72 and 4.86 s. The same file reversed is the pull-back whoosh at 6.45 s (A2 `fx`). |
| `lowFrequency_explosion_000.ogg` | https://kenney.nl/assets/sci-fi-sounds | Kenney (kenney.nl) | CC0 (`LICENSE-kenney-sci-fi-sounds.txt`) | Fusion boom at 4.95 s, on the white flash (A2 `fx`). |
| `impactSoft_heavy_000.ogg` | https://kenney.nl/assets/impact-sounds | Kenney (kenney.nl) | CC0 (`LICENSE-kenney-impact-sounds.txt`) | Soft punch transient at 5.00 s, under the boom (A2 `fx`). |
| `glass_004.ogg` | https://kenney.nl/assets/interface-sounds | Kenney (kenney.nl) | CC0 (`LICENSE-kenney-interface-sounds.txt`) | Shimmer after the fusion: two layers (1.0× and 0.75×) with a reverb tail (A2 `fx`). |
| `pluck_002.ogg` | https://kenney.nl/assets/interface-sounds | Kenney (kenney.nl) | CC0 (`LICENSE-kenney-interface-sounds.txt`) | The four valence-dot blips at 9.80, 10.00, 10.20 and 10.40 s. They rise through 1, 9/8, 5/4 and 3/2 and are panned with their dots (A3 `ui`). |
| `confirmation_002.ogg` | https://kenney.nl/assets/interface-sounds | Kenney (kenney.nl) | CC0 (`LICENSE-kenney-interface-sounds.txt`) | Soft chime at 11.30 s, when the card starts to write on (A3 `ui`). |

Kenney packs used are Sci-Fi Sounds 1.0, Impact Sounds 1.0 and Interface Sounds 1.0. Each was downloaded as a zip from its kenney.nl page, and the page and the bundled `License.txt` both say "Creative Commons CC0". Each OpenGameArt page lists CC0 as its only licence. All files were downloaded on 2026-10-18.

Mix: three stems at unity sum to `../audio/mix.wav`, about −16 LUFS integrated with a true peak of −2.5 dBTP. `../audio/cues.json` lists every cue time.
