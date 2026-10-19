# Lesson 1: Bonds, Polarity & Formal Charge

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md). Decided in [Specify Lesson 1: Bonds, Polarity & Formal Charge](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/22): the owner settled the scope and order (one Lesson, polarity first, cited electronegativity values, no ΔEN cutoffs, bond dipoles only, BF₃ for boron), then handed the remaining calls to the agent.

## Shape checks

- [x] 14 Steps: Hook 1, Build 9, Check 3, Wrap 1
- [x] Explain Steps at 2, 5, 6, 10, 14: never more than 2 in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Every chemistry number points at pipeline output with a Source note; none typed here (numbers in curly braces are pipeline fields)
- [x] No computed numbers in this Lesson (electronegativities are a cited table)
- [x] No Tap-to-identify Step sits among Draw-arrows Steps (this Lesson has no Draw-arrows Steps)
- [x] Nothing taken from the Moore-credited slides (Lecture 1 p. 8 upper, p. 9 lower, p. 10 both, p. 11 upper): the bonding-pattern table and the boron Step are our own

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l01` |
| Title | Bonds, Polarity & Formal Charge |
| Goal | Say which end of a bond is δ− from electronegativity, rank bonds by polarity, and work out the formal charge on any atom by counting its lone-pair electrons and bonds, spotting structures that can't exist. |
| Prerequisites | Lesson 0 (outer electrons, the octet, a shared pair is a bond, counting electrons around an atom). Not required: Lesson 0 is optional, so s05 restates the octet in one line. |
| Key idea | Shared pairs aren't shared equally: the more electronegative atom is δ−. Each atom has a usual number of bonds and lone pairs; one more or one fewer bond shows up as a formal charge. |
| Check Problems | `u1-bond-polarity-rank`, `u1-fc-oxygen-three-bonds`, `u1-fc-unreasonable` |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 1 p. 8 lower slide ("Electron Configuration and Valence Electrons", filled shell), p. 9 upper slide ("Bonding Possibilities of Main Organic Atoms": lone pair vs 1, 2 or 3 shared pairs; H as the exception); Problem Set 1 Q1 with the key (formal charges, unreasonable configurations). All wording is ours. Electronegativities: Pauling scale, revised values of A. L. Allred, *J. Inorg. Nucl. Chem.* 17, 215 (1961), as tabulated in the CRC Handbook of Chemistry and Physics. **Excluded:** Lecture 1 p. 8 upper, p. 9 lower, p. 10 upper and lower (the three "Bonding Patterns" tables) and p. 11 upper ("Boron"), all "Courtesy of Jeffrey S. Moore … used with permission". OpenStax §2.1–2.3 is not used as a text source (its pages restrict generative-AI use); facts only. |
| Structure drawing | Full Lewis structures (every bond a line, every lone pair as two cyan dots, every atom a letter) for every molecule in this Lesson: they are all small, and counting dots and sticks is the skill. Formal charges are drawn as a circled ⁺/⁻ beside the atom, **except in s08**, where they are hidden because finding them is the task. PS1 Q1 fragments (s12, s13) are single atoms with dangling bond lines, as in the source. Everything uses the site's own renderer. |

### New Scenes

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `stream-bend` | s01 reveal | Watch-only, ~6 s, silent Manim CE render (16:9 and 9:16). Two thin falling streams side by side, labelled "water" and "hexane". A rod charged by rubbing is brought close: the water stream curves toward it, the hexane stream falls straight. No dipole arrows, no mechanism drawn. | `aspect: 9:16 \| 16:9` | none | rod in place, water curved, hexane straight |
| `en-strip` | s02, s03 Hint, s04 reveal | A strip of the periodic table, rows 1–3 plus Br, with H, B, C, N, O, F, Cl, Br lit and their electronegativity printed under the letter; an arrow "increases →" along a row and "↑ increases" up a group. Tap an element to enlarge its value. | `highlight: <element list>` | `data/atoms/electronegativity-pauling.json` | the strip, all values shown |
| `bond-dipoles` | s04 reveal, s11 reveal | The ranked bonds stacked, each with a δ+/δ− label and a crossed arrow (+→) pointing at the δ− atom. The arrow's weight follows the electronegativity difference, labelled "ΔEN {value}" (it is **not** a dipole moment and is never labelled as one). | `bonds: <list of element pairs>` | `data/atoms/electronegativity-pauling.json` | all bonds with arrows and ΔEN labels |
| `dots-and-sticks` | s06, s07 reveal, s12 reveal | One atom in a structure is ringed. Its count builds line by line: "valence {v}", "− lone-pair electrons" (each dot pulses as it is counted), "− bonds" (each stick pulses), "= formal charge". | `molecule`, `atom` | none (counts only) | the finished count beside the structure |
| `bf3-sextet` | s10 | BF₃, full Lewis, F lone pairs drawn. Boron's count runs 2, 4, 6 and stops; an empty dashed slot glows on boron, labelled "room for one more pair". | none | none | BF₃ with the count at 6 and the empty slot |

**Data notes**

- **`data/atoms/electronegativity-pauling.json`:** Pauling-scale values for H, B, C, N, O, F, Cl, Br, each with its source (Allred 1961, via the CRC Handbook table "Electronegativity") and licence. Values are shown to 2 decimals. **Sanity checks at build time:** (1) the ΔEN order of the s04 bonds is C–H < N–H < O–H < C–F; (2) the ΔEN order of the `u1-bond-polarity-rank` bonds is C–H < C–Cl < C–O < O–H; (3) C is above H, so in a C–H bond carbon is the (slightly) δ− end. If a check fails, the Step is rewritten, never the data.
- **`stream-bend` honesty note:** the textbook story that water's dipoles "turn toward the rod" is not the main cause of the bending: most of it comes from charge induced in the stream, which polar liquids allow and nonpolar ones don't (M. Ziaei-Moayyed, E. Goodman and P. Williams, "Electrical Deflection of Polar Liquid Streams: A Misunderstood Demonstration", *J. Chem. Educ.* 77, 1520 (2000)). So the Scene shows the observation only, and the copy says only that polar liquids respond to charge and nonpolar ones barely do.

---

## Steps

### `u1-l01-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "Rub a plastic rod so it picks up a static charge, then hold it next to two thin streams falling from a tap: one of water, one of hexane (a liquid in petrol). What happens?"
- **Visual:** the `stream-bend` poster frame with the rod drawn away from the streams.
- **Interaction:** pick one. `a` both streams bend toward the rod · `b` only the water bends · `c` only the hexane bends · `d` neither bends
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `stream-bend`. "Only the **water** bends. Water's bonds are lopsided: its electrons crowd toward oxygen. Hexane's bonds are almost even. Liquids made of lopsided, **polar** bonds respond to charge. This Lesson is about where that lopsidedness comes from, and what happens when an atom ends up with more or fewer electrons than its share."
- **Scene:** `stream-bend` plays on reveal (reduced motion: poster frame + Play). Screen reader: "A charged rod is held beside two falling streams. The water stream curves toward the rod. The hexane stream falls straight down."
- **Source note:** "Why the stream bends: Ziaei-Moayyed, Goodman and Williams, *J. Chem. Educ.* 77, 1520 (2000)."

### `u1-l01-s02` · Build · Explain

- **Prompt:** "In a bond, two atoms share a pair of electrons, but not always equally. **Electronegativity** is how hard an atom pulls on shared electrons.
  It rises **across** a row toward fluorine and **up** a group. Fluorine pulls hardest of all.
  Carbon and hydrogen are close, so a C–H bond is nearly even. Oxygen pulls far harder than hydrogen."
- **Visual / Scene:** `en-strip` (`highlight: H, B, C, N, O, F, Cl, Br`).
- **Screen reader:** "Electronegativity values: hydrogen {en.H}, boron {en.B}, carbon {en.C}, nitrogen {en.N}, oxygen {en.O}, fluorine {en.F}, chlorine {en.Cl}, bromine {en.Br}. Values rise across a row and up a group."
- **Source note:** "Electronegativity, Pauling scale: A. L. Allred, *J. Inorg. Nucl. Chem.* 17, 215 (1961), via the CRC Handbook of Chemistry and Physics."

### `u1-l01-s03` · Build · Tap-to-identify

- **Prompt:** "The atom that pulls harder gets a small negative charge, **δ−** ('partial minus'); its partner gets **δ+**. In each highlighted bond, tap the **δ−** atom, then press Check."
- **Visual:** four small molecules in a 2 × 2 grid, full Lewis, one bond in each highlighted with a thick outline (not colour alone): H–F (`F`, CID 14917), an O–H bond of water (`O`, CID 962), the C–Cl bond of chloromethane (`CCl`, CID 6327), the C–O bond of methanol (`CO`, CID 887). Tappable: the two atoms of each highlighted bond (hit area ≥ 48 px). The `en-strip` values for the atoms shown are one tap away ("Show values").
- **Answer:** {F of HF, O of water, Cl of chloromethane, O of methanol}: one atom per bond.
- **Correct line:** "F, O, Cl, O: each time the atom further right, or higher up, wins the pull."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | H picked in H–F or O–H | "Hydrogen is a weak puller. Its partner here pulls much harder." |
  | C picked in C–Cl or C–O | "Carbon sits left of O and above Cl, but Cl and O still pull harder. Check the values." |
  | fewer than four atoms picked | "Pick one atom in **each** of the four highlighted bonds." |
  | *(any other)* | "Open the values: the atom with the bigger number is δ−." |

- **Reveal:** δ− and δ+ labels appear on all four bonds, with the two values under each bond.
- **Scene:** n/a. Screen reader for the grid: "Four molecules: hydrogen fluoride, H–F highlighted; water, one O–H highlighted; chloromethane, C–Cl highlighted; methanol, C–O highlighted."
- **Source note:** "Electronegativity: see s02. Structures: PubChem CIDs 14917, 962, 6327, 887."

### `u1-l01-s04` · Build · Rank

- **Prompt:** "The bigger the difference in electronegativity, the more **polar** the bond. Order these bonds from **least** to **most** polar."
- **Visual:** four bond cards: C–H, N–H, O–H, C–F (letters and a line; no values shown, `en-strip` one tap away).
- **Interaction:** drag to order (keyboard: Tab to a card, Space to lift, arrows to move, Space to drop).
- **Answer:** C–H, N–H, O–H, C–F.
- **Correct line:** "C–H is nearly even, and C–F is the most lopsided. That's why hexane (all C–C and C–H) ignored the rod."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | C–F not last | "Fluorine is the strongest puller there is, and carbon is far below it." |
  | C–H not first | "Carbon and hydrogen have almost the same electronegativity. That bond is nearly even." |
  | N–H and O–H swapped | "Oxygen sits right of nitrogen, so it pulls harder on hydrogen's electrons." |
  | *(any other)* | "For each bond, subtract the two values. Smallest difference first." |

- **Reveal:** the correct order with Scene `bond-dipoles` (`bonds: C–H, N–H, O–H, C–F`): "A **bond dipole** is drawn as a crossed arrow pointing at the δ− end. Note C–H: carbon is the (slightly) δ− end, but the difference is so small that chemists treat C–H as nonpolar."
- **Scene:** `bond-dipoles`, plays on correct answer and on reveal. Screen reader: "Four bonds from least to most polar. C–H, difference {den.CH}, nearly nonpolar. N–H, {den.NH}, δ− on nitrogen. O–H, {den.OH}, δ− on oxygen. C–F, {den.CF}, δ− on fluorine. Each has an arrow pointing at its negative end."
- **Source note:** "Electronegativity: see s02."

### `u1-l01-s05` · Build · Explain

- **Prompt:** "Now count. Each atom fills its outer shell (8 electrons, 2 for H) with a mix of **bonds** and **lone pairs**, and in neutral molecules each element has its usual mix:"
  - **H:** 1 bond
  - **C:** 4 bonds
  - **N:** 3 bonds + 1 lone pair
  - **O:** 2 bonds + 2 lone pairs
  - **F, Cl, Br, I:** 1 bond + 3 lone pairs

  "A double bond counts as 2 bonds, a triple as 3."
- **Visual:** our own table, one row per element, each with a drawn example: CH₄, NH₃, H₂O, HF; beneath, acetonitrile CH₃–C≡N: showing C with a triple bond and N with 3 bonds + 1 lone pair. Static.
- **Screen reader:** the list above, then "Example: acetonitrile. The end carbon has four bonds, three of them in a triple bond to nitrogen. Nitrogen has three bonds and one lone pair."
- **Source note:** "Lone pairs vs 1, 2 or 3 shared pairs, and acetonitrile, after MIT OCW 5.12, Lecture 1 p. 9 ('Bonding Possibilities of Main Organic Atoms'), Berkowski, Spring 2005, CC BY-NC-SA 4.0. Table layout ours."

### `u1-l01-s06` · Build · Explain

- **Prompt:** "When an atom breaks its usual pattern, it carries a **formal charge**. Count **dots and sticks**:
  **Formal charge = valence electrons − lone-pair electrons − bonds**
  (Every lone-pair dot counts; each bond counts once, for this atom's half of the pair.)
  H₃O⁺: oxygen has 6 − 2 − 3 = **+1**. One more bond than usual → +1.
  OH⁻: oxygen has 6 − 6 − 1 = **−1**. One fewer bond, keeping the pair → −1."
- **Scene:** `dots-and-sticks`, first on O of H₃O⁺, then on O of OH⁻, autoplays once. Screen reader: "Hydronium. Oxygen: 6 valence electrons, minus 2 in its one lone pair, minus 3 bonds, equals plus 1. Hydroxide. Oxygen: 6, minus 6 in three lone pairs, minus 1 bond, equals minus 1."
- **Source note:** "Formal charge as in MIT OCW 5.12, Problem Set 1 Q1, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours."

### `u1-l01-s07` · Build · Numeric input

- **Prompt:** "Ammonium, NH₄⁺. What is the formal charge on nitrogen?"
- **Visual:** NH₄⁺, full Lewis, charge **hidden**, nitrogen ringed.
- **Interaction:** number pad with a ± key.
- **Answer:** +1, ±0.
- **Correct line:** "5 − 0 − 4 = +1. Four bonds is one more than nitrogen's usual three."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 0 | "Nitrogen usually makes 3 bonds with a lone pair. Here it has 4 bonds and no lone pair. Count again." |
  | −1 | "Check the sign: subtracting fewer electrons than nitrogen owns leaves it positive." |
  | +4 or −4 | "Bonds count once each, not twice. 5 − 0 − 4." |
  | *(any other)* | "Valence 5, minus lone-pair electrons, minus bonds." |

- **Reveal:** Scene `dots-and-sticks` on N of NH₄⁺. Screen reader: "Nitrogen: 5 valence electrons, no lone pairs, 4 bonds. 5 minus 0 minus 4 is plus 1."
- **Source note:** n/a (our example).

### `u1-l01-s08` · Build · Tap-to-identify (signature)

- **Prompt:** "In your body, the amino acid **glycine** looks like this. The charges have been hidden. Tap **every** atom that carries a formal charge, then press Check."
- **Visual:** glycine zwitterion, H₃N⁺–CH₂–CO₂⁻ (`[NH3+]CC(=O)[O-]`; glycine is PubChem CID 750), full Lewis, every lone pair drawn, charges hidden. Tappable: N, the CH₂ carbon, the carboxyl carbon, both oxygens, every H (hit area ≥ 48 px).
- **Answer:** {N, the single-bonded O}.
- **Correct line:** "N has 4 bonds (+1); the single-bonded O has 1 bond and 3 lone pairs (−1). The whole molecule is neutral, yet it carries two charges."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes the C=O oxygen | "That oxygen has 2 bonds (one double) and 2 lone pairs: 6 − 4 − 2 = 0. Its usual pattern." |
  | includes a carbon | "That carbon has 4 bonds and no lone pairs: 4 − 0 − 4 = 0." |
  | includes an H | "Each H has its 1 bond: 1 − 0 − 1 = 0." |
  | only N | "One more. Find the oxygen with only one bond." |
  | only the single-bonded O | "One more. Count the nitrogen's bonds." |
  | *(any other)* | "Look for an atom off its usual pattern: an N with 4 bonds, an O with 1." |

- **Reveal:** ⊕ appears beside N and ⊖ beside the single-bonded O, each with its count: "N: 5 − 0 − 4 = +1", "O: 6 − 6 − 1 = −1".
- **Scene:** n/a. Screen reader for the structure: "Glycine. A nitrogen bonded to three hydrogens and a CH₂ carbon. The CH₂ is bonded to a carbon that has a double bond to one oxygen and a single bond to another. The double-bonded oxygen has two lone pairs; the single-bonded oxygen has three." Each tappable atom announces its bonds and lone pairs.
- **Source note:** "Structure: PubChem CID 750 (glycine), drawn as the zwitterion found in water."

### `u1-l01-s09` · Build · Multiple choice (multi-correct, structure cards)

- **Prompt:** "Formal charges can explain a lot, but some structures **can't exist** at all. Pick every one that can't."
- **Interaction:** four structure cards, full Lewis, charges shown:
  - `a` CH₃⁺ (C: 3 bonds, no lone pair)
  - `b` CH₃⁻ (C: 3 bonds, 1 lone pair)
  - `c` CH₅ (C: 5 bonds)
  - `d` CH₂²⁻ (C: 2 bonds, 2 lone pairs)
- **Answer:** {c, d}
- **Correct line:** "Two rules: **a second-row atom never holds more than 8 electrons** (CH₅ would have 10), and **charges beyond ±1 on one atom don't happen** in stable structures (CH₂²⁻). CH₃⁺ is short of an octet but real: a reactive cation you'll meet later."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `a` | "CH₃⁺ has only 6 electrons around carbon. Short of an octet is allowed briefly; it's a real, very reactive ion." |
  | includes `b` | "CH₃⁻: 3 bonds and 1 lone pair is 8 electrons, charge −1. That one's fine." |
  | misses `c` | "Count the electrons around carbon in CH₅: 5 bonds × 2 = 10. Too many for a second-row atom." |
  | misses `d` | "Work out carbon's formal charge in `d`: 4 − 4 − 2." |
  | *(any other)* | "Check two things on every card: electrons around the atom (no more than 8), and its formal charge (no more than ±1)." |

- **Reveal:** `c` stamped "10 electrons: octet exceeded", `d` stamped "−2: charge too large"; `a` and `b` stamped "real ion".
- **Source note:** "The two rules follow MIT OCW 5.12, Problem Set 1 Q1 ('large charge … octet exceeded'), Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l01-s10` · Build · Explain

- **Prompt:** "**Boron** breaks the rule, and stays neutral doing it. With 3 valence electrons it makes 3 bonds: BF₃ has formal charge 3 − 0 − 3 = 0 on boron, but only **6** electrons around it.
  That empty spot makes BF₃ hungry for a pair of electrons. In Lesson 8 you'll watch a lone pair dive into it."
- **Scene:** `bf3-sextet`, autoplays once. Screen reader: "Boron trifluoride. Boron has three bonds to fluorine and no lone pairs: six electrons, formal charge zero. An empty slot on boron shows room for one more pair."
- **Source note:** n/a (our wording; the boron slide is excluded).

### `u1-l01-s11` … `s13` · Check

The three Check Problems below, in order.

### `u1-l01-s14` · Wrap · Explain (big-statement card)

- **Prompt:** "**Bonds aren't always fair, and atoms keep count.**
  The more electronegative atom is δ−; a bigger difference means a more polar bond.
  Usual patterns: H 1 · C 4 · N 3 + 1 pair · O 2 + 2 pairs · halogen 1 + 3 pairs.
  Formal charge = valence − lone-pair electrons − bonds.
  Never more than 8 around C, N, O; never beyond ±1.
  Next question: water and CCl₄ both have polar bonds, so why is only one a polar molecule? Shape decides (Lesson 3)."
- **Visual:** the card, with a button **"Bonding patterns card"** that opens our own reference table: rows C, N, O, halogen; columns formal charge +1 / 0 / −1, each cell a drawn pattern (e.g. N: 4 bonds / 3 bonds + 1 pair / 2 bonds + 2 pairs), plus H (H⁺ / H– / H⁻) and boron (3 bonds, 0; 4 bonds, −1). Every cell is a drawing with a text label for screen readers.
- **Scene:** n/a. Screen reader for the card: the prompt text, then "Bonding patterns card available."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Drawing Molecules**, secondary Back to Unit.
- **Source note:** "Bonding patterns card: our own table, built from the formal-charge rule taught in this Lesson."

---

## Check Problems

### `u1-bond-polarity-rank` · Rank · difficulty 1

- **Tags:** Unit 1, Lesson 1 · **Status:** draft
- **Prompt:** "Order these bonds from **least** to **most** polar."
- **Visual:** four bond cards: C–O, C–H, O–H, C–Cl (shown in that scrambled order). Values hidden; `en-strip` one tap away.
- **Interaction:** drag to order (keyboard as in s04).
- **Answer:** C–H, C–Cl, C–O, O–H.
- **Correct line:** "Rank by the difference in electronegativity: C–H is nearly even, O–H the most lopsided."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | C–Cl after C–O | "Chlorine is a strong puller, but oxygen pulls harder than chlorine. Compare their values." |
  | C–H not first | "Carbon and hydrogen are almost equal pullers." |
  | O–H not last | "Hydrogen is a weaker puller than carbon, so O–H is more lopsided than C–O." |
  | *(any other)* | "Subtract the two values in each bond. Smallest difference first." |

- **Reveal:** the order with Scene `bond-dipoles` (`bonds: C–H, C–Cl, C–O, O–H`).
- **Scene:** `bond-dipoles` on reveal; screen reader as in s04 with these four bonds.
- **Source note:** "Electronegativity, Pauling scale: Allred (1961), via the CRC Handbook."

### `u1-fc-oxygen-three-bonds` · Numeric input · difficulty 2

- **Tags:** Unit 1, Lesson 1 · **Status:** draft · **Source:** PS1 Q1
- **Prompt:** "What is the formal charge on this oxygen?"
- **Visual:** the PS1 Q1 fragment: an O with one single bond, one double bond (dangling lines) and one lone pair; charge hidden.
- **Interaction:** number pad with a ± key.
- **Answer:** +1, ±0.
- **Correct line:** "6 − 2 − 3 = +1. Three bonds is one more than oxygen's usual two."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 0 | "Count the bonds: the double bond counts as 2, so that's 3 bonds in all." |
  | −1 | "Oxygen here has more bonds than usual, not fewer. Check the sign." |
  | +2 | "The double bond counts as 2 bonds, not as 2 bonds plus its electrons. 6 − 2 − 3." |
  | *(any other)* | "Valence 6, minus lone-pair electrons, minus bonds (a double bond is 2)." |

- **Reveal:** Scene `dots-and-sticks` on the fragment: "6 − 2 − 3 = +1."
- **Scene:** `dots-and-sticks` on reveal. Screen reader: "Oxygen: 6 valence electrons, minus 2 in one lone pair, minus 3 bonds, equals plus 1."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q1, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-fc-unreasonable` · Multiple choice (structure cards) · difficulty 2

- **Tags:** Unit 1, Lesson 1 · **Status:** draft · **Source:** PS1 Q1
- **Prompt:** "Three of these atoms are in reasonable bonding patterns. Which one is **not**?"
- **Interaction:** four PS1 Q1 fragments, charges hidden:
  - `a` N with 4 single bonds
  - `b` C with a triple bond and 1 lone pair
  - `c` N with 3 single bonds and 1 double bond
  - `d` O with 1 single bond and 3 lone pairs
- **Answer:** {c}
- **Correct line:** "Five bonds put 10 electrons around nitrogen. Octet exceeded. The others are N⁺, C⁻ and O⁻, all real."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "4 bonds, 8 electrons, formal charge 5 − 0 − 4 = +1. That's ammonium's nitrogen: real." |
  | `b` | "3 bonds + 1 lone pair = 8 electrons, charge 4 − 2 − 3 = −1. It's the carbon of cyanide: real." |
  | `d` | "1 bond + 3 lone pairs = 8 electrons, charge −1. That's hydroxide's oxygen: real." |
  | *(any other)* | "Count electrons around each atom. Which one goes past 8?" |

- **Reveal:** `c` stamped "10 electrons: octet exceeded"; the others labelled with their charges (+1, −1, −1).
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q1, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

---

## For Bank authoring (not part of this Lesson)

Problem Set 1 Q1's other fragments seed Lesson 1 Bank Problems for the Practice Set (formal charge, Numeric input, or reasonable/not, Multiple choice). The key's answers, in grid order: Br with 2 bonds and 2 lone pairs (+1); C with 2 single bonds + 1 double bond (0); C with 2 bonds + 2 lone pairs (−2, not reasonable: charge); O with 2 double bonds, no lone pair (+2, not reasonable: charge); O with a triple bond + 1 single bond + 1 lone pair (not reasonable: octet exceeded); N with a triple bond + 1 single bond (+1); H with a lone pair (H⁻, −1); O with a triple bond + 1 lone pair (+1); F with 1 single bond + 1 double bond + 1 lone pair (+2, not reasonable: charge); B with 2 single bonds + 1 double bond (−1, difficulty 3, Hint points back to s10). Already used here: N with 4 bonds, O with 3 bonds + 1 lone pair, C≡ with 1 lone pair, O with 1 bond + 3 lone pairs, and N with 5 bonds. **Dropped:** the N with 2 unpaired electrons (a radical; radicals are left out of v1).
