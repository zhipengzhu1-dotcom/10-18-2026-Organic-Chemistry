# Lesson 2: Drawing Molecules

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md). Decided in [Specify Lesson 2: Drawing Molecules](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/23).

## Shape checks

- [x] 15 Steps: Hook 1, Build 9, Check 4, Wrap 1
- [x] Explain Steps at 2, 4, 7, 15, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Every chemistry number points at pipeline output with a Source note; none typed here. The only numbers in this Lesson are counts (carbons, hydrogens, lone pairs), and every H count is checked against the PubChem formula at build time (see Data notes)
- [x] No computed numbers in this Lesson
- [x] No Tap-to-identify Step sits among Draw-arrows Steps (this Lesson has no Draw-arrows Steps)
- [x] Nothing taken from the Moore-credited slides (Lecture 1 p. 10, p. 11 upper slide "Boron") or from PS1 Q7/Q14

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l02` |
| Title | Drawing Molecules |
| Goal | Convert between Lewis, Kekulé and line-angle drawings, and put back the hydrogens and lone pairs a line-angle drawing leaves out. |
| Prerequisites | Lesson 0 (electron-dot drawings, the octet, carbon makes 4 bonds), Lesson 1 (the neutral bonding-pattern table: C 4 bonds; N 3 + 1 lone pair; O 2 + 2; halogen 1 + 3; charged atoms are always marked) |
| Key idea | Every end and corner is a carbon with enough H's to make four bonds; every other atom is written out; lone pairs follow the bonding pattern. |
| Check Problems | `u1-draw-n2-kekule`, `u1-draw-acrylonitrile`, `u1-draw-acetaminophen-lone-pairs`, `u1-draw-limonene-h` |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 1 p. 11 lower slide ("Organic Structures: Summary (so far)": ethanol as Lewis and as Kekulé), p. 12 upper slide ("Representing Molecules: Line-Angle Formula": the idea of a full drawing beside its line-angle drawing, estradiol among the examples), p. 12 lower slide ("Rules of Drawing Line-Angle Formulas": the rules, the isopropanol and cyclohexanone examples, the "drawn wrong" ethanol idea, "always show all lone pairs"); Problem Set 1 Q3a with the key (N₂). All wording is ours. Structures and formulas: PubChem (CIDs per Step). **Excluded:** Lecture 1 p. 10 and p. 11 upper slide (Moore-credited), PS1 Q7 and Q14. Lecture 1 p. 13 (3-D, wedges) belongs to Lesson 3. |
| Structure drawing | Three styles, all drawn by the site's own renderer (RDKit.js parses and lays out, never draws). **Lewis:** every atom a letter, every valence electron a cyan dot, shared pairs drawn as dots between the two atoms, no lines. **Kekulé:** every atom a letter (every C and every H), each shared pair a line, every lone pair as cyan dots. **Line-angle:** carbons are ends and corners with no letter and no H; every other atom is a letter with its own H's (OH, NH, NH₂); a terminal carbon may be written as CH₃ (s09 only); double and triple bonds as 2 and 3 lines; benzene-type rings with alternating lines; every lone pair as cyan dots. **Lone-pairs-hidden exception:** s10 and `u1-draw-acetaminophen-lone-pairs` draw line-angle without lone pairs, because supplying them is the task; those drawings carry a chip "Lone pairs hidden", and their reveal draws every pair. Estradiol (s01, s15) is Lesson 0's s06 drawing (same orientation, wedges and stereo H's) plus the lone pairs on both O. Structure cards follow the same rules. Every card has a screen-reader label, given with its Step. |

### New Scenes

All three are watch-only, so each is a **silent, plain Manim CE render** (16:9 and 9:16, 30 fps, no editing pass), decided in [Prototype: Specify Lesson 0](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/31). Manim does not draw molecules itself: it imports the SVG the site's renderer exports for that molecule, so a Scene's frames match the Step's drawing exactly. The last frame is the reduced-motion poster (shown paused with Play).

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `h-fill` | s01 reveal, s06 reveal and success, s15, `u1-draw-limonene-h` reveal | A line-angle drawing fills in. Carbon by carbon (in a fixed order), each corner gets its C letter, a small label "n bonds → 4 − n H" appears beside it, and that many H's pop on. A counter "H: n" in JetBrains Mono ticks up with each H, starting from the H's already drawn. Ends on the full Kekulé drawing. | `molecule: estradiol \| cyclohexanone \| limonene` | the molecule's SMILES; `data/pubchem/<cid>.json` (formula, for the build check) | the full Kekulé drawing with every H and the final count |
| `ethanol-three-ways` | s02 (stage 1), s04 (stage 2) | Ethanol, three ways. Stage 1: the Lewis drawing; each pair of dots between two atoms stretches into a line, lone-pair dots on O stay: Kekulé. Stage 2: the five C–H lines and the two C letters fade out, leaving a two-line zigzag ending in OH with its lone pairs: line-angle. | `stage: 1 \| 2 \| all` | none | the three drawings in a row (stacked on phones), labelled Lewis, Kekulé, line-angle |
| `lone-pair-fill` | s07, s10 reveal, `u1-draw-acetaminophen-lone-pairs` reveal | A line-angle drawing marked "Lone pairs hidden". Atom by atom, each N, O or halogen lights, a label reads its pattern ("O, 2 bonds → 2 lone pairs"), and the pairs appear as cyan dots. The chip changes to "Lone pairs shown". | `molecule: pattern-strip \| acetamide \| acetaminophen` (`pattern-strip` = ethanol, ethylamine and chloroethane side by side) | none | every lone pair drawn, labels shown |

**Data notes**

- **H counts:** every hydrogen count in this Lesson (s01, s06, `u1-draw-limonene-h`) is a count, stated in the spec. **Sanity check at build time:** the pipeline counts H's from each SMILES with RDKit and compares the total with the molecular formula fetched from PubChem (`data/pubchem/<cid>.json`); a mismatch fails the build. Expected: estradiol (CID 5757) 24, cyclohexanone (CID 7967) 10, limonene (CID 22311) 16, acetaminophen (CID 1983) 9.
- **Lone-pair counts** (s10, `u1-draw-acetaminophen-lone-pairs`) are checked the same way: the pipeline derives each neutral heteroatom's lone pairs from its valence and bond count, and fails the build if a drawing's pairs disagree.
- No lengths, angles or energies appear in this Lesson.

---

## Steps

### `u1-l02-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "Lesson 0's estradiol again. The drawing shows only a handful of its hydrogens. How many does the molecule really have?"
- **Visual:** estradiol line-angle (`C[C@]12CC[C@H]3[C@@H](CCc4cc(O)ccc34)[C@@H]1CC[C@@H]2O`, PubChem CID 5757), drawn exactly as in Lesson 0 s06, plus the lone pairs on both O.
- **Interaction:** pick one. `a` just the ones you can see · `b` about 10 · `c` about 25 · `d` about 50
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `h-fill` (`estradiol`). "**24.** The drawing leaves most of them out, on purpose: every one can be worked out from the corners. By the end of this Lesson you'll find them all without seeing them."
- **Scene:** `h-fill` plays on reveal. Screen reader: "Estradiol's line drawing fills in. Each corner becomes a carbon, and each carbon gains enough hydrogens to make four bonds. The counter ends at 24 hydrogens."
- **Source note:** "Estradiol, PubChem CID 5757 (formula C₁₈H₂₄O₂). Full drawing beside line drawing after MIT OCW 5.12, Lecture 1 p. 12, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l02-s02` · Build · Explain

- **Prompt:** "In Lesson 0 you drew molecules with dots: every outer electron is a dot, and a shared pair sits between its two atoms. That's a **Lewis structure**.
  A **Kekulé structure** swaps each shared pair for a line. **One line = one bond = 2 electrons.** Two lines are a double bond, three a triple. Lone pairs stay as dots.
  (Many books call both of these 'Lewis structures'. The idea is the same.)"
- **Visual / Scene:** `ethanol-three-ways` (`stage: 1`), autoplays once. Screen reader: "Ethanol drawn with dots: two carbons, an oxygen, six hydrogens. Each pair of dots between two atoms stretches into a line. The two pairs of dots on oxygen that aren't shared stay as dots. That's the Kekulé structure."
- **Source note:** "Ethanol as Lewis and Kekulé structures, after MIT OCW 5.12, Lecture 1 p. 11, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Ethanol: PubChem CID 702."

### `u1-l02-s03` · Build · Multiple choice (structure cards)

- **Prompt:** "This is formaldehyde as a Lewis structure. Which card is its Kekulé structure?"
- **Visual:** formaldehyde Lewis: H : C :: O with two lone pairs on O, all as dots (`C=O`, PubChem CID 712).
- **Interaction:** four structure cards, one correct.
  - `a` H₂C=O, two lone pairs on O (label: "C double-bonded to O; O has two lone pairs")
  - `b` H₂C–O, two lone pairs on O (label: "C single-bonded to O; O has two lone pairs")
  - `c` H₂C=O, no lone pairs (label: "C double-bonded to O; no lone pairs")
  - `d` H₂C=O, two lone pairs on O and one on C (label: "C double-bonded to O; two lone pairs on O, one on C")
- **Answer:** {a}
- **Correct line:** "Four dots between C and O are two shared pairs, so two lines. O's other four dots stay as two lone pairs."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Count the dots between C and O: four. That's two shared pairs, so two lines." |
  | `c` | "Only shared pairs turn into lines. O's unshared dots stay on the drawing." |
  | `d` | "Look at the carbon in the dot drawing. Every one of its dots is shared, so it has no lone pair." |
  | *(any other)* | "Every pair of dots between two atoms becomes one line. Every other pair stays as dots." |

- **Reveal:** `a` highlighted, its two lines and two lone pairs ringed in cyan, with a one-line note on each wrong card ("lost a bond", "lost the lone pairs", "invented a lone pair").
- **Source note:** "Formaldehyde, PubChem CID 712."

### `u1-l02-s04` · Build · Explain

- **Prompt:** "Kekulé drawings get crowded fast. A **line-angle** drawing (also called skeletal) keeps only what you can't work out:
  • Every **end** and every **corner** of a line is a carbon. Its C isn't written.
  • H's on carbon aren't drawn. Each carbon has **enough H's to make 4 bonds**.
  • Every other atom (O, N, Cl…) is written as a letter, **with its own H's**: OH, NH₂.
  • Double and triple bonds are 2 and 3 lines.
  On AstraTron every lone pair is drawn too."
- **Visual / Scene:** `ethanol-three-ways` (`stage: 2`), autoplays once. Screen reader: "Ethanol's Kekulé structure loses its five C–H bonds and its two C letters. What's left is a zigzag of two lines ending in O H, with oxygen's two lone pairs. Both carbons are now just the end and the corner of the zigzag."
- **Source note:** "Rules adapted from MIT OCW 5.12, Lecture 1 p. 12, 'Rules of Drawing Line-Angle Formulas', Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l02-s05` · Build · Tap-to-identify

- **Prompt:** "Cyclohexanone, as a line-angle drawing. Tap every carbon, then press Check."
- **Visual:** cyclohexanone (`O=C1CCCCC1`, PubChem CID 7967), a hexagon with =O on the top corner, O with its two lone pairs. Tappable: the six ring corners (each a ≥48 px hit area centred on the corner) and the O.
- **Answer:** {the six ring corners}.
- **Correct line:** "Six corners, six carbons, including the one under the C=O."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes O | "A letter means that atom. O is oxygen. Only bare ends and corners are carbons." |
  | misses the corner bonded to O | "The corner holding the =O is a carbon too. The C=O line has a carbon at its lower end." |
  | misses any other corner | "Every corner counts, even ones with nothing attached." |
  | *(any other)* | "Find every place where two lines meet, or a line ends without a letter." |

- **Reveal:** each corner gets a cyan C letter, one by one, counting to 6.
- **Source note:** "Cyclohexanone after MIT OCW 5.12, Lecture 1 p. 12, CC BY-NC-SA 4.0. PubChem CID 7967."

### `u1-l02-s06` · Build · Numeric input

- **Prompt:** "Same molecule. None of its hydrogens are drawn. How many H's does cyclohexanone have in all?"
- **Visual:** cyclohexanone line-angle, as in s05.
- **Interaction:** number pad; the unit "H atoms" shows beside the box.
- **Answer:** 10 H atoms, ±0.
- **Correct line:** "Five CH₂ corners give 10. The C=O carbon already has four bonds (two ring bonds plus a double bond), so it gets none."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 12 | "Check the carbon under the =O. It has two ring bonds and a double bond: that's already 4." |
  | 6 | "Not one per carbon. Each corner with two ring bonds needs two more bonds, so two H's." |
  | 0 | "None are drawn, but they're there. Each carbon fills up to 4 bonds with H's." |
  | 11 | "Close. The C=O carbon has no H's, and each other corner has exactly two." |
  | *(any other)* | "For each corner: 4 minus the bonds you can see is the number of H's. Then add them up." |

- **Reveal:** Scene `h-fill` (`cyclohexanone`).
- **Scene:** `h-fill` plays on reveal and on success. Screen reader: "Cyclohexanone fills in. The carbon bonded to oxygen has four bonds already and gets no hydrogens. Each of the other five carbons has two bonds and gains two hydrogens. Total: 10 hydrogens."
- **Source note:** "Cyclohexanone, PubChem CID 7967 (formula C₆H₁₀O)."

### `u1-l02-s07` · Build · Explain

- **Prompt:** "Lone pairs are often left out too. **Most books and exams draw line-angle structures without them**, and expect you to put them back.
  You already know how, from Lesson 1's bonding patterns: a neutral **O** with 2 bonds has **2** lone pairs; **N** with 3 bonds has **1**; a **halogen** with 1 bond has **3**; **C** with 4 bonds has none.
  A charged atom is always marked with its charge, and formal charge tells you its lone pairs."
- **Visual / Scene:** `lone-pair-fill` (`pattern-strip`), autoplays once. Screen reader: "Three line drawings with their lone pairs hidden: ethanol, ethylamine and chloroethane. Oxygen with two bonds gains two lone pairs. Nitrogen with three bonds gains one. Chlorine with one bond gains three."
- **Source note:** "'Always show all lone pairs' after MIT OCW 5.12, Lecture 1 p. 12, CC BY-NC-SA 4.0. Ethanol CID 702, ethylamine CID 6341, chloroethane CID 6337."

### `u1-l02-s08` · Build · Multiple choice (structure cards) (signature)

- **Prompt:** "Here's a Kekulé structure. Which card is the same molecule as a line-angle drawing?"
- **Visual:** acetone Kekulé, H₃C–C(=O)–CH₃ with every H, two lone pairs on O (`CC(C)=O`, PubChem CID 180).
- **Interaction:** four line-angle structure cards, one correct, every lone pair drawn.
  - `a` a V of two lines with =O on the middle corner (acetone) (label: "three carbons in a V; oxygen double-bonded to the middle carbon")
  - `b` a zigzag of two lines ending in =O on the last carbon (propanal, `CCC=O`, CID 527) (label: "three carbons in a zigzag; oxygen double-bonded to the end carbon")
  - `c` a V of two lines with OH on the middle corner (2-propanol, `CC(C)O`, CID 3776) (label: "three carbons in a V; OH single-bonded to the middle carbon")
  - `d` a zigzag of three lines with =O on the second carbon (2-butanone, `CCC(C)=O`, CID 6569) (label: "four carbons in a zigzag; oxygen double-bonded to the second carbon")
- **Answer:** {a}
- **Correct line:** "Three carbons, the O double-bonded to the middle one. The two CH₃ ends and their six H's are all implied."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Which carbon holds the O in the Kekulé drawing? The middle one, not an end." |
  | `c` | "Count the lines between C and O in the Kekulé drawing: two. An OH is a single bond, a different molecule." |
  | `d` | "Count carbons on the card: every end and every corner. The Kekulé structure has 3." |
  | *(any other)* | "Match three things: how many carbons, which carbon holds the O, and single or double." |

- **Reveal:** `a` highlighted, its carbons numbered 1–3 against the Kekulé carbons, with one line on each wrong card ("O on the end", "OH, not =O", "four carbons").
- **Source note:** "Acetone CID 180, propanal CID 527, 2-propanol CID 3776, 2-butanone CID 6569."

### `u1-l02-s09` · Build · Multiple choice (structure cards)

- **Prompt:** "Three of these are correct drawings of ethanol. Which one is drawn **wrong**?"
- **Interaction:** four structure cards, one correct.
  - `a` a zigzag of two lines ending in OH, right-hand end (label: "two-line zigzag, OH on the right end")
  - `b` the same zigzag flipped, HO on the left end (label: "two-line zigzag, HO on the left end")
  - `c` H₃C written at one end, a line to a bare corner, a line to OH (label: "H₃C, then a corner, then OH")
  - `d` HO, a line to a corner labelled C with nothing else on it, a line to CH₃ (label: "HO, then a letter C with no hydrogens, then CH₃")
- **Answer:** {d}
- **Correct line:** "If you write a carbon's C, you must write its H's too: CH₂. A bare C letter reads as a carbon with only two bonds."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "That's the standard drawing: an end, a corner, then OH. Look for one that breaks a rule." |
  | `b` | "Flipping a drawing doesn't change the molecule. HO and OH are the same group." |
  | `c` | "Writing CH₃ at an end is allowed: it's a carbon with its H's spelled out. Look for a C written *without* its H's." |
  | *(any other)* | "Rule check: an unlabelled corner gets implied H's. A written C does not, so its H's must be written too." |

- **Reveal:** `d` marked "C written, H's missing", with the fix beside it (HO–CH₂–CH₃ as a line, or the plain zigzag).
- **Source note:** "The 'drawn wrong' idea after MIT OCW 5.12, Lecture 1 p. 12, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Ethanol: PubChem CID 702."

### `u1-l02-s10` · Build · Numeric input

- **Prompt:** "Acetamide, drawn the way most books do: no lone pairs. How many lone pairs does it have in all?"
- **Visual:** acetamide line-angle (`CC(N)=O`, PubChem CID 178), with the chip "Lone pairs hidden": a line to a corner with =O up and NH₂ down.
- **Interaction:** number pad; the unit "lone pairs" shows beside the box.
- **Answer:** 3 lone pairs, ±0.
- **Correct line:** "O with 2 bonds: 2 lone pairs. N with 3 bonds: 1. Carbons: none. That's 3."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 2 | "That's the oxygen. The nitrogen has a lone pair too: N with 3 bonds keeps 1." |
  | 4 | "Count N's bonds: one to carbon, two to its H's. Three bonds leave room for just one lone pair." |
  | 1 | "O with two bonds (one double bond) still has 2 lone pairs." |
  | 5 | "Carbons with four bonds have no lone pairs. Only O and N carry them here." |
  | *(any other)* | "Use the patterns: O with 2 bonds → 2 lone pairs, N with 3 bonds → 1." |

- **Reveal:** Scene `lone-pair-fill` (`acetamide`). Screen reader: "Oxygen, two bonds, gains two lone pairs. Nitrogen, three bonds, gains one. Three lone pairs in all."
- **Source note:** "Acetamide, PubChem CID 178."

### `u1-l02-s11` … `s14` · Check

The four Check Problems below, in order.

### `u1-l02-s15` · Wrap · Explain (big-statement card)

- **Prompt:** "**Chemists draw only what you can't work out.**
  Lewis: every electron a dot. Kekulé: every shared pair a line.
  Line-angle: every end and corner is a carbon with enough H's to make 4 bonds; every other atom is written out.
  Lone pairs follow the pattern: O 2, N 1, halogen 3."
- **Scene:** `h-fill` (`estradiol`), final frame. Screen reader: "Estradiol with every carbon and all 24 hydrogens drawn."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Molecules in 3D**, secondary Back to Unit.
- **Source note:** n/a.

---

## Check Problems

Source notes credit "MIT OCW 5.12, Berkowski, Spring 2005, CC BY-NC-SA 4.0" where adapted; structures cite PubChem. Wording is ours.

### `u1-draw-n2-kekule` · Multiple choice (structure cards) · difficulty 1

- **Tags:** Unit 1, Lesson 2 · **Status:** draft · **Source:** PS1 Q3a with the key
- **Prompt:** "Nitrogen gas, N₂. Each N brings 5 outer electrons. Which card is its Kekulé structure?"
- **Interaction:** four structure cards, one correct.
  - `a` N≡N, one lone pair on each N (label: "N triple-bonded to N; one lone pair on each N")
  - `b` N≡N, no lone pairs (label: "N triple-bonded to N; no lone pairs")
  - `c` N=N, two lone pairs on each N (label: "N double-bonded to N; two lone pairs on each N")
  - `d` N≡N, two lone pairs on each N (label: "N triple-bonded to N; two lone pairs on each N")
- **Answer:** {a}
- **Correct line:** "Three bonds plus one lone pair: each N has 8 electrons around it, and the drawing uses all 10."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Count the electrons around one N: just the 6 in the triple bond. It needs an octet." |
  | `c` | "Count all the electrons on the card: 4 in the double bond and 8 in lone pairs is 12, but N₂ has only 10." |
  | `d` | "Count around one N: 6 in the triple bond plus 4 in lone pairs is 10. That's over the octet." |
  | *(any other)* | "Each N needs 8 around it, and the whole drawing has 10 electrons. Lines count 2, each lone pair 2." |

- **Reveal:** `a`, with each N's octet counted: "6 shared + 2 own = 8."
- **Scene:** n/a.
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q3a, Berkowski, Spring 2005, CC BY-NC-SA 4.0. N₂: PubChem CID 947."

### `u1-draw-acrylonitrile` · Multiple choice (structure cards) · difficulty 2

- **Tags:** Unit 1, Lesson 2 · **Status:** draft
- **Prompt:** "Acrylonitrile, used to make acrylic fibres, as a line-angle drawing. Which card is its Kekulé structure?"
- **Visual:** acrylonitrile line-angle (`C=CC#N`, PubChem CID 7855): a double line up to a corner, then one line into a straight triple line ending in N with its lone pair.
- **Interaction:** four Kekulé structure cards, one correct.
  - `a` H₂C=CH–C≡N, one lone pair on N (label: "CH₂ double-bonded to CH, single-bonded to C, triple-bonded to N; one lone pair on N")
  - `b` H₂C=CH–C≡N, no lone pair on N (label: "same bonds; no lone pair on N")
  - `c` H₂C=C–C≡N, the middle C with no H, one lone pair on N (label: "CH₂ double-bonded to a C with no hydrogen, then C triple-bonded to N; one lone pair on N")
  - `d` H₃C–CH₂–C≡N, one lone pair on N (label: "CH₃ single-bonded to CH₂, then C triple-bonded to N; one lone pair on N")
- **Answer:** {a}
- **Correct line:** "Three carbons, three H's: two on the end, one on the corner, none on the carbon in the triple bond."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "N with 3 bonds keeps one lone pair. A Kekulé structure shows it." |
  | `c` | "Count the bonds on the middle carbon: a double bond and a single bond is 3. It needs one H." |
  | `d` | "The drawing has two lines between the first two carbons. That's a double bond, so fewer H's." |
  | *(any other)* | "A triple bond is drawn straight, so the carbon where the single line meets it is easy to miss. Count all three carbons, then give each one 4 bonds." |

- **Reveal:** `a`, with the three carbons numbered on the line drawing and their H's counted (2, 1, 0).
- **Scene:** n/a.
- **Source note:** "Acrylonitrile, PubChem CID 7855 (formula C₃H₃N)."

### `u1-draw-acetaminophen-lone-pairs` · Numeric input · difficulty 2

- **Tags:** Unit 1, Lesson 2 · **Status:** draft
- **Prompt:** "Acetaminophen (paracetamol), the painkiller, with its lone pairs hidden. How many lone pairs does it have in all?"
- **Visual:** acetaminophen line-angle (`CC(=O)Nc1ccc(O)cc1`, PubChem CID 1983), chip "Lone pairs hidden": benzene-type ring with alternating lines, OH on one side, NH on the other leading to C(=O)CH₃.
- **Interaction:** number pad; the unit "lone pairs" shows beside the box.
- **Answer:** 5 lone pairs, ±0.
- **Correct line:** "Two O's with 2 bonds each: 2 + 2. One N with 3 bonds: 1. Total 5."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 4 | "Both oxygens done. Now the N: it has 3 bonds, so it keeps 1 lone pair." |
  | 3 | "There are two oxygens: the =O and the OH. Each has 2 lone pairs." |
  | 6 | "N here has 3 bonds (to two carbons and an H). That leaves 1 lone pair, not 2." |
  | 2 | "Every O and every N gets lone pairs. Find all three of them." |
  | *(any other)* | "Find every O and N. O with 2 bonds → 2 lone pairs, N with 3 bonds → 1." |

- **Reveal:** Scene `lone-pair-fill` (`acetaminophen`). Screen reader: "The carbonyl oxygen gains two lone pairs, the nitrogen one, and the OH oxygen two. Five in all."
- **Source note:** "Acetaminophen, PubChem CID 1983."

### `u1-draw-limonene-h` · Numeric input · difficulty 3

- **Tags:** Unit 1, Lesson 2 · **Status:** draft
- **Prompt:** "Limonene gives oranges their smell. How many hydrogens does it have?"
- **Visual:** limonene line-angle (`CC1=CCC(CC1)C(C)=C`, PubChem CID 22311, drawn without stereo): a six-membered ring with one double bond and a methyl, and a C(=CH₂)CH₃ branch.
- **Interaction:** number pad; the unit "H atoms" shows beside the box.
- **Answer:** 16 H atoms, ±0.
- **Correct line:** "Ring: 0 + 1 + 2 + 1 + 2 + 2. Methyl 3, branch carbon 0, =CH₂ 2, branch methyl 3. Total 16."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 20 | "Both double bonds use up bonds. Each carbon in a C=C has one bond fewer left for H's." |
  | 18 | "Check both double bonds, the one in the ring and the one on the branch. One of them still has too many H's." |
  | 10 | "That's the number of carbons. Now give each one H's until it has 4 bonds." |
  | 15 or 17 | "Off by one. Recheck the ring corner with the branch on it: three ring-and-branch bonds leave room for one H." |
  | *(any other)* | "Go corner by corner: 4 minus the bonds you see. Double bonds count as 2." |

- **Reveal:** Scene `h-fill` (`limonene`). Screen reader: "Limonene fills in, carbon by carbon. The two carbons that already have four bonds to other carbons get none; the other two double-bond carbons get one and two; the ring CH₂ corners two each; the two methyls three each. The counter ends at 16."
- **Source note:** "Limonene, PubChem CID 22311 (formula C₁₀H₁₆)."
