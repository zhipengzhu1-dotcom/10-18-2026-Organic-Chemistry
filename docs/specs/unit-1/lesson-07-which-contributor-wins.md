# Lesson 7: Resonance: Which Contributor Wins

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md), which it follows directly. Decided in [Specify Lesson 7: Resonance: Which Contributor Wins](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/27). Under the owner's 2026-10-19 call in [the map](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/1), the agent made the remaining calls; they are listed in the PR for review.

## Shape checks

- [x] 15 Steps: Hook 1, Build 10, Check 3, Wrap 1
- [x] Hook (s01) → Build (s02–s11) → Check (s12–s14, 3 Problems) → Wrap (s15)
- [x] Explain Steps at 3, 5, 10, 15, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Every chemistry number points at pipeline output with a Source note; none typed here (numbers in curly braces are pipeline fields)
- [x] Bond lengths shown to 2 decimals in Å, labelled "computed", full values in the Source note
- [x] Both Tap-to-identify Steps (s11, `u1-res-enamine-site`) say in their prompt that they are tap-only
- [x] Nothing taken from the Moore-credited slides (Lecture 2 p. 2 "Mechanics", Lecture 2 p. 3 both slides, Lecture 2 p. 5), nor from PS1 Q7/Q14

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l07` |
| Title | Resonance: Which Contributor Wins |
| Goal | Rank a molecule's resonance contributors with four rules in order (full octets, fewest charges, − on the more electronegative atom, charges close together), and use the minor contributors to find the molecule's δ+ and δ− sites. |
| Prerequisites | Lesson 1 (electronegativity order, formal charge, impossible structures), Lesson 2 (line-angle drawings, implied H's and lone pairs), Lesson 4 (σ vs π), Lesson 5 (amide, ketone and aldehyde by name), Lesson 6 (curved arrows source → sink, the three moves, the hybrid, ↔ is not ⇌) |
| Key idea | The real molecule is a weighted blend: the drawing with full octets and the fewest, best-placed charges counts most, and the minor drawings show where the molecule is δ+ and δ−, which is where it reacts. |
| Check Problems | `u1-res-major-dimethylaniline`, `u1-res-enamine-site`, `u1-res-rank-methoxyacrylonitrile` |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 2 p. 4, both slides ("Predicting Energies of Resonance Structures": the four guidelines in priority order; "Predicting Relative Energies": 3-methoxyacrylonitrile contributors A–E); Lecture 2 p. 2, "Rules for Resonance Structures" only (lower-energy contributors count most); Problem Set 1 Q6a with the key (N,N-dimethylaniline). All wording is ours. **Source correction:** the Unit 1 row cites "L2b pp. 3–4", but Lecture 2b is a three-page acid–base handout (its p. 3 resonance slide is acetate acidity, Unit 2). The ranking material is Lecture 2 p. 4. **Excluded:** Lecture 2 p. 2 "Mechanics", p. 3 (both slides, as in Lesson 6) and p. 5 (Moore, "used with permission"); PS1 Q7 and Q14 (Smith). The reactive-site idea is taught in our own words on our own molecules. Bond lengths: our own PySCF run, labelled "computed" (see Geometry). Structures: PubChem CIDs as given per Step. |
| Structure drawing | Line-angle, with every heteroatom, every charged atom and every carbon in the π system drawn as an explicit letter, and every lone pair drawn as cyan dots. One- and two-carbon species (methylamine, methanimine, the methoxymethyl cation) are full Lewis structures. Contributors sit in brackets joined by ↔. Structure cards (s04, s06, s08, s09, s12, s14) and Rank cards follow the same rule. Every structure, Manim Scenes included, is drawn by the site's own renderer (Manim imports its SVG export); RDKit.js parses and lays out, it never supplies the final drawing. |

### New Scenes

Watch-only Scenes are silent, plain Manim CE renders (decided in [Prototype: Specify Lesson 0](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/31)); molecules in them are SVGs exported from the site's own renderer. Reused: `push-replay` (React, from Lesson 6) on every Draw-arrows success and reveal, and as the reveal of `u1-res-enamine-site`.

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `amide-cn-lengths` | s01 reveal | Methylamine, acetamide and methanimine side by side, the C–N bond in each highlighted and labelled with its length in Å and "computed". Labels only: no ruler or scale bar (bond length does not map linearly onto contributor weight, so the Scene must not invite reading a weight off it). | `molecule: methylamine \| acetamide \| methanimine \| all` | `geometry/methylamine.json`, `geometry/acetamide.json`, `geometry/methanimine.json` | all three molecules, labels shown |
| `amide-hybrid` | s03, s15 | Acetamide's two contributors in brackets, the neutral one drawn full size and tagged "major", the charged one smaller and tagged "minor". They merge into one hybrid: C–N drawn solid plus dashed, C–O drawn solid plus dashed, δ− on O. The C–N label from `amide-cn-lengths` stays on. | none | `geometry/acetamide.json` | the hybrid beside the two tagged contributors |
| `rule-ladder` | s05 | Four rungs light in turn: 1 full octets, 2 fewest charges, 3 − on the more electronegative atom, 4 charges close together. Then acetamide's two contributors climb the ladder: rung 1 ties (both ✓), rung 2 decides (✓ neutral, ✗ charged), and the neutral card is tagged "major". | `rung: 1 \| 2 \| 3 \| 4 \| all` | none | all four rungs with the acetamide verdict |
| `carbonyl-sites` | s10 | Acetone's two contributors (C=O ↔ C⁺–O⁻) fade into the hybrid; δ+ appears on the carbonyl C, δ− on O, each written as a symbol and a word ("δ+ electron-poor", "δ− electron-rich"). A lone pair labelled "an electron source" drifts in and a dotted curved arrow points from it to the δ+ carbon. | none | none | the hybrid with δ labels and the dotted arrow |

---

## Steps

### `u1-l07-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "Acetamide is drawn with a plain C–N single bond. Methylamine has a real C–N single bond; methanimine has a C=N double bond. How long is acetamide's C–N?"
- **Visual:** the three molecules in a row, C–N highlighted in each: methylamine CH₃–NH₂ (CID 6329), acetamide CH₃–C(=O)–NH₂ (CID 178), methanimine H₂C=NH (CID 123139). Full lone pairs.
- **Interaction:** pick one. `a` about as long as methylamine's C–N · `b` shorter: between single and double · `c` as short as methanimine's C=N
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `amide-cn-lengths` (`all`). "Acetamide's C–N is **{acetamide.r_CN} Å** (computed): shorter than methylamine's single bond ({methylamine.r_CN} Å), longer than methanimine's double bond ({methanimine.r_CN} Å). So a drawing with C=N must count, but only partly. Which drawings count, and how much? That's this Lesson."
- **Scene:** `amide-cn-lengths`, plays on reveal. Screen reader: "Three C–N bonds, computed. Methylamine's single bond is the longest. Methanimine's double bond is the shortest. Acetamide's, drawn as a single bond, falls in between."
- **Source note:** see Geometry below.

### `u1-l07-s02` · Build · Draw arrows

- **Prompt:** "Find the drawing behind that short bond. Push electrons to turn acetamide into its other contributor."
- **Visual:** start and target, target dimmed in a strip above the start on narrow screens, side by side on wide ones.
- **Start:** `[CH3:1][C:2](=[O:3])[NH2:4]` · **Target:** `[CH3:1][C:2]([O-:3])=[NH2+:4]`
- **Pushes, any order:** lone pair on N4 → bond 2–4 (move 1, drop target on the C2–N4 bond); π 2–3 → O3 (move 2, drop target beside O3).
- **In-between flags:**
  - lone pair first: orange ring on C2, "C has 10 e⁻: something has to leave. Both arrows happen at once, so this halfway drawing isn't a real structure."
  - π bond first: orange ring on C2, "C has only 6 e⁻. This halfway drawing isn't the target: in resonance both arrows happen at once. Fill the gap."
- **Correct line:** "C=N with N⁺ and O⁻: that's the drawing with the double bond. Same atoms, same σ bonds."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 2–3 → C2 | "Oxygen is the electronegative sink. Pull the π pair toward O, not C." |
  | lone pair on O3 → C2 | "The new π bond has to form between C and N. Start from N's lone pair." |
  | C1–C2, C2–N4 σ bond or an N–H / C–H bond | "σ bonds stay put." |
  | *(any other)* | "It's the acetate pattern from Lesson 6: one pair in from N, one pair out to O." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from the lone pair on nitrogen into the C–N bond; arrow from the C=O π bond onto oxygen. Result: C double-bonded to N⁺, single-bonded to O⁻."
- **Source note:** n/a (our example). Structure: PubChem CID 178.

### `u1-l07-s03` · Build · Explain

- **Prompt:** "Acetamide is a blend of both drawings, but **not 50:50**. The hybrid is a **weighted** blend: the more stable drawing counts more. It's the **major contributor**; the others are **minor contributors**.
  Minor still matters. Acetamide's charged drawing is minor, yet it's why the C–N bond is shorter than a single bond."
- **Scene:** `amide-hybrid`, autoplays once. Screen reader: "Acetamide's neutral drawing is tagged major and drawn larger; the charged drawing is tagged minor. They merge into one hybrid with a partial double C–N bond and a partial negative charge on oxygen."
- **Source note:** "Weighting idea from MIT OCW 5.12, Lecture 2 p. 2, 'Rules for Resonance Structures', Berkowski, Spring 2005, CC BY-NC-SA 4.0." Plus the Geometry note.

### `u1-l07-s04` · Build · Multiple choice

- **Prompt:** "Gut check before the rules: which acetamide drawing is the major contributor?"
- **Visual:** the two contributors from s02 as structure cards.
- **Interaction:** pick one. `a` CH₃–C(=O)–NH₂, no charges · `b` CH₃–C(–O⁻)=N⁺H₂ · `c` they count equally
- **Answer:** {a}
- **Correct line:** "No charges beats two. Pulling + and − apart costs energy, so the neutral drawing is major."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Count the formal charges in each. Separating + from − costs energy." |
  | `c` | "Equal weight needs the two drawings to be equally good. One carries two charges, the other none." |
  | *(any other)* | "Which drawing has fewer formal charges?" |

- **Reveal:** `a` highlighted: "Both have full octets; the neutral one has no charges, so it wins."
- **Source note:** n/a.

### `u1-l07-s05` · Build · Explain

- **Prompt:** "To rank contributors, test them against **four rules, in order**. The first rule that tells two drawings apart decides.
  1. **Full octets.** C, N, O and F each have 8 electrons. Only carbon is ever drawn with 6, and that costs a lot.
  2. **Fewest charges.** Fewer formal charges (so more bonds) is better.
  3. **− on the more electronegative atom.** C < N < O < F, as in Lesson 1.
  4. **Charges close together.** If two drawings tie on 1–3, the one with + and − nearer each other wins."
- **Scene:** `rule-ladder` (`all`), each rung lit in turn, then the acetamide verdict. Screen reader: "Rule one, full octets. Rule two, fewest charges. Rule three, negative charge on the more electronegative atom. Rule four, charges close together. Acetamide's two drawings tie on rule one; rule two picks the neutral drawing as major."
- **Source note:** "The four guidelines and their order adapted from MIT OCW 5.12, Lecture 2 p. 4, 'Predicting Energies of Resonance Structures', Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l07-s06` · Build · Multiple choice

- **Prompt:** "The methoxymethyl cation. Which contributor is major?"
- **Visual:** [CH₃–O–CH₂⁺ ↔ CH₃–O⁺=CH₂], full Lewis, all lone pairs.
- **Interaction:** pick one (structure cards). `a` CH₃–O–CH₂⁺ (+ on carbon) · `b` CH₃–O⁺=CH₂ (+ on oxygen) · `c` they count equally
- **Answer:** {b}
- **Correct line:** "Rule 1 first. In CH₃–O⁺=CH₂ every atom has an octet, and that outranks where the + sits, even on an electronegative O."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "Count the electrons around the CH₂ carbon in each drawing. Rule 1, full octets, comes before anything about electronegativity." |
  | `c` | "They differ on rule 1. Count the electrons on the CH₂ carbon in each." |
  | *(any other)* | "Go rule by rule: which drawing gives every atom 8 electrons?" |

- **Reveal:** `b` highlighted, with "CH₂⁺ has only 6 e⁻ (rule 1 fails); O⁺=CH₂ gives every atom 8."
- **Source note:** n/a (our example).

### `u1-l07-s07` · Build · Draw arrows

- **Prompt:** "This anion, an **enolate**, comes from acetone (Unit 2 shows how it forms). Push electrons to move the negative charge from O onto carbon."
- **Visual:** start and target, target in the strip above.
- **Start:** `[CH2:1]=[C:2]([CH3:3])[O-:4]` · **Target:** `[CH2-:1][C:2]([CH3:3])=[O:4]`
- **Pushes, any order:** lone pair on O4 → bond 2–4 (move 1, drop target on the C2–O4 bond); π 1–2 → C1 (move 2, drop target beside C1).
- **In-between flags:**
  - lone pair first: orange ring on C2, "C has 10 e⁻: something has to leave. This halfway drawing isn't a real structure."
  - π bond first: orange ring on C2, "C has only 6 e⁻. This halfway drawing isn't real either. Fill the gap."
- **Correct line:** "Now the − sits on the CH₂ carbon and the double bond is C=O. Two drawings of one anion: which counts more?"
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | π 1–2 → C2 | "C2 is about to receive O's pair. Send the C=C pair the other way, onto the CH₂ end." |
  | C2–C3 σ bond or a C–H bond | "σ bonds stay put." |
  | *(any other)* | "One pair in from O⁻ to make C=O; one pair out of C=C onto the CH₂ carbon." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from a lone pair on O⁻ into the C–O bond; arrow from the C=C π bond onto the end carbon. Result: CH₂⁻ next to a C=O."
- **Source note:** n/a (our example). Parent ketone: acetone, PubChem CID 180.

### `u1-l07-s08` · Build · Multiple choice

- **Prompt:** "Which enolate drawing is the major contributor?"
- **Visual:** [CH₂=C(CH₃)–O⁻ ↔ ⁻CH₂–C(CH₃)=O] as structure cards.
- **Interaction:** pick one. `a` − on oxygen (C=C) · `b` − on carbon (C=O) · `c` they count equally
- **Answer:** {a}
- **Correct line:** "Rules 1 and 2 tie (full octets, one charge each), so rule 3 decides: O holds − better than C. But the C⁻ drawing still counts, so that CH₂ carbon is electron-rich too. Hold that thought."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "C=O looks stronger, but rules 1 and 2 tie here. Rule 3: which atom holds a negative charge better?" |
  | `c` | "Equal weight needs a tie on every rule. Check rule 3." |
  | *(any other)* | "Go rule by rule and stop at the first one that tells them apart." |

- **Reveal:** `a` highlighted, with "Octets: tie. Charges: tie, one each. − on the more electronegative atom: O beats C."
- **Source note:** n/a.

### `u1-l07-s09` · Build · Rank / order

- **Prompt:** "Acrolein has three contributors. Drag them into order, most important at the top."
- **Visual:** three structure cards, line-angle, all lone pairs, shown in the order `c`, `a`, `b`:
  - `a` `[CH2:1]=[CH:2][CH:3]=[O:4]` (neutral; acrolein, PubChem CID 7847)
  - `b` `[CH2:1]=[CH:2][CH+:3][O-:4]`
  - `c` `[CH2+:1][CH:2]=[CH:3][O-:4]`
- **Interaction:** drag cards (keyboard: focus a card, arrow keys move it), then Check.
- **Answer:** `a`, `b`, `c` (top to bottom).
- **Correct line:** "Neutral on top (rules 1 and 2). The two charged drawings tie on rules 1–3; rule 4 puts the one with + and − side by side ahead."
- **Hints:** (first match wins)

  | Wrong order | Hint |
  |---|---|
  | `b` or `c` above `a` | "`a` gives every atom an octet and has no charges. The other two each have a 6-electron carbon. Rule 1 puts `a` on top." |
  | `c` above `b` | "`b` and `c` tie on rules 1–3: a 6-electron carbon, two charges, − on O. Rule 4: in which are + and − closer?" |
  | *(any other)* | "Go rule by rule, and stop at the first rule that tells two cards apart." |

- **Reveal:** the correct order, each card tagged with the rule that placed it ("rule 1: octets", "rule 4: charges adjacent", "rule 4: charges far apart").
- **Source note:** "Ranking method adapted from MIT OCW 5.12, Lecture 2 p. 4, Berkowski, Spring 2005, CC BY-NC-SA 4.0." Example ours.

### `u1-l07-s10` · Build · Explain

- **Prompt:** "So what are minor contributors good for? **They show where a molecule reacts.**
  The major contributor shows what the molecule mostly looks like. The minor ones show where its electrons lean:
  - an atom drawn **+** in a reasonable contributor is **δ+** in the hybrid: electron-poor, a sink where an incoming electron source attacks.
  - an atom drawn **−** is **δ−**: electron-rich, a source that can attack something else.
  Acetone: C⁺–O⁻ is minor, but it marks the carbonyl carbon as the δ+ site."
- **Scene:** `carbonyl-sites`, autoplays once. Screen reader: "Acetone's C=O and C⁺–O⁻ drawings merge into one hybrid: the carbon is labelled δ+, electron-poor, and oxygen δ−, electron-rich. A lone pair labelled 'an electron source' approaches, with a dotted arrow pointing to the δ+ carbon."
- **Source note:** n/a (our wording and example; acetone, PubChem CID 180).

### `u1-l07-s11` · Build · Tap-to-identify

- **Prompt:** "Back to acrolein. Tap every **carbon** that is δ+ in the hybrid, then press Check. Just tap, no pushing on this Step."
- **Tap-only cue:** the idle callout reads "Just tap, no pushing on this Step." A drag shows "No pushing here: this Step only asks which carbons are δ+. Tap each one."
- **Visual:** acrolein, line-angle with every atom of the π system lettered and all lone pairs; the three ranked contributors from s09 sit dimmed in a strip above. Tappable: C1, C2, C3, O4.
- **Answer:** {C1, C3}
- **Correct line:** "Two δ+ carbons: C3 next to O, and C1 at the far end. An electron source can attack at either end of the π system."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes O4 | "O carries − in both minor drawings, so it is δ−, not δ+." |
  | includes C2 | "No contributor puts + on the middle carbon. Check all three drawings." |
  | only C3 | "That's one. Look at the third drawing: where else does + land?" |
  | only C1 | "That's one. The carbon bonded to O is drawn + too, in the second drawing." |
  | *(any other)* | "An atom is δ+ wherever a reasonable contributor puts a +." |

- **Reveal:** C1 and C3 ringed in cyan, each labelled "δ+", with the contributor that puts + there highlighted.
- **Source note:** n/a (our example; acrolein, PubChem CID 7847).

### `u1-l07-s12` … `s14` · Check

The three Check Problems below, in order.

### `u1-l07-s15` · Wrap · Explain (big-statement card)

- **Prompt:** "**Every drawing counts. The best one counts most.**
  Rank with four rules, in order: full octets → fewest charges → − on the more electronegative atom → charges close together.
  Minor contributors mark the δ+ and δ− sites, and that's where molecules react.
  Next: why electrons flow from δ− to δ+ at all."
- **Scene:** `amide-hybrid`, final frame. Screen reader: "Acetamide's hybrid: the neutral drawing is major, the charged drawing minor, and the C–N bond sits between single and double."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Molecular Orbitals: Why Electrons Flow**, secondary Back to Unit.
- **Source note:** n/a.

---

## Geometry for `amide-cn-lengths` and `amide-hybrid`

**Method:** methylamine, acetamide and methanimine all come from our own PySCF B3LYP/cc-pVTZ optimisation, gas phase, labelled "computed", as in Lesson 6. This is the same deliberate exception to "experiment first": the Hook compares three C–N lengths, and that is only honest when all three come from one method. The build agent records whether CCCBDB has experimental geometries for the three and notes the exception in the Source note.

**Conformers:** methylamine staggered. Acetamide is optimised from both methyl orientations (one C–H eclipsing C=O, and one perpendicular to the molecular plane); keep the one with no imaginary frequency. The NH₂ group may come out slightly pyramidal; that is fine and is recorded, not forced flat. Each optimisation is followed by a frequency check.

**Pipeline fields:** `{methylamine.r_CN}`, `{acetamide.r_CN}`, `{methanimine.r_CN}`, each shown to 2 decimals in Å; full values in the Source note.

**Sanity check at build time** (not shown to Students): methylamine C–N > acetamide C–N > methanimine C=N, with acetamide at least 0.05 Å from each of the other two; all three structures are true minima (no imaginary frequencies). If any check fails, the Hook is not built and the run goes to the owner.

**Source note (both Scenes):** "Bond lengths computed with PySCF, B3LYP/cc-pVTZ, gas phase. All three molecules use the same method so they can be compared fairly. Structures: PubChem CIDs 6329, 178 and 123139."

---

## Check Problems

The reveal for `u1-res-enamine-site` plays `push-replay`. Feedback everywhere is icon + words (✓ / ✗ + Hint / → answer), never colour alone.

### `u1-res-major-dimethylaniline` · Multiple choice · difficulty 1

- **Tags:** Unit 1, Lesson 7 · **Status:** draft
- **Prompt:** "N,N-Dimethylaniline and one of its contributors (the pair from Lesson 6). Which is the major contributor?"
- **Visual:** structure cards, line-angle, all lone pairs: `a` `CN(C)C1=CC=CC=C1` (PubChem CID 949) · `b` `C[N+](C)=C1C=C[CH-]C=C1`
- **Interaction:** pick one. `a` the neutral drawing · `b` the drawing with N⁺ and C⁻ · `c` they count equally
- **Answer:** {a}
- **Correct line:** "Both have full octets, so rule 2 decides: no charges beats two."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Both drawings give every atom an octet, so rule 1 ties. Rule 2: count the charges." |
  | `c` | "Equal weight needs a tie on every rule. They differ on rule 2." |
  | *(any other)* | "Go rule by rule: octets first, then charges." |

- **Reveal:** `a`, with "Octets: tie. Charges: none vs two. The neutral drawing is major."
- **Scene:** n/a.
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q6a, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-res-enamine-site` · Tap-to-identify · difficulty 2

- **Tags:** Unit 1, Lesson 7 · **Status:** draft
- **Prompt:** "N,N-Dimethylvinylamine. Picture its second contributor: N's lone pair pushes into the C–N bond. Tap the **carbon** that becomes δ−, then press Check. Just tap, no pushing on this Problem."
- **Tap-only cue:** idle callout "Just tap, no pushing on this Problem." A drag shows "No pushing here: picture the push, then tap the carbon it makes electron-rich."
- **Visual:** `[CH2:1]=[CH:2][N:3]([CH3:4])[CH3:5]` (PubChem CID 521812), line-angle, C1, C2 and N3 lettered, N's lone pair shown. Tappable: C1, C2, N3, C4, C5.
- **Answer:** {C1}
- **Correct line:** "N's pair makes C=N⁺, so the C=C pair lands on C1: ⁻CH₂–CH=N⁺. C1 is the electron-rich carbon."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes C2 | "C2 gets the new double bond to N. When N's pair moves in, the C=C pair has to move out. Where does it land?" |
  | includes N3 | "N is the source here: it ends up +, not −. The question asks for a carbon." |
  | includes C4 or C5 | "The methyl carbons have only σ bonds; they're not in the π system." |
  | *(any other)* | "Push N's lone pair into the C–N bond, then push the C=C pair onto the end carbon. Which carbon is now −?" |

- **Reveal:** `push-replay` with start `[CH2:1]=[CH:2][N:3]([CH3:4])[CH3:5]`, pushes lone pair on N3 → bond 2–3, π 1–2 → C1, target `[CH2-:1][CH:2]=[N+:3]([CH3:4])[CH3:5]`; then C1 ringed and labelled "δ−".
- **Scene:** `push-replay` (reveal). Screen reader: "Arrow from nitrogen's lone pair into the C–N bond; arrow from the C=C π bond onto the end carbon. The end carbon is now negative: it is the δ− carbon."
- **Source note:** n/a (our example).

### `u1-res-rank-methoxyacrylonitrile` · Rank / order · difficulty 3

- **Tags:** Unit 1, Lesson 7 · **Status:** draft
- **Prompt:** "Four minor contributors of 3-methoxyacrylonitrile (the neutral, major one isn't shown). Rank them, most important at the top."
- **Visual:** four structure cards, line-angle, all lone pairs, O, N and every π-system carbon lettered; shown in the order `c`, `a`, `d`, `b`. Parent: (E)-3-methoxyacrylonitrile, `[CH3:1][O:2][CH:3]=[CH:4][C:5]#[N:6]` (PubChem CID 5324713).
  - `a` `[CH3:1][O+:2]=[CH:3][CH:4]=[C:5]=[N-:6]`
  - `b` `[CH3:1][O+:2]=[CH:3][CH-:4][C:5]#[N:6]`
  - `c` `[CH3:1][O:2][CH:3]=[CH:4][C+:5]=[N-:6]`
  - `d` `[CH3:1][O:2][CH+:3][CH:4]=[C:5]=[N-:6]`
- **Interaction:** drag cards (keyboard: arrow keys), then Check.
- **Answer:** `a`, `b`, `c`, `d` (top to bottom).
- **Correct line:** "Every card has two charges, so rule 2 never decides. Rule 1 puts the full-octet cards (`a`, `b`) above the 6-electron ones; rule 3 puts − on N above − on C; rule 4 puts adjacent charges above distant ones."
- **Hints:** (first match wins)

  | Wrong order | Hint |
  |---|---|
  | `c` or `d` above `a` or `b` | "`c` and `d` each have a carbon with only 6 electrons. Rule 1 puts both full-octet cards above them." |
  | `b` above `a` | "`a` and `b` tie on rules 1 and 2. Rule 3: where does the − sit in each?" |
  | `d` above `c` | "`c` and `d` tie on rules 1–3. Rule 4: in which are + and − closer together?" |
  | *(any other)* | "Count charges first: they're all two. So test octets, then where − sits, then how far apart the charges are." |

- **Reveal:** the correct order, each card tagged with its deciding rule ("rule 1: octets ✓, rule 3: − on N", "rule 1: octets ✓, rule 3: − on C", "rule 1: 6-e⁻ C, rule 4: charges adjacent", "rule 1: 6-e⁻ C, rule 4: charges far apart").
- **Scene:** n/a.
- **Source note:** "Adapted from MIT OCW 5.12, Lecture 2 p. 4, 'Predicting Relative Energies' (contributors B–E), Berkowski, Spring 2005, CC BY-NC-SA 4.0."
