# PROTOTYPE: `star-forge` storyboard (shared by all three cuts)

Throwaway. Ticket: Prototype: Specify Lesson 0: Why Carbon? (On-ramp), issue #31. Spec: `docs/specs/unit-1/lesson-00-why-carbon.md`, Step s01.

Total 13 s at 30 fps (390 frames). Two aspects: 9:16 (1080×1920) and 16:9 (1920×1080). Sound: none (silent render). The layout recentres per aspect; beats and timing are identical.

## Look (Arcade Cosmos tokens, dark)

- Background `#0d0626` (space), nebula blobs `#ff4fd8` / `#b44dff` / `#2340ff` at low opacity, sparse star dots.
- Electrons, nuclei glow, "correct": cyan `#3ee8ff`. Second highlight (star core): orange `#ff9a1f`. Body text white `#ffffff`, muted `#b9a8e8`.
- Fonts: Space Grotesk for the card sentence; JetBrains Mono for "3 ⁴He → ¹²C" and the letter C (pixel fonts never carry chemistry).
- Motion language (3Blue1Brown): text **writes on** (stroke draw, then fill), objects **transform/morph** into each other rather than cut, the camera moves slowly and calmly (ease-in-out, no shake), labels follow what they name.

## Beats

| # | Time | What happens |
|---|---|---|
| 1 | 0.0–2.0 s | Fade up on the star core: a large orange-to-white radial glow, slowly breathing. Camera slowly pushes in. |
| 2 | 2.0–4.5 s | Three small helium nuclei (each a cluster of 2 cyan + 2 white dots = 2p 2n, or a simple glowing dot labelled ⁴He) drift in from three directions toward the centre. A label "⁴He" follows each. |
| 3 | 4.5–6.5 s | They meet and flash; the three merge into one bigger nucleus labelled "¹²C". Meanwhile the equation **3 ⁴He → ¹²C** writes itself on below (stroke then fill). |
| 4 | 6.5–9.0 s | The camera pulls back; the star shrinks to a point; the carbon nucleus drifts out through the nebula, then a soft cell outline (a rounded membrane, faint cyan) fades in around it. Equation fades out. |
| 5 | 9.0–10.5 s | The nucleus morphs into the letter **C** (JetBrains Mono, white), and four cyan valence dots appear around it, one at a time (top, right, bottom, left). |
| 6 | 10.5–13.0 s | The C with its dots slides up; the star-line card writes on: "**Every carbon atom in you was forged in a star.** Organic chemistry is what that carbon learned to do next." Hold. |

The last frame (13.0 s) is the **poster frame** for reduced motion: the card over the nebula, with the C and four dots.

No other numbers on screen: only the mass numbers 4 and 12. Source note (outside the video, on the Step): "Carbon is made in stars by the triple-alpha process: OpenStax *Astronomy 2e* §22.4, CC BY 4.0."
