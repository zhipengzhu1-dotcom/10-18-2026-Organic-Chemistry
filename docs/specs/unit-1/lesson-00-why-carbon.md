# Lesson 0: Why Carbon? (On-ramp)

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md). Decided in [Specify Lesson 0: Why Carbon? (On-ramp)](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/21).

## Shape checks

- [x] 9 Steps (On-ramp range 6–10): Hook 1, Build 5, Check 2, Wrap 1
- [x] Explain Steps at 2, 4, 9, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Every chemistry number points at pipeline output with a Source note; none typed here (numbers in curly braces are pipeline fields)
- [x] No computed numbers in this Lesson (all values are measured and cited)
- [x] No Tap-to-identify Step sits among Draw-arrows Steps (this Lesson has no Draw-arrows Steps)
- [x] Nothing taken from the Moore-credited slides (Lecture 1 p. 5 lower slide, p. 6, p. 7, p. 8 upper slide)

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l00` |
| Title | Why Carbon? |
| Goal | Explain why carbon shares electrons instead of gaining or losing them, and count the electrons around an atom to see that its outer shell is full. |
| Prerequisites | none (On-ramp). It never assumes the Student saw the homepage hero. |
| Key idea | Carbon sits in the middle of its row: gaining or losing four electrons costs too much, so it shares. Four shared pairs fill its shell, and carbon sharing with carbon builds endless molecules. |
| Check Problems | `u1-onramp-why-share`, `u1-onramp-octet-count`. Lesson-only: tagged Lesson 0 and never drawn into the Practice Set (see On-ramp in `GLOSSARY.md`). |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 1 p. 4 ("What: Carbon-Containing Compounds": middle of the second row, shares electrons, example molecules), p. 5 upper slide ("Subtleties in Structure", the estradiol/testosterone pair only), p. 8 lower slide ("Electron Configuration and Valence Electrons", the filled-shell idea). All wording is ours. OpenStax *Astronomy 2e*, §22.4 "Further Evolution of Stars", CC BY 4.0 (triple-alpha process). Ionization energies from the NIST Atomic Spectra Database. Electron affinities from Andersen, Haugen & Hotop, *J. Phys. Chem. Ref. Data* 28, 1511 (1999). Abundances as in the Hook Data note. **Excluded:** Lecture 1 p. 5 lower slide (abundance chart), p. 6, p. 7 and p. 8 upper slide (all "Courtesy of Jeffrey S. Moore … used with permission"), the codeine/morphine/heroin set (owner's call), electron-configuration notation (no prerequisites) and the bonding-pattern table (Lesson 1). |
| Structure drawing | Electron-dot (Lewis) drawings with every valence electron as a cyan dot for single atoms, CH₄, C₂H₆, OH⁻ and water. Estradiol and testosterone in s06 are line-angle drawings with their standard wedges, O and OH drawn as letters. The prompt says the corners are carbons, and the wedges are not explained (Lesson 3). All drawings use the site's own renderer. |

### New Scenes

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `star-forge` | s01 | ~10–15 s intro in 3Blue1Brown-style motion: a star's core, three helium nuclei fusing into one carbon nucleus with "3 ⁴He → ¹²C" writing itself on, the carbon drifting out through a nebula into a living cell, the nucleus morphing into a C with four valence dots, ending on the star-line card | `aspect: 9:16 \| 16:9 \| 1:1` (video renders) | none (no numbers on screen besides the mass numbers 4 and 12) | the star-line card over the nebula, with the C and its four dots |
| `crust-vs-body` | s01 reveal | Two bars, carbon's mass share of Earth's crust and of the human body, on the same axis with a log-scale break so the crust bar is visible | none | `data/abundance/carbon.json` | both bars labelled |
| `give-or-take` | s03 | One atom at a time from Li to F, each with its valence dots. Two routes to a full shell: **Give** (lose every valence electron; bar = sum of the ionization energies, eV) and **Take** (gain 8 − valence; the first electron shows its electron affinity where the anion is bound, every further electron is flagged "a lone atom won't hold this one"). A counter shows "electrons to move, cheaper way: n". | `atom: Li \| Be \| B \| C \| N \| O \| F` (slider) | `data/atoms/ionization-li-f.json`, `data/atoms/electron-affinity-li-f.json` | carbon selected, both routes drawn |
| `water-push` | s04; the homepage hero | OH⁻ (O with three lone pairs, one O–H bond) and H⁺. A lone pair on O swings over to H⁺ and becomes an O–H bond. Water, every shell full. Same Scene as the homepage hero, non-interactive here. | `interactive: false` here (`true` on the homepage) | none | water, with the new O–H bond highlighted |
| `build-by-sharing` | s05 | A carbon with four single dots and a tray of H atoms. A dropped H snaps onto a single dot and the two electrons become a shared pair. Stage 2: two CH₃ pieces, each with one single dot, join into ethane. Live electron count around each atom. | `stage: 1 \| 2` | none | ethane with every shared pair drawn |

**Data notes**

- **Hook (`data/abundance/carbon.json`):** carbon's mass fraction of Earth's crust from the CRC Handbook table "Abundance of Elements in the Earth's Crust and in the Sea", and of the human body from ICRP Publication 23, *Reference Man* (1975), as carbon mass ÷ total body mass. Each value carries its source and licence. **Fallback** (decided): if either value can't be sourced at an acceptable licence, s01 drops the numbers and asks "Which element is the backbone of every living thing?" (`a` oxygen · `b` carbon · `c` iron · `d` silicon, all accepted as a prediction), and the `crust-vs-body` Scene is cut.
- **`give-or-take`:** the Give bar for an atom with *v* valence electrons is the sum of its first *v* ionization energies (NIST ASD). The Take side shows the first electron affinity only where it is positive (the anion is bound). Where it is not (Be, N), and for every electron beyond the first, it shows the flag "a lone atom won't hold this one", **never an invented bar** (no multiply charged atomic anion is bound in the gas phase). The bars are labelled "one atom, alone in empty space". Real O²⁻ and N³⁻ exist only when surrounded by other ions, which is Unit 2 and beyond. **Sanity check at build time:** carbon's "electrons to move" is 4, the largest in the row; the counts read 1, 2, 3, 4, 3, 2, 1 from Li to F.

---

## Steps

### `u1-l00-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** first the Scene `star-forge` plays, ending on the big-statement card: "**Every carbon atom in you was forged in a star. Organic chemistry is what that carbon learned to do next.**" Then: "Carbon is only {crust.C} of Earth's crust. Roughly how much of *your* body's mass is carbon?"
- **Visual:** the star-line card, shrunk to the top of the screen while the choices are up.
- **Interaction:** pick one. `a` less than 1% · `b` about 5% · `c` about 20% · `d` about 50%
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `crust-vs-body`. "About **{body.C}** of you is carbon, hundreds of times more than the rock under your feet. Life is built from carbon, and this Lesson is about why."
- **Scene:** `star-forge` autoplays on entry (reduced motion: poster frame + Play). Screen reader: "A star's core. Three helium nuclei fuse into one carbon nucleus: three helium-4 make carbon-12. The carbon drifts out through a nebula and into a living cell, then becomes a letter C with four electrons around it. Text: Every carbon atom in you was forged in a star. Organic chemistry is what that carbon learned to do next." `crust-vs-body` plays on reveal. Screen reader: "Two bars. Carbon is {crust.C} of Earth's crust and {body.C} of the human body."
- **Source note:** "Carbon is made in stars by the triple-alpha process: OpenStax *Astronomy 2e* §22.4, CC BY 4.0. Abundances: see `data/abundance/carbon.json`."
- **Video note:** the Prototype ticket makes three comparison cuts of `star-forge` (native React/Remotion, Manim CE, DaVinci Resolve). Only the React Scene ships.

### `u1-l00-s02` · Build · Explain

- **Prompt:** "Atoms trade and share their **outer electrons**, the ones farthest out. An atom is most stable when its outer shell is **full**: **8 electrons** for carbon, nitrogen, oxygen and their neighbours (the **octet**), **2** for hydrogen.
  Carbon has **4** outer electrons. It needs 4 more, or 4 fewer, or another way."
- **Visual / Scene:** dot drawings of H, C, N, O, F in a row, each with its outer electrons as cyan dots; then neon (8 dots), labelled "already full: neon reacts with almost nothing". Static.
- **Screen reader:** "Hydrogen has 1 outer electron, carbon 4, nitrogen 5, oxygen 6, fluorine 7. Neon has 8, a full shell, and reacts with almost nothing."
- **Source note:** "Filled-shell idea adapted from MIT OCW 5.12, Lecture 1 p. 8, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l00-s03` · Build · Manipulate a Scene (signature)

- **Prompt:** "Give or take? Slide through the row from Li to F. Each atom can fill its shell by giving away its outer electrons or by taking extra ones. Find the atom that has to move the **most** electrons, even the cheaper way, then press Check."
- **Visual / Scene:** `give-or-take`, slider under it, starting on Li.
- **Interaction:** drag the slider (keyboard: arrow keys) and press Check on the chosen atom.
- **Answer:** C.
- **Correct line:** "Carbon sits right in the middle: 4 to give or 4 to take. Giving 4 costs a huge amount of energy, and a lone atom won't hold 4 extra. Neither route works."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | B or N | "Close. B gives 3 and N takes 3. Its neighbour in the middle has it worse." |
  | Li or F | "Look at the counter: this one moves just one electron. That's the easy end." |
  | Be or O | "This one moves two. Keep sliding toward the middle." |
  | *(any other)* | "Watch the 'electrons to move' counter. Which atom has the biggest number?" |

- **Reveal:** the slider jumps to C, both routes light up: "4 to give: {ie.C.sum4} eV. 4 to take: a lone atom won't hold them."
- **Scene:** screen reader on each slider stop: "<atom>: <v> outer electrons. Give <v>, costing <sum> electron-volts, or take <8 − v>: <EA line>. Electrons to move, cheaper way: <n>." The "Describe" text reads the stop the Student is on.
- **Source note:** "Ionization energies: NIST Atomic Spectra Database. Electron affinities: Andersen, Haugen & Hotop, *J. Phys. Chem. Ref. Data* 28, 1511 (1999). 'Middle of the second row' after MIT OCW 5.12, Lecture 1 p. 4, CC BY-NC-SA 4.0."

### `u1-l00-s04` · Build · Explain

- **Prompt:** "So carbon does the third thing: it **shares**. Two atoms each count a shared pair of electrons toward their own shell. **A shared pair is a bond.**
  Here's a pair becoming a bond: hydroxide's electron pair swings onto H⁺, and now oxygen and hydrogen share it. (If you tried the push on the homepage, this is the same one.)
  Carbon, with 4 outer electrons, makes **4 shared pairs, 4 bonds**, and its shell is full."
- **Scene:** `water-push` (`interactive: false`), autoplays once. Screen reader: "Hydroxide, an oxygen with three lone pairs and one bond to hydrogen, and a hydrogen ion. One lone pair on oxygen swings over to the hydrogen ion and becomes a bond. The result is water: oxygen shares two pairs and keeps two lone pairs, so its shell holds 8. Each hydrogen holds 2."
- **Source note:** "Sharing as carbon's route: MIT OCW 5.12, Lecture 1 p. 4, CC BY-NC-SA 4.0."

### `u1-l00-s05` · Build · Manipulate a Scene

- **Prompt:** stage 1: "Give carbon a full shell. Drag H atoms onto it." Stage 2 (appears when stage 1 is done): "Carbon can share with carbon too. Join these two pieces."
- **Visual / Scene:** `build-by-sharing`. Stage 1: C with four single dots, a tray of 6 H. Stage 2: two CH₃ pieces, each C with one single dot.
- **Interaction:** drag (keyboard: Tab to an atom in the tray, Enter, Tab to a single dot, Enter). A drop snaps only onto a single dot. Stage 2: drag one CH₃ onto the other's single dot.
- **Answer:** a state. Stage 1 = CH₄ (every shell full); stage 2 = C₂H₆. Continue enables when stage 2 is done.
- **In-Scene feedback** (shown at once, no try count, since a refused drop changes nothing):
  - 5th H dropped on carbon: "Carbon already holds 8, and there's no single dot left. It's full."
  - H dropped on an H of CH₄: "That H holds 2 already. It's full."
  - drop on empty space: the atom slides back to the tray.
- **Correct line:** stage 1: "CH₄, methane: 8 around carbon, 2 around each H." Stage 2: "C₂H₆, ethane: a carbon–carbon bond. Chain enough of these and you get fuels, plastics, you."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | Continue tapped while disabled, before stage 1 is done | "Count the dots around carbon. A full shell is 8; each H you add brings one more." |
  | *(any other)*: 30 s idle | "Drop each H on one of carbon's single dots." |

- **Reveal:** n/a (no wrong submission is possible). After a second 30 s idle the next correct drop is ghosted as a nudge.
- **Scene:** screen reader announces each snap: "H bonded to carbon. Carbon holds <n> electrons." Stage 2: "The two carbons share a pair. Each carbon holds 8."
- **Source note:** n/a (our example).

### `u1-l00-s06` · Build · Tap-to-identify

- **Prompt:** "Same atoms, different life. Estradiol (an estrogen) and testosterone are built from the same carbon skeleton. Every corner is a carbon; you'll learn to read these drawings in Lesson 2. Tap the **two** places on testosterone that differ from estradiol, then press Check."
- **Visual:** estradiol (`C[C@]12CC[C@H]3[C@@H](CCc4cc(O)ccc34)[C@@H]1CC[C@@H]2O`, PubChem CID 5757) above testosterone (`C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@]34C)[C@@H]1CC[C@@H]2O`, CID 6013), same orientation. Tappable: every atom of testosterone.
- **Answer:** one atom from each group, nothing else. Group A, the A ring: O3, C1, C2, C3, C4, C5 (estradiol has a flat ring with an OH, testosterone a C=O). Group B, the extra methyl: C19.
- **Correct line:** "Two small changes, the left ring and one extra CH₃, turn one hormone into the other. Carbon frameworks are that sensitive."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes the C17 OH or C18 methyl | "Both hormones have that one, top right. Look at the left side." |
  | includes C10 but not C19 | "Close: it's what hangs off this carbon." |
  | only group A | "That's one. There's a small CH₃ that only testosterone has." |
  | only group B | "That's one. Compare the left-hand rings." |
  | *(any other)* | "Cover one drawing, then the other. Two spots change." |

- **Reveal:** the A ring and C19 ring in cyan on testosterone, with the matching spots on estradiol: "ring with OH ↔ ring with C=O" and "no CH₃ ↔ CH₃".
- **Source note:** "Pair from MIT OCW 5.12, Lecture 1 p. 5 ('Subtleties in Structure'), CC BY-NC-SA 4.0. Structures: PubChem CIDs 5757 and 6013."

### `u1-l00-s07` … `s08` · Check

The two Check Problems below, in order.

### `u1-l00-s09` · Wrap · Explain (big-statement card)

- **Prompt:** "**Carbon can't easily win electrons or give them up, so it shares, and sharing builds everything.**
  Full shell: 8 (2 for H).
  A shared pair is a bond; carbon makes 4.
  Carbon bonds to carbon, so its frameworks can grow endlessly."
- **Scene:** `build-by-sharing`, final frame. Screen reader: "Ethane, two carbons sharing a pair, each with three hydrogens."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Bonds, Polarity & Formal Charge**, secondary Back to Unit.
- **Source note:** n/a.

---

## Check Problems

Both are Lesson-only (tagged Lesson 0, excluded from Practice Set draws; they count toward the Streak). Source note for both: "Based on MIT OCW 5.12, Lecture 1 pp. 4 and 8, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours."

### `u1-onramp-why-share` · Multiple choice · difficulty 1

- **Tags:** Unit 1, Lesson 0 · **Status:** draft
- **Prompt:** "Why does carbon share electrons instead of gaining or losing them?"
- **Interaction:** pick one.
  - `a` Gaining or losing 4 electrons is too hard, so sharing is the cheaper way to fill its shell.
  - `b` Carbon has no outer electrons to give.
  - `c` Carbon's outer shell is already full.
  - `d` Shared electrons don't count for either atom.
- **Answer:** {a}
- **Correct line:** "Right: 4 is the most electrons any atom in the row has to move. Sharing fills the shell without moving any."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Carbon has 4 outer electrons. Giving them all away is possible on paper. Why doesn't it?" |
  | `c` | "A full shell is 8. Carbon has 4, so it still needs more." |
  | `d` | "Shared electrons count for both atoms. That's what makes sharing work." |
  | *(any other)* | "Think back to Give or take: how many electrons would carbon have to move?" |

- **Reveal:** `a`, with "Moving 4 electrons either way is too costly. Sharing 4 pairs gets carbon to 8."
- **Scene:** n/a.

### `u1-onramp-octet-count` · Numeric input · difficulty 1

- **Tags:** Unit 1, Lesson 0 · **Status:** draft
- **Prompt:** "Methane, CH₄. How many electrons surround the carbon, counting both electrons of every shared pair?"
- **Visual:** CH₄ dot drawing, every shared pair as two cyan dots.
- **Interaction:** number pad.
- **Answer:** 8 electrons, ±0.
- **Correct line:** "4 shared pairs × 2 = 8. A full shell."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 4 | "Those are carbon's own 4. Each H added one more to its pair. Count both dots in every pair." |
  | 2 | "That's the count around one H. Count around the carbon." |
  | 16 | "Count each pair once: two dots per bond, four bonds." |
  | *(any other)* | "Count the dots touching carbon: two per bond." |

- **Reveal:** the four pairs light up one by one, counting 2, 4, 6, 8.
- **Scene:** n/a.
