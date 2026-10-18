# Lesson 6: Resonance: Pushing Electrons

Lesson spec, pilot for the [template](../lesson-spec-template.md). Decided in [Specify Lesson 6: Resonance: Pushing Electrons (pilot)](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/20).

## Shape checks

- [x] 15 Steps: Hook 1, Build 9, Check 4, Wrap 1
- [x] Explain Steps at 2, 5, 7, 15, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Bond lengths come from pipeline output, none typed here
- [x] Nothing taken from the Moore-credited slides (Lecture 1 p. 18, Lecture 2 p. 2 "Mechanics", Lecture 2 pp. 3, 5)

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l06` |
| Title | Resonance: Pushing Electrons |
| Goal | Draw curved arrows from an electron source to a sink to turn one resonance contributor into another, using the three moves, without ever moving an atom or a σ bond. |
| Prerequisites | Lesson 1 (formal charge), Lesson 2 (line-angle drawings, implied H's and lone pairs), Lesson 4 (σ vs π) |
| Key idea | Curved arrows move only lone pairs and π bonds, from source to sink; atoms and σ bonds never move. The real molecule is the hybrid of its drawings. |
| Check Problems | `u1-res-ozone`, `u1-res-not-resonance`, `u1-res-oxocarbenium`, `u1-res-thiodienyl` |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 1 p. 17 (nitromethane, the hybrid); Lecture 2 p. 1 (source/sink lists, formaldehyde), p. 2 "Rules for Resonance Structures" only; Problem Set 1 Q3 and Q6 with the key. All wording is ours. Lecture 2b is acid–base material for Unit 2 and is not used. |
| Structure drawing | Line-angle, with every heteroatom, every charged atom and every carbon in a moving π bond drawn as an explicit letter, and every lone pair drawn as cyan dots. One-carbon molecules (formaldehyde, nitromethane) and ozone are full Lewis structures. Contributors sit in brackets joined by ↔. |

### New Scenes

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame |
|---|---|---|---|---|---|
| `acetate-bond-lengths` | s01 reveal, s07 | Acetic acid and acetate side by side, C–O bonds labelled with length in Å; acetic acid's two differ, acetate's two match | `molecule: acid \| anion \| both` | `geometry/acetic-acid.json`, `geometry/acetate.json` | both molecules, labels shown |
| `formaldehyde-pi-shift` | s02 | The C=O π pair slides onto O; C turns ⁺, O turns ⁻; atoms stay still | none | none | the bracketed pair H₂C=O ↔ H₂C⁺–O⁻ |
| `three-moves` | s05 | Three panels, each one move: lone pair → bond (acetate O⁻ into C=O), bond → atom (formaldehyde π onto O), bond → next bond (allyl π shifts toward C⁺) | `panel: 1 \| 2 \| 3 \| all` | none | all three panels, arrows drawn |
| `acetate-hybrid` | s07, s15 | The two acetate contributors fade into one hybrid: dashed C–O bonds, δ− on each O, lone pairs hidden, equal lengths labelled | none | `geometry/acetate.json` | the hybrid with labels |
| `push-replay` | every Draw-arrows success and reveal | Plays a list of pushes on an atom-mapped start: electrons ride each arrow, charges and bonds update, ends on the target | `start`, `pushes`, `target` (from the Step) | the Step's own fields | the target with arrows drawn on the start |

**Geometry for `acetate-bond-lengths` and `acetate-hybrid`:** both acetic acid and acetate anion come from our own PySCF B3LYP/cc-pVTZ optimisation, labelled "computed". This is a deliberate exception to "experiment first": a side-by-side comparison of a few hundredths of an Å is only honest when both numbers come from the same method. The build agent records whether CCCBDB has acetic acid and notes the exception in the Source note. **Sanity check at build time** (not shown to Students): acetate's two C–O values agree within 0.005 Å; acetic acid's C=O is shorter than its C–O by more than 0.1 Å; acetate's value lies between the two.

Source note for both: "Bond lengths computed with PySCF, B3LYP/cc-pVTZ, gas phase. Both molecules use the same method so they can be compared fairly."

---

## Steps

### `u1-l06-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "This is acetate, what's left of vinegar's acid after it gives away H⁺. One C–O bond is drawn double, the other single. Which one is longer?"
- **Visual:** acetate, full lone pairs, as one Lewis structure: CH₃–C(=O)–O⁻.
- **Interaction:** pick one. `a` the C–O single bond · `b` the C=O double bond · `c` they're the same length
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `acetate-bond-lengths` (`both`). "Measure them and they're **identical**. In acetic acid they really do differ. So the drawing of acetate is hiding something. By the end of this Lesson you'll know what."
- **Scene:** `acetate-bond-lengths`, plays on reveal. Screen reader: "Acetic acid: one C–O bond is clearly shorter than the other. Acetate: both C–O bonds are the same length, and that length sits between acetic acid's two."
- **Source note:** see Geometry above.

### `u1-l06-s02` · Build · Explain

- **Prompt:** "A **curved arrow** tracks one pair of electrons. Its tail sits on the pair that moves, the **source**. Its head points to where the pair lands, the **sink**.
  Sources: a lone pair, or a π bond.
  Sinks: an electronegative atom, an atom with room for more electrons, or a positive atom.
  (A half-headed 'fishhook' arrow moves a single electron. You'll meet it much later.)"
- **Visual / Scene:** `formaldehyde-pi-shift`, autoplays once. Screen reader: "Formaldehyde, H₂C double-bonded to O. A curved arrow starts on the C=O π bond and ends on oxygen. The pair becomes a lone pair on O: oxygen is now negative, carbon positive. No atom moves."
- **Source note:** "Source and sink lists adapted from MIT OCW 5.12, Lecture 2 p. 1, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l06-s03` · Build · Tap-to-identify

- **Prompt:** "Nitromethane. Tap every place electrons could flow **from**, then press Check."
- **Visual:** CH₃–N⁺(=O)–O⁻, full Lewis, all lone pairs. Tappable: C, each H, N, O(=), O(⁻), each bond.
- **Answer:** {O of N=O, O⁻, N=O bond} (the lone-pair-bearing oxygens and the π bond).
- **Correct line:** "Lone pairs on both oxygens and the N=O π bond. Every other bond here is σ."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes N | "N⁺ here has four bonds and no lone pair, so it has nothing to give." |
  | includes the C–N bond or a C–H bond | "That's a σ bond. In resonance only lone pairs and π bonds move; σ bonds stay put." |
  | includes C or an H | "Look for lone pairs or π bonds. This carbon and its H's have neither." |
  | misses the N=O bond | "A double bond is one σ plus one π, and the π pair is free to move." |
  | misses an oxygen | "Both oxygens carry lone pairs. Check the other one." |
  | *(any other)* | "Sources are lone pairs and π bonds. Find every one." |

- **Reveal:** the three sources ring in cyan, with "lone pairs on O, lone pairs on O⁻, the N=O π bond".
- **Source note:** "Nitromethane from MIT OCW 5.12, Lecture 1 p. 17, CC BY-NC-SA 4.0."

### `u1-l06-s04` · Build · Draw arrows

- **Prompt:** "Push the electrons to turn formaldehyde into its other contributor."
- **Visual:** start and target side by side, target dimmed.
- **Start:** `[CH2:1]=[O:2]` · **Target:** `[CH2+:1]-[O-:2]`
- **Pushes:** π bond 1–2 → drop on O2 (move 2, bond → atom).
- **Correct line:** "The π pair is now a lone pair on O: O⁻ and C⁺. Same atoms, same σ bonds. Only the π electrons moved."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 1–2 → C1 | "Electrons flow to the sink. Oxygen is more electronegative, so it pulls the pair." |
  | lone pair on O2 → C1 | "That pushes more electrons onto carbon, which already has a full octet. Move a pair away from carbon instead." |
  | a C–H bond | "σ bonds never move in resonance." |
  | *(any other)* | "Which atom is the sink? Move the pair that sits between C and O toward it." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from the C=O π bond to oxygen. Result: H₂C⁺ single-bonded to O⁻."
- **Source note:** "Adapted from MIT OCW 5.12, Lecture 2 p. 1, CC BY-NC-SA 4.0."

### `u1-l06-s05` · Build · Explain

- **Prompt:** "Every resonance arrow is one of **three moves**:
  1. **Lone pair → bond.** A lone pair becomes a new π bond to the atom next door.
  2. **Bond → atom.** A π pair leaves its bond and becomes a lone pair on one of its own atoms.
  3. **Bond → next bond.** A π pair slides over by one position.
  The rules never change: **atoms don't move, σ bonds don't break**, and every drawing must be a real Lewis structure. If one push gives an atom too many electrons, a second push has to take some away. The arrows happen together."
- **Scene:** `three-moves` (`all`), each panel lit in turn. Screen reader: "Move one: the negative oxygen of acetate sends a lone pair into the bond to carbon. Move two: formaldehyde's π pair lands on oxygen. Move three: in the allyl cation, the C=C π pair slides one position toward the positive carbon."
- **Source note:** "Rules adapted from MIT OCW 5.12, Lecture 2 p. 2, 'Rules for Resonance Structures', CC BY-NC-SA 4.0."

### `u1-l06-s06` · Build · Draw arrows

- **Prompt:** "Back to acetate. Push electrons to move the negative charge to the other oxygen."
- **Start:** `[CH3:1][C:2](=[O:3])[O-:4]` · **Target:** `[CH3:1][C:2]([O-:3])=[O:4]`
- **Pushes, any order:** lone pair on O4 → C2 (move 1); π 2–3 → O3 (move 2).
- **In-between flags:**
  - lone pair first: orange ring on C2, "C has 10 e⁻: something has to leave. In resonance both arrows happen at once, so this halfway drawing isn't a real structure."
  - π bond first: orange ring on C2, "C has only 6 e⁻ and O3 has a charge. This halfway drawing isn't real either. Fill the gap."
- **Correct line:** "The charge moved from one O to the other, and nothing else changed. Two drawings, one ion."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 2–3 → C2 | "Oxygen is the electronegative sink. Pull the π pair toward O, not C." |
  | lone pair on O3 → C2 | "Start from the oxygen that carries the negative charge. It has the extra pair." |
  | C1–C2 bond or a C–H bond | "σ bonds stay put." |
  | *(any other)* | "One pair comes in from O⁻ and one pair leaves toward the other O." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from a lone pair on the lower oxygen into the C–O bond; arrow from the C=O π bond onto the upper oxygen. The double bond and the negative charge have swapped oxygens."
- **Source note:** "Acetate from MIT OCW 5.12, Problem Set 1 Q3b, CC BY-NC-SA 4.0."

### `u1-l06-s07` · Build · Explain

- **Prompt:** "So which drawing is acetate? **Neither.** The real ion is the **resonance hybrid**: the − charge is shared by both oxygens (δ− each), and both C–O bonds sit between single and double. That's why they measured the same.
  The ↔ arrow means 'two drawings of one thing'. It is **not** ⇌: acetate never flips back and forth. It is the blend, all the time."
- **Scene:** `acetate-hybrid`, autoplays once. Screen reader: "The two acetate drawings merge into one: both C–O bonds dashed, each oxygen δ−, and both bonds labelled with the same length."
- **Source note:** Geometry above, plus "The hybrid idea follows MIT OCW 5.12, Lecture 1 p. 17, CC BY-NC-SA 4.0."

### `u1-l06-s08` · Build · Draw arrows

- **Prompt:** "The allyl cation. Use move 3: slide the π bond toward the positive carbon."
- **Start:** `[CH2:1]=[CH:2][CH2+:3]` · **Target:** `[CH2+:1][CH:2]=[CH2:3]`
- **Pushes:** π 1–2 → drop on C3 (move 3, bond → next bond).
- **Correct line:** "The double bond slid one position and the + charge jumped to the other end. The real allyl cation shares + between both ends."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 1–2 → C2 or C1 | "That parks the pair on one carbon and leaves two C⁺. The empty spot is on C3, so slide the bond toward it." |
  | the C2–C3 bond | "That's σ. Only the π bond moves." |
  | *(any other)* | "C3⁺ is the sink. Which π pair is next to it?" |

  (Dragging from C3 shows the built-in prompt "start at a lone pair or a bond".)
- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from the C1=C2 π bond to the C2–C3 bond. Now C2=C3 is double and C1 is positive."
- **Source note:** n/a (our example).

### `u1-l06-s09` · Build · Multiple choice

- **Prompt:** "Same atoms, same places? Which pair shows two resonance contributors?"
- **Interaction:** structure cards, one correct.
  - `a` CH₃–N⁺(=O)–O⁻ ↔ CH₃–N⁺(–O⁻)=O
  - `b` CH₃–N⁺(=O)–O⁻ and CH₃–O–N=O (methyl nitrite)
  - `c` CH₃–C(=O)–O⁻ and CH₃–C(=O)–OH
- **Answer:** {a}
- **Correct line:** "Same atoms, same σ bonds; only electrons differ. That's resonance."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Look at what carbon is bonded to: N in one, O in the other. An atom moved, so that's a different molecule, not a contributor." |
  | `c` | "Count the hydrogens. Adding H⁺ makes a different species. Resonance never adds or removes atoms." |
  | *(any other)* | "Resonance contributors differ only in where lone pairs and π bonds are." |

- **Reveal:** `a` highlighted, with one line on each wrong card ("atom moved", "H added").
- **Source note:** n/a.

### `u1-l06-s10` · Build · Draw arrows

- **Prompt:** "Nitromethane: push electrons to swap which oxygen carries the negative charge."
- **Start:** `[CH3:1][N+:2](=[O:3])[O-:4]` · **Target:** `[CH3:1][N+:2]([O-:3])=[O:4]`
- **Pushes, any order:** lone pair on O4 → N2 (move 1); π 2–3 → O3 (move 2).
- **In-between flags:**
  - lone pair first: "N would have 10 e⁻. A second-row atom can't, so another pair has to leave. This isn't a real structure."
  - π bond first: "N has only 6 e⁻ and a 2+ charge. Not a real structure. Finish the move."
- **Correct line:** "Same as acetate: charge shared by two oxygens. The real nitromethane is their hybrid."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 2–3 → N2 | "Pull the π pair toward the electronegative oxygen." |
  | lone pair on O3 → N2 | "Start from O⁻, the oxygen with the extra pair." |
  | the C–N bond | "σ bonds stay put." |
  | *(any other)* | "It's the acetate pattern again: one pair in, one pair out." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from a lone pair on O⁻ into the N–O bond; arrow from the N=O π bond onto the other oxygen. The charges have swapped oxygens."
- **Source note:** "Nitromethane from MIT OCW 5.12, Lecture 1 p. 17, CC BY-NC-SA 4.0."

### `u1-l06-s11` … `s14` · Check

The four Check Problems below, in order.

### `u1-l06-s15` · Wrap · Explain (big-statement card)

- **Prompt:** "**Electrons move. Atoms don't.**
  Arrows go source → sink: lone pairs and π bonds are sources; electronegative, positive or empty-handed atoms are sinks.
  Three moves: lone pair → bond, bond → atom, bond → next bond.
  The real molecule is the hybrid of its drawings."
- **Scene:** `acetate-hybrid`, final frame. Screen reader: "Acetate's hybrid: charge shared by both oxygens."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Resonance: Which Contributor Wins**, secondary Back to Unit.
- **Source note:** n/a.

---

## Check Problems

Each Source note reads: "Adapted from MIT OCW 5.12, Problem Set 1 Q<n>, Berkowski, Spring 2005, CC BY-NC-SA 4.0." The reveal for every Draw-arrows Problem plays `push-replay`.

### `u1-res-ozone` · Draw arrows (open) · difficulty 1

- **Tags:** Unit 1, Lesson 6 · **Status:** draft · **Source:** PS1 Q3c
- **Prompt:** "Ozone, O₃. Push electrons to reach another resonance contributor. No atom may carry a charge beyond ±1."
- **Start:** `[O:1]=[O+:2][O-:3]` · **Accepted results:** {`[O-:1][O+:2]=[O:3]`} (the only other contributor within the charge rule)
- **Pushes, any order:** lone pair on O3 → O2 (move 1); π 1–2 → O1 (move 2).
- **In-between flags:** lone pair first: "Central O would have 10 e⁻. Something has to leave." π bond first: "Central O now has only 6 e⁻ and 2+. Not a real structure."
- **Correct line:** "The double bond and the − charge swapped ends. The central O stays +."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 1–2 → O2 | "That leaves the end oxygen with only 6 electrons. Push the pair onto the end oxygen instead." |
  | lone pair on O1 → O2 | "O1 has no extra pair to spare. Start from O⁻." |
  | *(any other)* | "Same pattern as acetate: one pair in from O⁻, one pair out to the far O." |

- **Reveal:** both arrows played; "−O–O⁺=O".

### `u1-res-not-resonance` · Multiple choice (multi-correct) · difficulty 2

- **Tags:** Unit 1, Lesson 6 · **Status:** draft · **Source:** PS1 Q6
- **Prompt:** "Which pairs are **not** resonance contributors of each other? Pick all that apply."
- **Interaction:** five structure-card pairs:
  - `a` `C[N+](C)=C1C=C[CH-]C=C1` and `CN(C)c1ccccc1` (N,N-dimethylaniline)
  - `b` `C=C=C` (allene) and `CC#C` (propyne)
  - `c` `C1C[CH+]C=CO1` and `C1CC=CC=[O+]1`
  - `d` `CC(=S)C=C[CH2-]` and `CC([S-])=CC=C`
  - `e` `CC(C)=O` (acetone) and `CC(O)=C` (its enol)
- **Answer:** {b, e}
- **Correct line:** "In both, a hydrogen moved. That makes different molecules (isomers), not drawings of one molecule."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `a`, `c` or `d` | "Check that pair atom by atom: every atom stays where it was, and only lone pairs and π bonds shift. That is resonance." |
  | misses `b` | "Look at the ends of allene and propyne. CH₂ and CH₂ vs CH₃ and CH: an H moved." |
  | misses `e` | "Acetone and its enol differ in where one H sits. Those are tautomers, real different molecules." |
  | *(any other)* | "Resonance never moves an atom, hydrogens included." |

- **Reveal:** `b` and `e` marked "H moved"; `a`, `c`, `d` marked "same atoms, electrons moved".

### `u1-res-oxocarbenium` · Draw arrows · difficulty 2

- **Tags:** Unit 1, Lesson 6 · **Status:** draft · **Source:** PS1 Q6c
- **Prompt:** "Push electrons to turn this cation into its oxocarbenium contributor (shown)."
- **Visual:** line-angle six-membered ring; O, C3⁺, C4, C5 explicit; target dimmed beside it.
- **Start:** `[CH2:1]1[CH2:2][CH+:3][CH:4]=[CH:5][O:6]1` · **Target:** `[CH2:1]1[CH2:2][CH:3]=[CH:4][CH:5]=[O+:6]1`
- **Pushes, any order:** lone pair on O6 → C5 (move 1); π 4–5 → C3 (move 3).
- **In-between flags:**
  - lone pair first: "C5 would have 10 e⁻. Something has to leave."
  - π bond first: "C5⁺, next to O. That's a valid contributor too. Keep going to reach the target."
- **Correct line:** "Oxygen's lone pair joined the π system: the + charge ends up on O, which still has a full octet."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | lone pair on O6 → C1 | "C1 already has four bonds and is not in the π system. Push toward C5." |
  | π 4–5 → C4 or C5 | "That parks the pair as a lone pair and leaves two cations. Slide the bond toward C3⁺ instead." |
  | a ring σ bond | "σ bonds stay put, ring bonds included." |
  | *(any other)* | "Two moves: the π bond slides toward C⁺, and O's lone pair fills the gap it leaves." |

- **Reveal:** both arrows played.

### `u1-res-thiodienyl` · Draw arrows · difficulty 3

- **Tags:** Unit 1, Lesson 6 · **Status:** draft · **Source:** PS1 Q6d
- **Prompt:** "Push electrons to move the negative charge from carbon onto sulfur (target shown). It takes three arrows."
- **Visual:** line-angle chain; S, C2, C4, C5, C6 explicit; target dimmed beside it.
- **Start:** `[CH3:1][C:2](=[S:3])[CH:4]=[CH:5][CH2-:6]` · **Target:** `[CH3:1][C:2]([S-:3])=[CH:4][CH:5]=[CH2:6]`
- **Pushes, any order:** lone pair on C6 → C5 (move 1); π 4–5 → C2 (move 3); π 2–3 → S3 (move 2).
- **In-between flags:** any atom over 8 e⁻: "<atom> would have 10 e⁻. Something has to leave." Any carbon at 6 e⁻: "<atom> has only 6 e⁻. Not a real structure, keep going." (No partial state of this push set is a reasonable contributor, so every in-between gets one of these two flags.)
- **Correct line:** "The charge travelled down the chain, three atoms over, to the electronegative sulfur."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 4–5 → C6 | "C6 already has a lone pair pushing toward C5. The π bond has to flow the other way, toward C2." |
  | π 2–3 → C2 | "Sulfur is the electronegative end. Push the C=S electrons onto S." |
  | lone pair on S3 → C2 | "S has no charge to give yet. Start from the carbon with the − charge." |
  | *(any other)* | "Follow the chain: C6's lone pair → the next π bond → the C=S π bond → onto S." |

- **Reveal:** all three arrows played.
