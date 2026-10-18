# PROTOTYPE: star-forge Style C, sound sources

Every external file here is CC0 1.0. They are copied unmodified from `../../star-forge-edit/sfx/`, where they were downloaded on 2026-10-18. All processing (pitch, filters, reverb, placement, mix) happens in `../make_style_c.py`.

| File | Source (URL) | Author | Licence | Used for |
|---|---|---|---|---|
| `lowFrequency_explosion_000.ogg` | https://kenney.nl/assets/sci-fi-sounds | Kenney | CC0 (`LICENSE-kenney-sci-fi-sounds.txt`) | Fusion hit at 5.90 s. Its attack is aligned to the contact frame (R177). |
| `impactSoft_heavy_000.ogg` | https://kenney.nl/assets/impact-sounds | Kenney | CC0 (`LICENSE-kenney-impact-sounds.txt`) | Punch under the fusion hit, low-passed at 1.6 kHz. |
| `glass_004.ogg` | https://kenney.nl/assets/interface-sounds | Kenney | CC0 (`LICENSE-kenney-interface-sounds.txt`) | The one soft shimmer as the C forms (12.2 s): 0.84×, with a hall. |
| `space-wind_0.mp3` | https://opengameart.org/content/space-winds | aquinn (OpenGameArt) | CC0 | Faint space texture under the pull-back (A3 `amb`). |

## Self-synthesised in `make_style_c.py` (our own output, no licence risk)

- J-cut rumble: brown noise low-passed at 90 Hz, plus a D1 sine. It starts on frame 0, in black.
- The music bed: a filtered D-minor saw drone that builds, plus accelerating heartbeat pulses. Then a 0.3 s silence, a "braam" drop on the hit, a Dm(add9) pad under the pull-back, and a swell into a D major add9 chord with a shimmer on the card. It is faded out 0.5 s before the end.
- The riser (pink-noise sweep plus a 110→440 Hz glide), which stops dead 0.3 s before contact.
- A sub drop and a noise crack into a hall on the hit.
- A pull-back whoosh whose level and brightness follow the camera speed.
- A reversed hall swell into the zoom seam, and a sub thump when the card lands.
