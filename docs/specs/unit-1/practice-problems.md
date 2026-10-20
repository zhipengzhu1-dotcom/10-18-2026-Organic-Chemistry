# Unit 1 Practice Problems

The Problem Bank for Unit 1, beyond the Lessons' 27 Check Problems: **24 Practice Problems**, 3 per core Lesson (1–8) at difficulty 1, 2 and 3. Lesson 0 (the On-ramp) has none, because its Problems are never drawn. The format is the [template](../lesson-spec-template.md)'s Practice Problems file. Each Problem becomes a Problem file in the Bank with status `draft`, which turns `approved` when the owner merges.

Decided in [Decide the content authoring and review workflow](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/52). Ticket: [Specify Unit 1 Practice Problems](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/54). Draw rules: [Decide the Problem Bank and Submitted Problems flow](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/16). Each Problem tests only what its Lesson (and the Lessons before it) taught, in their words. The merged Lesson specs in this folder are the reference.

## Problem checks (the reviewer ticks these)

- [x] Every core Lesson 1–8 has one Problem at each difficulty 1, 2 and 3 (24 in all; the floor is 20 per built Unit)
- [x] No Problem duplicates any of the 27 core Check Problems (the same molecule may come back only to ask a different question)
- [x] Every interactive Problem has a Hint for each anticipated wrong answer, plus a generic fallback
- [x] Every number points at cited data (a pipeline field in curly braces, or a count the Student works out); none is typed here
- [x] Every Scene in a reveal has screen-reader text; every 3D viewer has its Describe text
- [x] Every Problem has a source line, and its source's licence allows adaptation (see Sources)
- [x] Every Tap-to-identify Problem in a Lesson that has Draw-arrows Steps (Lessons 6–8) says in its prompt that it is tap-only, because a Practice Set can put it right after a Draw-arrows Problem
- [x] Blind re-solve by a second agent done before the PR (results at the top of the PR body)

## Sources

Adapted first, written fresh only for gaps. All wording is ours, and every structure is drawn by the site's own renderer (no source figure is reused).

| Source | Licence | Used for |
|---|---|---|
| MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski: Problem Set 1 and key (Q1, Q2b, Q5b, the Q8 structure, Q16b), Problem Set 2 and key (Q1, Q4), Hour Exam 1 and key (Q8) | CC BY-NC-SA 4.0 | 9 Problems |
| LibreTexts, *Map: Organic Chemistry (Wade)*, ch. 1: [§1.16 Additional Exercises](https://chem.libretexts.org/Bookshelves/Organic_Chemistry/Map%3A_Organic_Chemistry_(Wade)_Complete_and_Semesters_I_and_II/Map%3A_Organic_Chemistry_(Wade)/01%3A_Introduction_and_Review/1.16%3A_Additional_Exercises) (1-8, 1-10, 1-20, 1-22) with [§1.17 Solutions](https://chem.libretexts.org/Bookshelves/Organic_Chemistry/Map%3A_Organic_Chemistry_(Wade)_Complete_and_Semesters_I_and_II/Map%3A_Organic_Chemistry_(Wade)/01%3A_Introduction_and_Review/1.17%3A__Solutions_to_Additional_Exercises), "authored, remixed, and/or curated by LibreTexts" | CC BY-NC-SA 4.0 (page licence tag `ccbyncsa`, checked 2026-10-19) | 6 Problems |
| Original (ours) | n/a | 9 Problems |
| PubChem (structures and formulas, CIDs per Problem) | public domain data | every structure |

**Excluded:** OpenStax *Organic Chemistry* (its pages restrict generative-AI use, as Lessons 1 and 8 found; used for facts only, never problems); every LibreTexts book remixed from OpenStax (e.g. *Organic Chemistry (Morsch et al.)*, CC BY-SA, which also cannot be relicensed under our NC terms); MIT PS1 Q7 and Q14 (Smith, McGraw-Hill); every "Courtesy of … used with permission" figure. LibreTexts' terms of service (effective 2020-10-15) leave reuse to each page's own licence and set no AI rule, so a page is usable only when its own licence tag is CC BY or CC BY-NC-SA.

**Source note wording** for adapted Problems: "Adapted from MIT OCW 5.12, <item>, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours." or "Adapted from LibreTexts, *Map: Organic Chemistry (Wade)*, §1.16 exercise <n> and its solution in §1.17, CC BY-NC-SA 4.0. Wording and drawing ours."

## Data and Scene additions

The Problems reuse the Lessons' Scenes and data files. They add:

| What | For | Rule |
|---|---|---|
| `geometry/chloroform.json` (`ClC(Cl)Cl`, CID 6212), `geometry/hydrogen-cyanide.json` (`C#N`, CID 768) | `u1-3d-polar-hcn` | Lesson 3's geometry rule: CCCBDB experimental if its page has complete Cartesians, else computed; one source per molecule |
| `geometry/allene.json` (`C=C=C`, CID 10037) | `u1-hyb-allene-planes` | Lesson 4's rule (CCCBDB experimental, consistency check against its internal coordinates) |
| `dipole-sum` molecules `chcl3`, `hcn`, `ch4` | `u1-3d-polar-hcn` reveal | Lesson 3's arrow rule (length from the Pauling difference, labelled "a rough guide, not to scale") |
| `h-fill` molecule `furan`; `lone-pair-fill` molecule `caffeine` | Lesson 2 reveals | Lesson 2's build checks (H count from SMILES = PubChem formula; lone pairs from valence) |
| `molecule-card` `startView: ps1-q2b-left`, `ps1-q2b-right` on `geometry/2-fluorobutane-r.json` | `u1-3d-perspective-b` | each `startView` checked by projecting the coordinates, as in Lesson 3 |

**Sanity checks at build time** (not shown to Students; a failure stops the build of that Problem and goes to the owner):

- `{en.B}` < `{en.H}` (so H is δ− in B–H) and `{en.N}` < `{en.O}`, from Lesson 1's Pauling file.
- Counts from RDKit match the answers: furan 4 H (C₄H₄O), caffeine 8 lone pairs, ibuprofen exactly 3 carbons with no H. (Checked once while drafting, RDKit 2026.03.5; the build reruns it.)
- Every Draw-arrows start and target has the same atoms, the same H's, the same σ framework and the same total charge, and every atom in every accepted result has an octet (H: 2). Starts and targets are compared as Kekulé structures, because RDKit would otherwise read the phenoxide ring as aromatic. (Checked once while drafting; the build reruns it.)
- `u1-3d-perspective-b`: in (R)-2-fluorobutane turned so H and CH₂CH₃ lie in the page as in the right-hand drawing, F points away and CH₃ toward the viewer. (Worked out by hand from the CIP configuration while drafting and matched against the PS1 key; the build confirms it from the coordinates.)
- `u1-hyb-allene-planes`: the H–C1–H plane and the H–C3–H plane meet at 90° within 0.5°.

---

## Lesson 1: Bonds, Polarity & Formal Charge

### `u1-fc-bromine-two-bonds` · Numeric input · difficulty 1

- **Tags:** Unit 1, Lesson 1 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS1 Q1 (the Br fragment) and its key
- **Prompt:** "What is the formal charge on this bromine?"
- **Visual:** the PS1 Q1 fragment: Br with two single bonds (dangling lines) and two lone pairs; charge hidden. Full Lewis, as Lesson 1 draws fragments.
- **Interaction:** number pad with a ± key.
- **Answer:** +1, ±0.
- **Correct line:** "7 − 4 − 2 = +1. A halogen usually makes 1 bond with 3 lone pairs; one more bond shows up as +1."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 0 | "Bromine's usual pattern is 1 bond + 3 lone pairs. This one has 2 bonds. Count again." |
  | +3 | "Count every lone-pair electron, not every pair: two pairs are 4 electrons. 7 − 4 − 2." |
  | −1 | "Each bond counts once, for this atom's half of the pair. 7 − 4 − 2." |
  | *(any other)* | "Valence 7 (a halogen), minus lone-pair electrons, minus bonds." |

- **Reveal:** Scene `dots-and-sticks` on the fragment: "7 − 4 − 2 = +1."
- **Scene:** `dots-and-sticks` on reveal. Screen reader: "Bromine: 7 valence electrons, minus 4 in two lone pairs, minus 2 bonds, equals plus 1."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q1 and its key, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours."

### `u1-polarity-tap-dminus` · Tap-to-identify · difficulty 2

- **Tags:** Unit 1, Lesson 1 · **Status:** draft
- **Source line:** Adapted from LibreTexts Wade 1-10 (b, c, d, f) and its solution
- **Prompt:** "In each highlighted bond, tap the **δ−** atom, then press Check. One of them may surprise you."
- **Visual:** four small molecules in a 2 × 2 grid, full Lewis, one bond in each highlighted with a thick outline (not colour alone): an N–H bond of ammonia (`N`, CID 222), the C≡N bond of hydrogen cyanide (`C#N`, CID 768), a B–H bond of borane (`B`, BH₃, CID 6331), the N–O bond of hydroxylamine (`NO`, CID 787). Tappable: the two atoms of each highlighted bond (hit area ≥ 48 px). The `en-strip` values are one tap away ("Show values"), with `highlight: H, B, C, N, O`.
- **Answer:** {N of ammonia, N of HCN, H of borane, O of hydroxylamine}: one atom per bond. (The Problem depends on `en-strip` showing values to 2 decimals, as Lesson 1 specifies, so B and H are visibly different.)
- **Correct line:** "N, N, H, O. The surprise is borane: boron is a weaker puller than hydrogen, so here H is the δ− end."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | B picked in B–H | "Boron sits left of carbon, and it pulls even less than hydrogen. Open the values: which number is bigger?" |
  | H picked in N–H | "Nitrogen pulls much harder than hydrogen. Its partner wins this one." |
  | C picked in C≡N | "Nitrogen sits right of carbon in the same row, so it pulls harder." |
  | N picked in N–O | "Both pull hard, but oxygen sits one place further right." |
  | fewer than four atoms picked | "Pick one atom in **each** of the four highlighted bonds." |
  | *(any other)* | "Open the values: in each bond, the atom with the bigger number is δ−." |

- **Reveal:** δ− and δ+ labels on all four bonds, the two values under each, borane's bond ringed: "B {en.B} < H {en.H}: hydrogen is δ− here."
- **Scene:** n/a. Screen reader for the grid: "Four molecules: ammonia, one N–H highlighted; hydrogen cyanide, the C≡N highlighted; borane, one B–H highlighted; hydroxylamine, the N–O highlighted."
- **Source note:** "Adapted from LibreTexts, *Map: Organic Chemistry (Wade)*, §1.16 exercise 1-10 and its solution in §1.17, CC BY-NC-SA 4.0. Wording and drawing ours. Electronegativity, Pauling scale: Allred (1961), via the CRC Handbook. Structures: PubChem CIDs 222, 768, 6331, 787."

### `u1-fc-boron-four-bonds` · Numeric input · difficulty 3

- **Tags:** Unit 1, Lesson 1 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS1 Q1 (the B fragment) and its key
- **Prompt:** "What is the formal charge on this boron?"
- **Visual:** the PS1 Q1 fragment: B with two single bonds and one double bond (dangling lines), no lone pairs; charge hidden.
- **Interaction:** number pad with a ± key.
- **Answer:** −1, ±0.
- **Correct line:** "3 − 0 − 4 = −1. Boron usually makes 3 bonds (like BF₃); a fourth bond gives it a full octet and a −1 charge."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 0 | "Boron's usual is 3 bonds. Here the double bond counts as 2, so it has 4." |
  | +1 | "Boron owns only 3 electrons but has 4 bonds. Subtracting more than it owns leaves it negative: 3 − 0 − 4." |
  | −5 | "Each bond counts once, not twice. 3 − 0 − 4." |
  | −2 | "Count the bonds again: two single plus one double is 4, not 5." |
  | *(any other)* | "Valence 3 (boron, as in BF₃), minus lone-pair electrons (none), minus bonds (a double bond counts 2)." |

- **Reveal:** Scene `dots-and-sticks` on the fragment: "3 − 0 − 4 = −1. Eight electrons around B: a real ion." The Bonding patterns card's boron cell (4 bonds, −1) is highlighted beside it.
- **Scene:** `dots-and-sticks` on reveal. Screen reader: "Boron: 3 valence electrons, no lone pairs, 4 bonds. 3 minus 0 minus 4 equals minus 1."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q1 and its key, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours."

---

## Lesson 2: Drawing Molecules

### `u1-draw-furan-h` · Numeric input · difficulty 1

- **Tags:** Unit 1, Lesson 2 · **Status:** draft
- **Source line:** Adapted from LibreTexts Wade 1-8 (furan's Lewis structure)
- **Prompt:** "Furan, a ring found in coffee aroma, as a line-angle drawing. How many hydrogens does it have?"
- **Visual:** furan line-angle (`C1=COC=C1`, PubChem CID 8029): a five-membered ring, O at the top as a letter with its two lone pairs, two ring double bonds.
- **Interaction:** number pad; the unit "H atoms" shows beside the box.
- **Answer:** 4 H atoms, ±0.
- **Correct line:** "Each of the four carbons has a double bond and a single bond, 3 bonds, so each gets 1 H. Four in all."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 8 | "Each carbon is in a double bond. That's already 3 bonds, so room for only 1 H." |
  | 0 | "None are drawn, but they're there. Each corner fills up to 4 bonds with H's." |
  | 5 | "O isn't a carbon: it has no hidden H's. Only the four corners get them." |
  | 2 | "All four corners get the same treatment. Check the two next to O as well." |
  | *(any other)* | "For each corner: 4 minus the bonds you see (a double bond counts 2)." |

- **Reveal:** Scene `h-fill` (`furan`).
- **Scene:** `h-fill` on reveal. Screen reader: "Furan fills in. Each of the four carbons has a double bond and a single bond in the ring, and gains one hydrogen. Total: 4 hydrogens."
- **Source note:** "Molecule after LibreTexts, *Map: Organic Chemistry (Wade)*, §1.16 exercise 1-8, CC BY-NC-SA 4.0; our question. Furan, PubChem CID 8029."

### `u1-draw-ibuprofen-bare-carbons` · Tap-to-identify · difficulty 2

- **Tags:** Unit 1, Lesson 2 · **Status:** draft
- **Source line:** Original
- **Prompt:** "Ibuprofen, the painkiller. Tap every carbon that has **no** hydrogens, then press Check."
- **Visual:** ibuprofen line-angle (`CC(C)CC1=CC=C(C=C1)C(C)C(=O)O`, PubChem CID 3672, drawn without stereo), benzene-type ring with alternating lines, the acid end written C(=O)OH with O letters and every lone pair. Tappable: all 13 carbons (ends and corners, ≥48 px hit areas).
- **Answer:** {the ring carbon bonded to the CH₂, the ring carbon bonded to the CH, the C=O carbon}.
- **Correct line:** "Three carbons already have four bonds to other atoms: the two ring carbons that carry a branch, and the C=O carbon of the acid."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes a ring corner with no branch | "That ring corner has two ring bonds, one of them double: 3 bonds, so 1 H." |
  | includes a branch corner with three lines (either CH) | "Three lines meet there: 3 bonds, so 1 H." |
  | includes a CH₂ or a line end | "A corner with two lines has 2 H's, and a line end has 3." |
  | misses the C=O carbon | "Look at the acid end: its carbon has a double bond to O, a bond to OH and a bond to the chain. That's 4." |
  | misses a branched ring carbon | "Two ring corners carry a branch: a double bond, a single bond in the ring, and the branch. That's 4 bonds." |
  | *(any other)* | "For each carbon: 4 minus the bonds you see. Tap only the ones where that's 0." |

- **Reveal:** the three carbons ringed in cyan, each labelled "4 bonds → 0 H"; every other carbon shows its H count.
- **Scene:** n/a. Screen reader for the structure: "Ibuprofen. A benzene ring with a branch on opposite sides. On one side, a CH₂ leading to a CH with two methyls. On the other, a CH carrying a methyl and a carboxylic acid end, C double-bonded to O and bonded to OH." Each tappable carbon announces its bonds.
- **Source note:** "Ibuprofen, PubChem CID 3672 (formula C₁₃H₁₈O₂)."

### `u1-draw-caffeine-lone-pairs` · Numeric input · difficulty 3

- **Tags:** Unit 1, Lesson 2 · **Status:** draft
- **Source line:** Original
- **Prompt:** "Caffeine, drawn the way most books do: no lone pairs. How many lone pairs does it have in all?"
- **Visual:** caffeine line-angle (`CN1C=NC2=C1C(=O)N(C(=O)N2C)C`, PubChem CID 2519), chip "Lone pairs hidden": the six- and five-membered rings with alternating lines as in PubChem's depiction, both =O and all four N as letters, the three methyls as line ends.
- **Interaction:** number pad; the unit "lone pairs" shows beside the box.
- **Answer:** 8 lone pairs, ±0.
- **Correct line:** "Two O's with 2 bonds: 2 + 2. Four N's with 3 bonds each: 1 each, including the one with a double bond. 4 + 4 = 8."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 4 | "That's only the oxygens, or only the nitrogens. Count both kinds." |
  | 7 | "One N has a double bond in the ring. A double bond counts 2, so that N still has 3 bonds and 1 lone pair." |
  | 12 | "N with 3 bonds keeps 1 lone pair, not 2. A double bond counts as 2 bonds." |
  | 6 | "There are four nitrogens. Find all of them, then the two oxygens." |
  | *(any other)* | "Find every O and N. O with 2 bonds → 2 lone pairs, N with 3 bonds → 1." |

- **Reveal:** Scene `lone-pair-fill` (`caffeine`). Screen reader: "Each oxygen, two bonds, gains two lone pairs. Each of the four nitrogens, three bonds, gains one. Eight lone pairs in all."
- **Scene:** `lone-pair-fill` on reveal.
- **Source note:** "Caffeine, PubChem CID 2519 (formula C₈H₁₀N₄O₂)."

---

## Lesson 3: Molecules in 3D

### `u1-3d-hydronium-shape` · Multiple choice · difficulty 1

- **Tags:** Unit 1, Lesson 3 · **Status:** draft
- **Source line:** Original
- **Prompt:** "Hydronium, H₃O⁺, from Lesson 1. Count oxygen's electron domains. What shape is the ion?"
- **Visual:** Lewis H₃O⁺, three bonds to H and one lone pair on O as cyan dots, the circled ⁺ beside O.
- **Interaction:** pick one. `a` trigonal planar · `b` trigonal pyramidal · `c` tetrahedral · `d` bent
- **Answer:** {b}
- **Correct line:** "Three bonds + one lone pair = 4 domains, spread like methane's. The shape is named by the atoms: three H's below the O, a tripod, just like NH₃."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "Count the lone pair too: 3 bonds + 1 lone pair is 4 domains. Three domains would be flat; four aren't." |
  | `c` | "Tetrahedral describes the four domains. The shape is named only by where the atoms are, and the lone pair isn't an atom." |
  | `d` | "Bent is 2 bonds + 2 lone pairs, like water. Hydronium's O holds three H's." |
  | *(any other)* | "Count bonds plus lone pairs on O, then name the shape from the atoms only." |

- **Reveal:** "4 domains, 3 of them bonds: trigonal pyramidal, the same family as NH₃." Lesson 3's `four-domain-family` final frame sits beside it with the NH₃ card ringed.
- **Scene:** n/a beyond the static frame. Screen reader: "Hydronium: oxygen with three hydrogens and one lone pair. Four domains; the three hydrogens form a tripod below oxygen: trigonal pyramidal."
- **Source note:** n/a (no numbers; hydronium from Lesson 1 s06).

### `u1-3d-polar-hcn` · Multiple choice (multi-correct) · difficulty 2

- **Tags:** Unit 1, Lesson 3 · **Status:** draft
- **Source line:** Original
- **Prompt:** "Which of these molecules are polar overall? Pick all that apply."
- **Interaction:** four structure cards, each in its 3D drawing (lines, wedges and dashes), lone pairs shown.
  - `a` CHCl₃, chloroform (three Cl's and one H on C: two lines, a wedge and a dash)
  - `b` BF₃ (flat triangle, three lines)
  - `c` HCN, hydrogen cyanide (straight line: H–C≡N)
  - `d` CH₄ (two lines, a wedge and a dash)
- **Answer:** {a, c}
- **Correct line:** "Chloroform and HCN. HCN is a straight line like CO₂, but its ends differ: C pulls H's electrons toward itself and N pulls C's, so both pulls point the same way, toward N. BF₃ and CH₄ are so symmetric that their equal pulls cancel."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `b` | "BF₃ is a flat triangle with three equal B–F pulls spread evenly. Tip to tail they cancel." |
  | includes `d` | "Four equal C–H pulls point to the corners of a tetrahedron and cancel, and each one is tiny anyway." |
  | misses `c` | "A straight line cancels only when its two ends are the same, as in CO₂. Draw HCN's two bond dipoles: which way does each point?" |
  | misses `a` | "Swap one of CCl₄'s Cl's for an H: the pulls no longer balance, and the Cl side wins." |
  | *(any other)* | "Polar bonds aren't enough. Picture the pulls added tip to tail: does anything survive?" |

- **Reveal:** `dipole-sum` (`added: true`) for each card in turn: CHCl₃ and HCN end on a net arrow ("polar"), BF₃ and CH₄ on "net: zero" ("nonpolar").
- **Scene:** `dipole-sum`, on reveal. Screen reader per molecule: "Chloroform: tetrahedral. Three C–Cl arrows point toward the chlorines and a small C–H arrow points toward carbon; added, they leave a net arrow toward the chlorines. Polar." / "Boron trifluoride: flat. Three equal arrows; they cancel, net zero. Nonpolar." / "Hydrogen cyanide: a straight line. The C–H arrow points toward carbon and the C≡N arrow toward nitrogen, the same direction; added, a net arrow toward nitrogen. Polar." / "Methane: tetrahedral. Four equal arrows; they cancel, net zero. Nonpolar."
- **Source note:** the four geometry notes (chloroform and hydrogen cyanide per Data and Scene additions; boron trifluoride and methane as in Lesson 3); "Arrow lengths from Pauling electronegativity differences (the values Lesson 1 cites), a rough guide, not to scale." Structures: PubChem CIDs 6212, 6356, 768, 297.

### `u1-3d-perspective-b` · Rotate-and-identify 3D · difficulty 3

- **Tags:** Unit 1, Lesson 3 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS1 Q2b and its key
- **Prompt:** "2-Fluorobutane again, from a new angle. The right-hand drawing has H and CH₂CH₃ in the page; the dash and the wedge are empty. Turn the model to match, then say which group goes where."
- **Visual:** left, the PS1 Q2b drawing around one central C: H up (line), F left (line), CH₃ on a dash and CH₂CH₃ on a wedge, side by side in the gap opposite the V. Right, the partial drawing: H lower left (line), CH₂CH₃ lower right (line), an empty dash (upper left) and an empty wedge (upper right) side by side above. Below, `molecule-card` with `geometry/2-fluorobutane-r.json`, `startView: ps1-q2b-left`, groups labelled F, H, CH₃, CH₂CH₃.
- **Interaction:** rotate, then pick one.
  - `a` F on the dash, CH₃ on the wedge
  - `b` CH₃ on the dash, F on the wedge
  - `c` either way: it's the same molecule
- **Answer:** {a}
- **Correct line:** "Turn the model until H and CH₂CH₃ lie in the page as drawn: F points away (dash) and CH₃ comes toward you (wedge). Same molecule, just turned."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Turn the model so H points lower left and CH₂CH₃ lower right, both in the page (the badge says In the page). Which group now points at you?" |
  | `c` | "Swap two groups and you get the mirror image, a different molecule. Only one completion matches the model." |
  | *(any other)* | "Put H and CH₂CH₃ in the page as drawn, then read the other two: toward you is the wedge, away is the dash." |

- **Reveal:** the model turns from `ps1-q2b-left` to `ps1-q2b-right`; F slides onto the dash and CH₃ onto the wedge, and the finished drawing appears.
- **Describe text:** "2-fluorobutane. The central carbon holds a fluorine, a hydrogen, a methyl group and an ethyl group at the corners of a tetrahedron." In the right-hand view it adds: "Hydrogen lower left and ethyl lower right, both in the page; fluorine above, away from you; methyl above, toward you."
- **Scene:** n/a (viewer only; `pageSheet: true` through the central C, as in Lesson 3 s09).
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q2b and its key, Berkowski, Spring 2005, CC BY-NC-SA 4.0." Plus the computed 2-fluorobutane geometry note (Lesson 3).

---

## Lesson 4: Hybridization & Orbitals

### `u1-hyb-co2-carbon` · Multiple choice · difficulty 1

- **Tags:** Unit 1, Lesson 4 · **Status:** draft
- **Source line:** Original
- **Prompt:** "Carbon dioxide, O=C=O. Which hybrid set does its carbon use?"
- **Visual:** full Kekulé O=C=O, two lone pairs on each O.
- **Interaction:** pick one. `a` sp³ · `b` sp² · `c` sp
- **Answer:** {c}
- **Correct line:** "Two groups, the two O's, and no lone pair: sp, a straight line (model: 180°), as Lesson 3 found. Carbon's two leftover p orbitals each make one π bond, one to each oxygen."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "sp³ needs four groups. Carbon here is bonded to just two atoms, and a double bond counts as one group." |
  | `b` | "sp² needs three groups. Count carbon's neighbours: two O's, and no lone pair." |
  | *(any other)* | "Count the groups on C (bonded atoms + lone pairs), then match: 4 → sp³, 3 → sp², 2 → sp." |

- **Reveal:** `c`, with a model drawing: two orange sp lobes toward the O's, two cyan p orbitals at right angles, each labelled "π to one O".
- **Scene:** n/a.
- **Source note:** "Our Problem, in the style of MIT OCW 5.12 PS1 Q5. Hybrid model as in Lesson 4."

### `u1-hyb-carbonyl-oxygen` · Multiple choice · difficulty 2

- **Tags:** Unit 1, Lesson 4 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS1 Q5b key (the oxygen's hybridization)
- **Prompt:** "Formaldehyde, H₂C=O. Now count the groups on the **oxygen**. Which hybrid set does it use?"
- **Visual:** full Kekulé H₂C=O, both lone pairs on O as cyan dots.
- **Interaction:** pick one.
  - `a` sp³: two bonds and two lone pairs make four
  - `b` sp²: one bonded atom and two lone pairs make three
  - `c` sp: one bonded atom and one lone pair make two
- **Answer:** {b}
- **Correct line:** "Groups are bonded atoms plus lone pairs, and the C=O double bond is one group. One carbon + two lone pairs = 3: sp². Oxygen's leftover p orbital is the one that makes the C=O π bond with carbon's."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "A double bond counts as **one** group, however many lines it has. How many atoms is O bonded to?" |
  | `c` | "Count O's lone pairs again: there are two." |
  | *(any other)* | "Bonded atoms + lone pairs on O, a double bond counting once. Then 4 → sp³, 3 → sp², 2 → sp." |

- **Reveal:** `b`, with a model drawing: oxygen's three sp² lobes (one toward C, two holding the lone pairs) in the molecular plane, and its p orbital beside carbon's, labelled "π".
- **Scene:** n/a.
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q5b and its key (which labels the C=O oxygen sp² with two lone pairs), Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours."

### `u1-hyb-allene-planes` · Rotate-and-identify 3D · difficulty 3

- **Tags:** Unit 1, Lesson 4 · **Status:** draft
- **Source line:** Original
- **Prompt:** "Allene, H₂C=C=CH₂, measured. Its middle carbon makes two double bonds. Spin it. How do the two CH₂ ends sit?"
- **Visual / Scene:** `molecule-card` (`molecule: allene`), ball-and-stick, starting at a three-quarter view; a plane toggle shows each end's H–C–H plane as a translucent sheet with a text badge ("left CH₂ plane", "right CH₂ plane").
- **Interaction:** rotate (planes toggle available), then pick one.
  - `a` both CH₂ groups lie in the same plane
  - `b` the two CH₂ planes are at right angles
  - `c` the two CH₂ planes are twisted halfway, about 45° apart
- **Answer:** {b}
- **Correct line:** "The middle carbon is sp, with two p orbitals at right angles, one for each π bond. Each end carbon's own p must lie parallel to its partner, so each CH₂ plane stands at right angles to its π bond, and the two ends end up at right angles to each other."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "Look down the C=C=C line. Do the two H pairs line up, or cross?" |
  | `c` | "The middle carbon's two p orbitals sit at a fixed right angle (Lesson 4: sp leaves two p's at right angles). The CH₂ planes follow them." |
  | *(any other)* | "Turn the model to look straight down the three carbons, then switch on both plane sheets." |

- **Reveal:** the model turns end-on (down the C=C=C axis), both planes on: the two H pairs form a cross, labelled "planes at right angles".
- **Scene:** Describe text: "Allene: three carbons in a straight line. The two hydrogens on the left carbon lie in one plane; the two on the right carbon lie in a plane at right angles to it. Seen end-on, the four hydrogens form a cross."
- **Source note:** allene geometry note (Lesson 4 wording, per Data and Scene additions). "Allene, PubChem CID 10037."

---

## Lesson 5: Functional Groups

### `u1-fg-ether` · Multiple choice (structure cards) · difficulty 1

- **Tags:** Unit 1, Lesson 5 · **Status:** draft
- **Source line:** Original
- **Prompt:** "Which one is an **ether**?"
- **Interaction:** four structure cards, one correct, line-angle.
  - `a` diethyl ether (`CCOCC`, CID 3283)
  - `b` ethanol (`CCO`, CID 702)
  - `c` dimethyl sulfide (`CSC`, CID 1068)
  - `d` methyl acetate (`CC(=O)OC`, CID 6584)
- **Answer:** {a}
- **Correct line:** "An O between two skeleton carbons, with no H on it and no C=O beside it: an ether."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "That O carries an H. O–H on a skeleton carbon is an alcohol." |
  | `c` | "Look at the letter: S, not O. C–S–C is ether's sulfur twin, a sulfide." |
  | `d` | "That O sits between two carbons, but one of them is a C=O carbon. C=O with O–C beside it reads as one group: an ester." |
  | *(any other)* | "An ether is C–O–C, with the O touching only plain skeleton carbons." |

- **Reveal:** `a` ticked "ether"; `b` "alcohol", `c` "sulfide", `d` "ester".
- **Scene:** n/a.
- **Source note:** "Groups from the MIT OCW 5.12 *Functional Groups* sheet, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Structures: PubChem CIDs 3283, 702, 1068, 6584."

### `u1-fg-aspirin` · Multiple choice (multi-correct) · difficulty 2

- **Tags:** Unit 1, Lesson 5 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS1 Q8 (the aspirin structure; that question's acid–base part is Unit 2's)
- **Prompt:** "Aspirin. Which groups does it contain? Pick all that apply."
- **Visual:** aspirin line-angle (`CC(=O)OC1=CC=CC=C1C(=O)O`, PubChem CID 2244), drawn as in PS1 Q8: arene ring as a Kekulé ring, the C(=O)OH and the O–C(=O)CH₃ on neighbouring ring carbons.
- **Interaction:** eight chips, two columns. `a` carboxylic acid · `b` ester · `c` arene · `d` ketone · `e` ether · `f` phenol · `g` alcohol · `h` aldehyde
- **Answer:** {a, b, c}
- **Correct line:** "Three groups: the ring (arene), the C=O with OH (carboxylic acid), and the C=O with O–C beside it (ester). The O on the ring belongs to the ester, so there's no phenol or ether."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `f` | "A phenol is OH on the ring. The O on this ring carries a C=O, not an H, so it's part of the ester." |
  | includes `e` | "That O touches a C=O carbon. C=O plus O–C is one group, an ester, not an ether." |
  | includes `g` | "The only OH sits on a C=O carbon. C=O with OH is a carboxylic acid." |
  | includes `d` or `h` | "Check each C=O's neighbour. One has OH, the other O–C. Neither has only carbons or an H." |
  | misses `c` | "The six-ring of alternating double bonds is a group too." |
  | misses `a` or `b` | "There are two C=O's. Read each with the atom on the other side of its carbon." |
  | *(any other)* | "Skip the skeleton. Name each π bond and heteroatom by its neighbours." |

- **Reveal:** Scene `group-spotlight` on aspirin, three regions labelled "arene", "carboxylic acid", "ester"; chips `a`–`c` ticked.
- **Scene:** screen reader on reveal: "Aspirin. Lit: the benzene ring, arene; on one ring carbon, C=O with OH, carboxylic acid; on the next, O bonded to a C=O carbon carrying CH₃, ester."
- **Source note:** "Structure as in MIT OCW 5.12, Problem Set 1 Q8, Berkowski, Spring 2005, CC BY-NC-SA 4.0; our question. Aspirin, PubChem CID 2244."

### `u1-fg-metenkephalin-amides` · Tap-to-identify · difficulty 3

- **Tags:** Unit 1, Lesson 5 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 Hour Exam 1 Q8 and its key
- **Prompt:** "Met-enkephalin, one of the body's own painkillers. Tap **every amide**, then press Check."
- **Visual:** Met-enkephalin (`CSCC[C@@H](C(=O)O)NC(=O)[C@H](CC1=CC=CC=C1)NC(=O)CNC(=O)CNC(=O)[C@H](CC2=CC=C(C=C2)O)N`, PubChem CID 443363), drawn full width as in the Exam 1 drawing: a zigzag backbone from H₂N on the left to the C(=O)OH on the right, the phenol ring below the left end, the second arene ring above, the CH₂–S–CH₃ chain below the right end. Tappable: fourteen **regions**, each a fixed, non-overlapping atom set with a hit area of at least 48 px:
  1. **amine**: the NH₂
  2. **phenol**: the left ring and its OH
  3. **amide**: the first C=O and the NH after it
  4. **amide**: the second C=O and NH
  5. **amide**: the third C=O and NH
  6. **amide**: the fourth C=O and NH
  7. **arene**: the upper ring
  8. **sulfide**: the S
  9. **carboxylic acid**: C(=O)OH
  10–14. skeleton, one region per building block: the tyrosine CH with its CH₂, each glycine CH₂ (two regions), the phenylalanine CH with its CH₂, and the methionine CH with its CH₂CH₂ and the S–CH₃ carbon
  Tap and keyboard rules as Lesson 5 s06.
- **Answer:** {3, 4, 5, 6}
- **Correct line:** "Four amides: every C=O along the backbone has NH right beside it. That's how the five building blocks of this molecule are joined."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes region 1 | "That NH₂ sits on a carbon with no C=O, so it's an amine. For an amide, the N touches the C=O carbon." |
  | includes region 9 | "That C=O has OH beside it: a carboxylic acid." |
  | includes region 2, 7 or 8 | "No C=O there. Amides are always a C=O with N beside it." |
  | includes a skeleton region | "That's skeleton: carbons with only C, H and σ bonds." |
  | three amides picked | "One more. Count the C=O's along the backbone that have NH beside them." |
  | fewer than three amides picked | "Follow the backbone from left to right: every C=O there, except the last one, has an NH beside it." |
  | *(any other)* | "Find each C=O, then look at the atom on the other side of its carbon. N means amide." |

- **Reveal:** Scene `group-spotlight`, the four amides lit and labelled "amide"; the other groups outlined and labelled ("amine", "phenol", "arene", "sulfide", "carboxylic acid").
- **Scene:** screen reader on reveal: "Met-enkephalin. Lit, left to right: four C=O groups along the backbone, each with NH beside it, all labelled amide. Also outlined: NH₂, amine; the left ring with OH, phenol; the upper ring, arene; S, sulfide; C=O with OH at the right end, carboxylic acid."
- **Source note:** "Adapted from MIT OCW 5.12, Hour Exam 1 Q8 and its key (which labels amine, phenol, amide four times, arene, sulfide and carboxylic acid), Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours. Met-enkephalin, PubChem CID 443363."

---

## Lesson 6: Resonance: Pushing Electrons

The reveal of every Draw-arrows Problem plays `push-replay`. Drop targets and layout follow the template.

### `u1-res-pentadienyl-cation` · Draw arrows · difficulty 1

- **Tags:** Unit 1, Lesson 6 · **Status:** draft
- **Source line:** Adapted from LibreTexts Wade 1-20(a) and its solution
- **Prompt:** "This cation has a C⁺ at the end of a chain of two C=C bonds. Push electrons to move the + charge to C3 (target shown)."
- **Visual:** line-angle chain, every carbon lettered (C1–C5), charge on C5; target dimmed in the strip above.
- **Start:** `[CH2:1]=[CH:2][CH:3]=[CH:4][CH2+:5]` · **Target:** `[CH2:1]=[CH:2][CH+:3][CH:4]=[CH2:5]`
- **Pushes:** π 3–4 → bond 4–5 (move 3, bond → next bond; drop target on the C4–C5 bond).
- **In-between flags:** n/a (one push).
- **Correct line:** "The C3=C4 pair slid toward C5⁺: now C4=C5 and C3 is +. Slide C1=C2 the same way and + lands on C1: the charge is shared by C1, C3 and C5."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 3–4 → C3 or C4 | "That parks the pair on one carbon and leaves two C⁺. Slide the bond toward C5⁺ instead." |
  | π 1–2 → bond 2–3 | "That π bond isn't next to C5⁺. C3 already has a double bond, so it would end up with 10 electrons." |
  | a σ bond | "σ bonds stay put." |
  | *(any other)* | "C5⁺ is the sink. Which π bond sits right next to it?" |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from the C3=C4 π bond to the C4–C5 bond. Now C4=C5 is double and C3 is positive."
- **Source note:** "Adapted from LibreTexts, *Map: Organic Chemistry (Wade)*, §1.16 exercise 1-20(a) and its solution in §1.17, CC BY-NC-SA 4.0. Wording and drawing ours."

### `u1-res-acac-enolate` · Draw arrows (open) · difficulty 2

- **Tags:** Unit 1, Lesson 6 · **Status:** draft
- **Source line:** Adapted from LibreTexts Wade 1-20(f) and its solution
- **Prompt:** "Acetylacetonate, with − on its middle carbon. Push electrons to move the negative charge onto an oxygen. Either oxygen is fine."
- **Visual:** line-angle, C2, C4, C5, both O's lettered, every lone pair drawn; no target strip (open), a chip "Either O".
- **Start:** `[CH3:1][C:2](=[O:3])[CH-:4][C:5](=[O:6])[CH3:7]` · **Accepted results:** {`[CH3:1][C:2]([O-:3])=[CH:4][C:5](=[O:6])[CH3:7]`, `[CH3:1][C:2](=[O:3])[CH:4]=[C:5]([O-:6])[CH3:7]`}
- **Pushes, any order:** either lone pair on C4 → bond 2–4 (move 1) with π 2–3 → O3 (move 2); or lone pair on C4 → bond 4–5 with π 5–6 → O6. A push is accepted when it is a step toward one of the two results; once one push is made, the other push must belong to the same side.
- **In-between flags:**
  - lone pair first: orange ring on C2 (or C5), "C has 10 e⁻: something has to leave. Both arrows happen at once, so this halfway drawing isn't a real structure."
  - π bond first: orange ring on C2 (or C5), "C has only 6 e⁻. This halfway drawing isn't real either. Fill the gap."
- **Correct line:** "The charge moved from C4 onto an oxygen, the acetate pattern again. Drawn either way, the − is shared by both O's and the middle carbon."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 2–3 → C2 (or π 5–6 → C5) | "Oxygen is the electronegative sink. Pull the π pair toward O, not C." |
  | lone pair on O3 or O6 → its carbon | "That oxygen has no charge to give. Start from C4, the carbon with the − charge." |
  | second push on the other side (e.g. lone pair C4 → bond 2–4, then π 5–6 → O6) | "The pair that came into C2 has to push out the C2=O3 pair, the one on the same side." |
  | a σ bond | "σ bonds stay put." |
  | *(any other)* | "One pair in from C4 to make a C=C; one pair out of the C=O beside it, onto O." |

- **Reveal / success Scene:** `push-replay` (on reveal, the O3 side). Screen reader: "Arrow from the lone pair on the middle carbon into the C–C bond on its left; arrow from that C=O π bond onto the oxygen. The negative charge is now on oxygen and the double bond is C=C."
- **Source note:** "Adapted from LibreTexts, *Map: Organic Chemistry (Wade)*, §1.16 exercise 1-20(f) and its solution in §1.17, CC BY-NC-SA 4.0. Wording and drawing ours. Parent: acetylacetone, PubChem CID 31261."

### `u1-res-phenoxide-para` · Draw arrows · difficulty 3

- **Tags:** Unit 1, Lesson 6 · **Status:** draft
- **Source line:** Adapted from LibreTexts Wade 1-20(b) and its solution
- **Prompt:** "Phenoxide, phenol without its H⁺. Push electrons to move the negative charge from O to the ring carbon **opposite** it (target shown). It takes three arrows."
- **Visual:** the ring as a Kekulé hexagon with O⁻ on top, O and every ring carbon lettered (C2 bonded to O, C3 → C7 around the ring), every lone pair drawn; target dimmed in the strip above.
- **Start:** `[O-:1][C:2]1=[CH:3][CH:4]=[CH:5][CH:6]=[CH:7]1` · **Target:** `[O:1]=[C:2]1[CH:3]=[CH:4][CH-:5][CH:6]=[CH:7]1`
- **Pushes, any order:** lone pair on O1 → bond 1–2 (move 1); π 2–3 → bond 3–4 (move 3); π 4–5 → C5 (move 2).
- **In-between flags:** any atom over 8 e⁻: "<atom> would have 10 e⁻. Something has to leave." Any carbon at 6 e⁻: "<atom> has only 6 e⁻. Not a real structure, keep going." (No partial state of this push set is a reasonable contributor, so every in-between gets one of these two flags.)
- **Correct line:** "The charge travelled from O through the ring to the far carbon. With the other two contributors (− on either carbon next to C2), phenoxide's − is shared by O and three ring carbons."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 2–3 → C3 | "That puts − on the carbon next to C2. It's a real contributor, but the target puts − on the carbon opposite O. Slide the bond on instead." |
  | π 6–7 → anything | "Start where O's pair arrives: at C2. Follow the π bonds away from it, C2=C3 first." |
  | π 2–3 → C2 or π 4–5 → C4 | "Electrons move away from where the new pair arrives, toward the target carbon." |
  | a σ bond, ring bonds included | "σ bonds stay put, ring bonds included. Only O's lone pair and the ring's π bonds move." |
  | *(any other)* | "Follow the chain: O's lone pair → the O–C2 bond; C2=C3 → C3–C4; C4=C5 → onto C5." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from a lone pair on oxygen into the O–C bond; arrow from the C2=C3 π bond to the C3–C4 bond; arrow from the C4=C5 π bond onto C5. Result: C=O at the top and a negative charge on the ring carbon opposite it."
- **Source note:** "Adapted from LibreTexts, *Map: Organic Chemistry (Wade)*, §1.16 exercise 1-20(b) and its solution in §1.17, CC BY-NC-SA 4.0. Wording and drawing ours. Parent: phenol, PubChem CID 996."

---

## Lesson 7: Resonance: Which Contributor Wins

### `u1-res-nitromethane-equal` · Multiple choice (structure cards) · difficulty 1

- **Tags:** Unit 1, Lesson 7 · **Status:** draft
- **Source line:** Original (nitromethane from MIT 5.12 Lecture 1 p. 17, as in Lesson 6)
- **Prompt:** "Nitromethane's two contributors from Lesson 6. Which one is major?"
- **Visual:** [CH₃–N⁺(=O)–O⁻ ↔ CH₃–N⁺(–O⁻)=O] as structure cards, full Lewis, all lone pairs.
- **Interaction:** pick one. `a` the one with the upper O double-bonded · `b` the one with the lower O double-bonded · `c` they count equally
- **Answer:** {c}
- **Correct line:** "Run the rules: both have full octets, two charges, − on O, and the charges side by side. A tie on every rule, because the two drawings differ only in which O is which. Equal weight, so both N–O bonds are the same in the hybrid."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` or `b` | "Go rule by rule: octets, number of charges, where − sits, how close the charges are. Does any rule tell them apart?" |
  | *(any other)* | "Compare the two drawings on all four rules." |

- **Reveal:** `c`, with each rule ticked "tie" for both cards: "Same drawing, mirrored. Equal weight."
- **Scene:** n/a.
- **Source note:** "Nitromethane from MIT OCW 5.12, Lecture 1 p. 17, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Rules adapted from Lecture 2 p. 4. Nitromethane, PubChem CID 6375."

### `u1-res-rank-fulminic` · Rank / order · difficulty 2

- **Tags:** Unit 1, Lesson 7 · **Status:** draft
- **Source line:** Adapted from LibreTexts Wade 1-22 and its solution
- **Prompt:** "Fulminic acid, HCNO, has three contributors. Drag them into order, most important at the top."
- **Visual:** three structure cards, full Lewis, all lone pairs, shown in the order `c`, `b`, `a`:
  - `a` `[CH:1]#[N+:2][O-:3]` (H–C≡N⁺–O⁻)
  - `b` `[CH-:1]=[N+:2]=[O:3]` (H–C⁻=N⁺=O)
  - `c` `[CH+:1]=[N:2][O-:3]` (H–C⁺=N–O⁻)
- **Interaction:** drag cards (keyboard: focus a card, arrow keys move it), then Check.
- **Answer:** `a`, `b`, `c` (top to bottom).
- **Correct line:** "Every card has two charges, so rule 2 never decides. Rule 1 drops `c` to the bottom: its carbon has only 6 electrons. `a` and `b` both have full octets; rule 3 puts − on O above − on C."
- **Hints:** (first match wins)

  | Wrong order | Hint |
  |---|---|
  | `c` above `a` or `b` | "Count the electrons on carbon in `c`: two bonds' worth to N, one to H, no lone pair. Six. Rule 1 puts both full-octet cards above it." |
  | `b` above `a` | "`a` and `b` tie on rules 1 and 2. Rule 3: which atom holds the − better, O or C?" |
  | *(any other)* | "Count charges first: they're all two. So test octets, then where − sits." |

- **Reveal:** the correct order, each card tagged with its deciding rule ("rule 1: octets ✓, rule 3: − on O", "rule 1: octets ✓, rule 3: − on C", "rule 1: 6-e⁻ C").
- **Scene:** n/a.
- **Source note:** "Adapted from LibreTexts, *Map: Organic Chemistry (Wade)*, §1.16 exercise 1-22 and its solution in §1.17 (contributors `a` and `c`), CC BY-NC-SA 4.0; contributor `b` and the ranking are ours. Fulminic acid, PubChem CID 521293."

### `u1-res-iminium-sites` · Tap-to-identify · difficulty 3

- **Tags:** Unit 1, Lesson 7 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS2 Q1 and its key
- **Prompt:** "This iminium ion has a C=N⁺ next to a ring C=C. Tap every **carbon** that some resonance contributor draws with a **+** (δ+ in the hybrid), then press Check. Just tap, no pushing on this Problem."
- **Tap-only cue:** idle callout "Just tap, no pushing on this Problem." A drag shows "No pushing here: picture the pushes, then tap the carbons they make electron-poor."
- **Visual:** `[CH3:1][N+:2]([CH3:3])=[C:4]1[CH:5]=[CH:6][CH2:7][CH2:8][CH2:9]1`, line-angle, as in PS2 Q1: the six-membered ring with the exocyclic C=N⁺(CH₃)₂ and one ring C=C next to it. N, C4, C5 and C6 lettered. Tappable: N2, C1, C3, C4–C9 (≥48 px hit areas).
- **Answer:** {C4, C6}
- **Correct line:** "Push the C=N π pair onto N: + lands on C4. Slide the ring's C5=C6 toward C4⁺: + lands on C6. Both minor drawings mark δ+ carbons, the two places an electron source can attack."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes C5 | "No reasonable contributor puts + on C5. When the ring C=C slides toward C4, which end is left short?" |
  | includes N2 | "The question asks for carbons. N is drawn + in the major contributor, but it has a full octet; the electron-poor spots are carbons." |
  | includes C1 or C3 | "The methyl carbons have only σ bonds; they're not in the π system." |
  | includes C7, C8 or C9 | "Those ring corners have only σ bonds. Look at the carbons in the C=N and C=C." |
  | only C4 | "That's one. Now slide the ring C=C toward C4⁺: where does + land?" |
  | only C6 | "That's one. The carbon bonded to N is drawn + as soon as the C=N pair moves onto N." |
  | *(any other)* | "Push C=N's π pair onto N, then slide the C=C toward the new C⁺. Every carbon drawn + is δ+." |

- **Reveal:** `push-replay` twice in a strip: π 2–4 → N2 (result `[CH3:1][N:2]([CH3:3])[C+:4]1[CH:5]=[CH:6][CH2:7][CH2:8][CH2:9]1`), then π 5–6 → bond 4–5 (result `[CH3:1][N:2]([CH3:3])[C:4]1=[CH:5][CH+:6][CH2:7][CH2:8][CH2:9]1`); then C4 and C6 ringed and labelled "δ+".
- **Scene:** `push-replay` (reveal). Screen reader: "Arrow from the C=N π bond onto nitrogen: the carbon bonded to nitrogen is now positive. Arrow from the ring C=C π bond into the bond toward that carbon: the positive charge moves two carbons around the ring. Those two carbons are δ+."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 2 Q1 and its key (which circles the same two carbons), Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours."

---

## Lesson 8: Molecular Orbitals: Why Electrons Flow

### `u1-mo-h2-cation` · Multiple choice · difficulty 1

- **Tags:** Unit 1, Lesson 8 · **Status:** draft
- **Source line:** Original
- **Prompt:** "H₂⁺ is H₂ with one electron removed. What is its bond order?"
- **Visual:** a mini `mo-filler` diagram, empty (two 1s levels, σ and σ\*, "not to scale"), with the formula and its electron count: "H₂⁺: 1 e⁻".
- **Interaction:** pick one. `a` 0 · `b` ½ · `c` 1 · `d` 2
- **Answer:** {b}
- **Correct line:** "One electron, in σ: (1 − 0) ÷ 2 = ½. Half a bond is still a bond."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "The one electron goes into the lowest level, σ, the bonding orbital. Nothing cancels it." |
  | `c` | "Bond order 1 needs a full pair in σ. H₂⁺ has only one electron." |
  | `d` | "Bond order counts bonding minus antibonding electrons, then halves it. There's only one electron here." |
  | *(any other)* | "Fill from the bottom, then bond order = (bonding − antibonding) ÷ 2." |

- **Reveal:** the mini diagram fills: one half-arrow in σ, "(1 − 0) ÷ 2 = ½".
- **Scene:** n/a (static mini diagram; screen reader: "H₂ plus: one electron in sigma, none in sigma star. Bond order one half.").
- **Source note:** "Bond order from bonding and antibonding electrons: facts as in OpenStax *Organic Chemistry* §1.11, CC BY-NC-SA 4.0; wording ours. The diagram is schematic, not to scale."

### `u1-mo-alcl3-chloromethane` · Draw arrows · difficulty 2

- **Tags:** Unit 1, Lesson 8 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS1 Q16b (its first step)
- **Prompt:** "Aluminium sits right below boron, so AlCl₃ is short of an octet just like BF₃. It meets chloromethane, CH₃Cl. Push electrons from the HOMO into the LUMO (target shown)."
- **Visual:** chloromethane and AlCl₃, full Lewis, every lone pair drawn, Al's count shown beside it ("Al: 6 e⁻"); no orbital labels; target dimmed in the strip above on narrow screens, side by side on wide ones.
- **Start:** `[CH3:1][Cl:2].[Al:3]([Cl:4])([Cl:5])[Cl:6]` · **Target:** `[CH3:1][Cl+:2][Al-:3]([Cl:4])([Cl:5])[Cl:6]`
- **Pushes:** any lone pair on Cl2 → Al3 (a new bond between the molecules; Cl2's three lone pairs give the same result). **Drop target:** a dashed spot in the gap between Cl2 and Al3, on Al's side.
- **In-between flags:** n/a (one push).
- **Correct line:** "A lone pair on chloromethane's Cl, its highest filled orbital, fills aluminium's empty p orbital, AlCl₃'s LUMO. A new Cl–Al bond: Cl now shares a pair it used to own (Cl⁺), Al gains a share (Al⁻), and Al has eight."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | lone pair on Cl4, Cl5 or Cl6 → Al3 | "Those chlorines already belong to AlCl₃. The new bond joins the two molecules: start on chloromethane's Cl." |
  | the C1–Cl2 bond → anywhere | "σ bonds sit low. Chloromethane's highest filled orbital is a lone pair on Cl." |
  | an Al–Cl bond → anywhere | "That moves electrons away from aluminium, the atom that's short. Flow goes *into* aluminium." |
  | lone pair on Cl2 → C1 | "Carbon already has eight and no empty orbital. The empty one is on Al." |
  | *(any other)* | "Tail on a lone pair of chloromethane's Cl; head on aluminium's empty orbital." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from a lone pair on chloromethane's chlorine to aluminium. Result: a chlorine–aluminium bond; that chlorine is positive, aluminium negative, aluminium with eight electrons."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q16b, Berkowski, Spring 2005, CC BY-NC-SA 4.0 (the first step only; what happens next belongs to a later Unit). Wording ours. Structures: PubChem CIDs 6327, 24012."

### `u1-mo-empty-orbital` · Multiple choice (multi-correct) · difficulty 3

- **Tags:** Unit 1, Lesson 8 · **Status:** draft
- **Source line:** Adapted from MIT 5.12 PS2 Q4 and its key
- **Prompt:** "Which of these can take a lone pair into an empty orbital on one atom, the way BF₃ does? Pick all that apply."
- **Interaction:** five structure cards, full Lewis, all lone pairs.
  - `a` NH₃ (`N`, CID 222)
  - `b` BBr₃ (`BrB(Br)Br`, CID 25134)
  - `c` the tert-butyl cation, (CH₃)₃C⁺ (`C[C+](C)C`)
  - `d` tert-butyl chloride, (CH₃)₃C–Cl (`CC(C)(C)Cl`, CID 10486)
  - `e` H₂O (`O`, CID 962)
- **Answer:** {b, c}
- **Correct line:** "BBr₃ and the tert-butyl cation each have an atom with only six electrons and an empty p orbital: a low LUMO on one atom. NH₃, H₂O and tert-butyl chloride are the other kind: their HOMO is a lone pair to give."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `a` or `e` | "Count the electrons around N (or O): eight, with a lone pair. That lone pair is something to give, not room to take." |
  | includes `d` | "Every atom in tert-butyl chloride has an octet. Its Cl's lone pairs are a source, like chloromethane's Cl meeting AlCl₃." |
  | misses `b` | "Boron again, with three Br's instead of three F's: still six electrons on B, still an empty p orbital." |
  | misses `c` | "Count the electrons on the + carbon: three bonds, no lone pair, six. Like boron, it has an empty p orbital (three groups, sp², one p left over, Lesson 4)." |
  | *(any other)* | "Look for an atom with only six electrons around it. That atom's empty p orbital is the LUMO." |

- **Reveal:** `b` and `c` ticked, each with its six-electron atom ringed and a dashed two-lobe outline labelled "empty p (LUMO)"; `a`, `d`, `e` tagged "lone pair to give (HOMO)".
- **Scene:** n/a. Screen reader for the reveal: "Boron tribromide and the tert-butyl cation each have an atom with six electrons and an empty p orbital. Ammonia, water and tert-butyl chloride each have lone pairs to give."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 2 Q4 and its key, Berkowski, Spring 2005, CC BY-NC-SA 4.0 (H–Cl from the original is left out: it takes electrons into an antibonding orbital, not an empty p, which this Unit doesn't teach). Wording ours. Structures: PubChem CIDs 222, 25134, 10486, 962."
