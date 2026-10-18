# PROTOTYPE: star-forge Style B, sound sources

Every file here is CC0 1.0 (public-domain dedication). They are unmodified copies of the files in `../../star-forge-edit/sfx/`, where they were downloaded on 2026-10-18. `../make_style_b.py` does all the processing (trims, rate changes, filters, reverb, the loop wrap and the master) and writes the stems to `../audio/`.

| File | Source (URL) | Author | Licence | Used for in Style B |
|---|---|---|---|---|
| `whoosh2_0.wav` | https://opengameart.org/content/air-whoosh | pyranostudios (OpenGameArt) | CC0 | Three short whooshes (rates 1.08, 0.95 and 1.02, panned L/R/C), one per ⁴He nucleus snapping in at f45–51. One low whoosh (0.85×, low-passed at 3.5 kHz) peaks at the middle of the pull-back (f195). The same file reversed swells into the loop seam (f342–360). |
| `impactSoft_heavy_000.ogg` | https://kenney.nl/assets/impact-sounds | Kenney | CC0 (`LICENSE-kenney-impact-sounds.txt`) | Impact. Its transient lands at 2.920 s, 80 ms before the flash frame (f90 = 3.000 s). |
| `lowFrequency_explosion_000.ogg` | https://kenney.nl/assets/sci-fi-sounds | Kenney | CC0 (`LICENSE-kenney-sci-fi-sounds.txt`) | Sub boom on the flash frame (f90). At 0.8× and low-passed at 400 Hz it is also the soft "bloom" on frame 0, so the loop seam lands on it. |
| `glass_004.ogg` | https://kenney.nl/assets/interface-sounds | Kenney | CC0 (`LICENSE-kenney-interface-sounds.txt`) | Glass ping when the disc becomes the C (f216). At 0.7× with reverb it is the frame-0 shimmer, and reversed it is part of the loop dive. |
| `pluck_002.ogg` | https://kenney.nl/assets/interface-sounds | Kenney | CC0 (`LICENSE-kenney-interface-sounds.txt`) | Four valence-dot ticks at f226, 230, 234 and 238. Their rates are varied 0.92–1.10, and each is panned with its dot. |
| `confirmation_002.ogg` | https://kenney.nl/assets/interface-sounds | Kenney | CC0 (`LICENSE-kenney-interface-sounds.txt`) | Chime as the first card line lands (f250). |

Self-synthesised with numpy/scipy in `../make_style_b.py`, so there is no third-party licence:

- **Music bed, 120 BPM** (one beat is 15 frames, so every visual beat is on the grid). It has detuned-saw pad chords (Bm add9 → Gmaj7 → Em7 → D add9 → Asus4), a sine bass, a pitch-swept sine kick, a triangle 16th-note arp and a filtered-noise riser over 2.0–2.7 s.
- The pad's filter and level are automated per section. It is filtered under the hook, cut to digital silence for 2.70–3.00 s, opens fully on the drop, is "radio" filtered through the body, and opens again for the card. Before the seam it ramps back to the hook level.

Kenney pages and their bundled `License.txt` both say "Creative Commons CC0". The OpenGameArt page lists CC0 as its only licence.
