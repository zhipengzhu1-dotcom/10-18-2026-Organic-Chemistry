# Lesson 5: Functional Groups

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md). Ticket: [Specify Lesson 5: Functional Groups](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/26). Written by an agent under the owner's 2026-10-19 delegation (see [the map](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/1)); the owner approves it by merging its PR.

## Shape checks

- [x] 14 Steps: Hook 1, Build 9, Check 3, Wrap 1
- [x] Explain Steps at 2, 4, 7, 14, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Every chemistry number points at pipeline output with a Source note; none typed here (this Lesson has no measured or computed numbers at all, only counts of groups)
- [x] No computed numbers in this Lesson
- [x] No Tap-to-identify Step sits among Draw-arrows Steps (this Lesson has no Draw-arrows Steps)
- [x] Nothing taken from the Moore-credited slides (Lecture 1 p. 15 and the functional-groups sheet carry no Moore credit; PS1 Q7 and Q14 are not used)

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l05` |
| Title | Functional Groups |
| Goal | Find and name the core functional groups inside a real molecule by looking past its C–H skeleton and reading each heteroatom or π bond together with its neighbours. |
| Prerequisites | Lesson 1 (electronegativity and polar bonds: why heteroatoms matter), Lesson 2 (line-angle drawings, implied H's and lone pairs: every structure here is line-angle), Lesson 4 (σ vs π: C=C, C≡C and C=O carry π bonds). Lesson 0's estradiol returns in s06 as ethinylestradiol. |
| Key idea | A functional group is a small cluster of heteroatoms or π bonds that behaves the same in any molecule. Find them by skipping the C–H skeleton, and name each one by what its heteroatom or C=O touches. |
| Check Problems | `u1-fg-ketone`, `u1-fg-capsaicin`, `u1-fg-amoxicillin` |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 1 p. 15 (upper slide "Functional Groups": the definition; lower slide "Functional Groups to Learn": the family layout), the one-page *Functional Groups* sheet (name and structure columns only; the "Ending" column is not used), Problem Set 1 Q4 with the key p. 2 (amoxicillin). All wording is ours. Every structure: PubChem, CIDs given per Step. **Excluded:** PS1 Q7 and Q14 (Smith, McGraw-Hill); no Moore-credited page is used. |
| Structure drawing | Line-angle throughout (Lesson 2). Every heteroatom is an explicit letter with its H's (OH, NH₂, NH, SH not used); halogens as letters. **Lone pairs are not drawn** (implied, as Lesson 2 taught), because this Lesson trains reading molecules as they appear in the wild; no atom in this Lesson carries a charge. Arenes are drawn as Kekulé rings (alternating double bonds), never a circle. Methylamine is drawn condensed, CH₃–NH₂. Amoxicillin and ethinylestradiol use the standard orientations of their PubChem 2D depictions; ethinylestradiol in the same steroid view, not mirrored, as Lesson 0's estradiol. Every structure, structure cards included, is drawn by the site's own renderer; RDKit.js parses and lays out only. |

### Core set and what is deferred

**Taught (12 core groups + 2 named twins), in three families:**

| Family | Groups |
|---|---|
| No oxygen or nitrogen (s02) | alkene, alkyne, arene, alkyl halide |
| One heteroatom on single bonds (s04) | alcohol (twin: **phenol**, OH on an arene), ether (twin: **sulfide**, C–S–C), amine |
| The C=O family (s07) | aldehyde, ketone, carboxylic acid, ester, amide |

Phenol and sulfide are taught as twins of alcohol and ether, not as extra groups to memorise, because amoxicillin (PS1 Q4) needs both. The alkane is taught as the **skeleton**, the background with no group.

**Deferred** (on the sheet, not in this Lesson): diene (conjugation, Unit 12), aryl halide (one line in s02's card only: "on an arene ring it's an aryl halide"; not tested), epoxide, nitrile, nitro (Lesson 6 shows nitromethane without naming the group), imine, acid halide and anhydride (carbonyl Units), thiol, sulfoxide, sulfone, thioester. Naming endings (-ol, -one, -al, …) belong to the naming Units, not here.

### New Scenes

All three are React components drawing on the site's own structure renderer. None is a watch-only video: they are highlight states of the Step's own drawing (dim the skeleton, light regions, show label chips), and `group-spotlight` is the same component that rings answers on the Tap Steps' reveals. So the "watch-only = Manim" rule does not apply (see judgment calls in the PR).

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `group-spotlight` | s01 reveal, s06, s09, `u1-fg-amoxicillin` reveals, s14 | A molecule; its C–C/C–H skeleton dims to 40 % and the listed regions light one by one in cyan, each with a label chip (Space Grotesk name, JetBrains Mono formula piece) and a solid ring, so the highlight is never colour-only | `molecules` (1 or 2, side by side), `regions` (atom-id sets with labels), `labels: on \| off` | the Step's own structure and regions | every region lit, all labels shown |
| `group-cards` | s02, s04, s07, s14 | A 2-column grid of cards, one per group: a minimal piece (e.g. C–C=C–C, C–O–C) with the group drawn bold and the skeleton thin, name underneath. Cards deal in one by one. | `family: hydrocarbon \| single-bond \| carbonyl \| all` | none | all cards of the family dealt |
| `carbonyl-neighbours` | s07 | One C=O on the left of the screen stays fixed; its right-hand neighbour swaps through H → C → OH → O–C → N, the name chip under it changing each time (aldehyde, ketone, carboxylic acid, ester, amide) | none | none | a five-row ladder, the same C=O on every row with each neighbour and name |

---

## Steps

### `u1-l05-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "Vinegar tastes sour because acetic acid can give away H⁺ from its –COOH end. Amoxicillin, an antibiotic, is far bigger. Can it do the same trick?"
- **Visual:** acetic acid (`CC(=O)O`, CID 176) small on the left; amoxicillin (`CC1([C@@H](N2[C@H](S1)[C@@H](C2=O)NC(=O)[C@@H](C3=CC=C(C=C3)O)N)C(=O)O)C`, CID 33613) on the right.
- **Interaction:** pick one. `a` No: a bigger molecule behaves differently all over · `b` Yes: it carries the same –COOH piece · `c` Can't tell without testing it in a lab
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `group-spotlight` (both molecules, one region each: the C(=O)OH, label "carboxylic acid"). "**Yes.** The same –COOH sits on both, and it gives away H⁺ in both. A piece like this, which acts the same whatever it's bolted to, is a **functional group**. Spot the groups and you can read a molecule you've never seen."
- **Scene:** `group-spotlight`, plays on reveal. Screen reader: "Acetic acid and amoxicillin side by side. Everything dims except one piece on each: a carbon double-bonded to O and single-bonded to OH. Both are labelled carboxylic acid."
- **Source note:** "The idea that a group behaves the same in any molecule follows MIT OCW 5.12, Lecture 1 p. 15, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Structures: PubChem CIDs 176 and 33613."

### `u1-l05-s02` · Build · Explain

- **Prompt:** "Most of an organic molecule is **skeleton**: carbons joined to carbons and hydrogens. C–C and C–H bonds are barely polar and all σ, so the skeleton is quiet. (A molecule that is all skeleton is an **alkane**.)
  The action is where the skeleton is broken by a **π bond** or a **heteroatom**, any atom that isn't C or H. Those spots are the **functional groups**.
  Four need no O or N:
  **alkene** C=C · **alkyne** C≡C · **arene** a six-ring of alternating double bonds · **alkyl halide** C–F, C–Cl, C–Br or C–I (on an arene ring it's an aryl halide)."
- **Scene:** `group-cards` (`hydrocarbon`), deals in once. Screen reader: "Four cards. Alkene: two carbons joined by a double bond. Alkyne: two carbons joined by a triple bond. Arene: a benzene ring with alternating double bonds. Alkyl halide: a carbon single-bonded to a halogen, X, which is F, Cl, Br or I."
- **Source note:** "Groups from the MIT OCW 5.12 *Functional Groups* sheet and Lecture 1 p. 15, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l05-s03` · Build · Multiple choice (structure cards)

- **Prompt:** "Which molecule has **no** functional group?"
- **Interaction:** four structure cards, one correct.
  - `a` hexane (`CCCCCC`, CID 8058)
  - `b` cyclohexene (`C1CCC=CC1`, CID 8079)
  - `c` benzene (`C1=CC=CC=C1`, CID 241)
  - `d` chloroethane (`CCCl`, CID 6337)
- **Answer:** {a}
- **Correct line:** "Hexane is all skeleton: only C–C and C–H σ bonds. Every other card has a π bond or a heteroatom."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `c` | "Benzene is only C and H, but count its double bonds. That ring of π bonds is a group: the arene." |
  | `b` | "Look for a double line. One C=C is enough to make an alkene." |
  | `d` | "Cl isn't C or H. A carbon bonded to a halogen is an alkyl halide." |
  | *(any other)* | "Find the molecule with no π bond and no atom besides C and H." |

- **Reveal:** `a` highlighted "skeleton only"; the others tagged "arene", "alkene", "alkyl halide".
- **Source note:** "Structures: PubChem CIDs 8058, 8079, 241, 6337."

### `u1-l05-s04` · Build · Explain

- **Prompt:** "O and N on single bonds make the next family. Name each one by **what the heteroatom touches**:
  **alcohol** C–OH on a skeleton carbon · **phenol** OH on an arene ring (it behaves differently enough to get its own name)
  **ether** C–O–C, no H on the O · **sulfide** C–S–C, ether's sulfur twin
  **amine** C–N, with N carrying H's or more carbons (NH₂, NH or N)"
- **Scene:** `group-cards` (`single-bond`), deals in once. Screen reader: "Five cards. Alcohol: a skeleton carbon with OH. Phenol: an OH on a benzene ring. Ether: an oxygen between two carbons. Sulfide: a sulfur between two carbons. Amine: a carbon bonded to nitrogen, which also carries hydrogens or carbons."
- **Source note:** "Groups from the MIT OCW 5.12 *Functional Groups* sheet and Lecture 1 p. 15, CC BY-NC-SA 4.0."

### `u1-l05-s05` · Build · Multiple choice (structure cards, multi-correct)

- **Prompt:** "Pick **every** alcohol."
- **Interaction:** five structure cards.
  - `a` ethanol (`CCO`, CID 702)
  - `b` phenol (`C1=CC=C(C=C1)O`, CID 996)
  - `c` cyclohexanol (`C1CCC(CC1)O`, CID 7966)
  - `d` diethyl ether (`CCOCC`, CID 3283)
  - `e` methylamine (`CN`, CID 6329), drawn CH₃–NH₂
- **Answer:** {a, c}
- **Correct line:** "Both put OH on a skeleton carbon. A ring doesn't matter, as long as it isn't an arene."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `b` | "That OH sits on an arene ring carbon. That makes it a phenol, the alcohol's twin with its own name." |
  | includes `d` | "This O has a carbon on both sides and no H. That's an ether." |
  | includes `e` | "Look at the letter: N, not O. That's an amine." |
  | {a} only | "There's another. An OH on a ring carbon still counts, if the ring has no alternating double bonds." |
  | {c} only | "There's another, the smallest one here." |
  | *(any other)* | "An alcohol is O–H on a carbon that is plain skeleton, not part of an arene." |

- **Reveal:** `a` and `c` ticked "alcohol"; `b` "phenol", `d` "ether", `e` "amine".
- **Source note:** "Structures: PubChem CIDs 702, 996, 7966, 3283, 6329."

### `u1-l05-s06` · Build · Tap-to-identify

- **Prompt:** "Ethinylestradiol, the estrogen in many birth-control pills, is Lesson 0's estradiol with one piece added. Tap its **three** functional groups, then press Check."
- **Visual:** ethinylestradiol (`C[C@]12CC[C@H]3[C@H]([C@@H]1CC[C@]2(C#C)O)CCC4=C3C=CC(=C4)O`, CID 5991), standard steroid view as Lesson 0, stereo H's placed as there. Tappable: seven **regions**, each a fixed atom set with a hit area of at least 48 px: **phenol** (ring A with its OH), **alkyne** (C≡CH), **alcohol** (the C17 OH), the B ring, the C ring, the D ring (minus C17's OH and alkyne), the C18 methyl. Tapping a region rings it (solid outline + tick, never colour alone); tapping again un-picks it. Keyboard: Tab through regions in reading order, Enter toggles.
- **Answer:** {phenol, alkyne, alcohol}
- **Correct line:** "Two OH's, two different groups: the one on the arene is a phenol, the one on a skeleton carbon is an alcohol. The C≡C is the piece added to estradiol."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes the B, C or D ring or the C18 methyl | "That part is skeleton: only C–C and C–H σ bonds. Groups have a π bond or a heteroatom." |
  | misses the alkyne | "One group has no heteroatom at all. Look for a triple line." |
  | misses the alcohol | "There's a second OH, top right. Its carbon isn't in an arene." |
  | misses the phenol | "The left ring has alternating double bonds and an OH. Together they're one group." |
  | *(any other)* | "Skip the C–H skeleton. Tap every π bond and every heteroatom." |

- **Reveal:** Scene `group-spotlight` with the three regions labelled "phenol", "alkyne", "alcohol".
- **Scene:** screen reader on reveal: "Ethinylestradiol. Skeleton dimmed. Lit: the left ring with its OH, labelled phenol; the carbon–carbon triple bond at top right, labelled alkyne; the OH beside it, labelled alcohol."
- **Source note:** "Structure: PubChem CID 5991. Estradiol from Lesson 0 (MIT OCW 5.12, Lecture 1 p. 5, CC BY-NC-SA 4.0)."

### `u1-l05-s07` · Build · Explain

- **Prompt:** "The biggest family is built on **C=O**, the carbonyl. Read the C=O **together with what's on the other side of its carbon**:
  H → **aldehyde** · C → **ketone** · OH → **carboxylic acid** · O–C → **ester** · N → **amide**
  One C=O plus its neighbour is **one** group. A C=O next to OH is a carboxylic acid, not a ketone plus an alcohol."
- **Scene:** `carbonyl-neighbours`, autoplays once (replay + scrubber). Screen reader: "One C=O stays put. Its neighbour changes: H, aldehyde. Carbon, ketone. OH, carboxylic acid. Oxygen then carbon, ester. Nitrogen, amide."
- **Source note:** "Groups from the MIT OCW 5.12 *Functional Groups* sheet, CC BY-NC-SA 4.0."

### `u1-l05-s08` · Build · Multiple choice

- **Prompt:** "Ethyl acetate is the sweet smell of some nail-polish removers. Which group is it?"
- **Visual:** ethyl acetate (`CCOC(=O)C`, CID 8857).
- **Interaction:** pick one. `a` a ketone and an ether · `b` an ester · `c` a carboxylic acid · `d` an aldehyde and an ether
- **Answer:** {b}
- **Correct line:** "The O right next to the C=O carbon belongs to the group: C=O with O–C beside it is an ester."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "Don't split it. The O touches the C=O carbon, so C=O and O–C read together as one group." |
  | `c` | "A carboxylic acid ends in O–H. Here that O carries a carbon instead." |
  | `d` | "An aldehyde has H on the C=O carbon. This one has a carbon on one side and an O on the other." |
  | *(any other)* | "Read the C=O with what sits on the other side of its carbon." |

- **Reveal:** `b`, with the C(=O)O ringed: "C=O + O–C = ester".
- **Source note:** "Structure: PubChem CID 8857."

### `u1-l05-s09` · Build · Tap-to-identify

- **Prompt:** "Aspartame, a sweetener. Tap every group that contains a **C=O**, then press Check."
- **Visual:** aspartame (`COC(=O)[C@H](CC1=CC=CC=C1)NC(=O)[C@H](CC(=O)O)N`, CID 134601). Tappable regions (≥48 px each): **ester** (C(=O)O–CH₃), **amide** (C(=O)–NH), **carboxylic acid** (C(=O)OH), **amine** (NH₂), **arene** (the phenyl ring), and three skeleton regions (the two CH carbons, the two CH₂ carbons as one region each side). Same tap and keyboard rules as s06.
- **Answer:** {ester, amide, carboxylic acid}
- **Correct line:** "Three carbonyls, three different groups, told apart by the neighbour: O–C (ester), N (amide), OH (acid)."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes the amine | "That NH₂ is on a carbon with no C=O, so it's an amine. For an amide the N has to sit right on the C=O carbon." |
  | includes the arene | "The ring's double bonds are C=C, not C=O." |
  | includes a skeleton region | "That's skeleton. Look for the letter O double-bonded to C." |
  | misses one | "There are three C=O's. Check the far ends of the molecule." |
  | *(any other)* | "Find each O drawn with a double line to carbon. Tap the C=O with its neighbour." |

- **Reveal:** Scene `group-spotlight`, the three regions labelled "ester", "amide", "carboxylic acid"; the amine and arene shown with a plain outline, labelled, "no C=O".
- **Scene:** screen reader on reveal: "Aspartame. Lit: at the left, C=O with O–CH₃, ester; in the middle, C=O with NH, amide; at the right, C=O with OH, carboxylic acid. Also outlined: NH₂, amine, and the benzene ring, arene, neither with a C=O."
- **Source note:** "Structure: PubChem CID 134601."

### `u1-l05-s10` · Build · Multiple choice

- **Prompt:** "Every penicillin, amoxicillin included, has this four-membered ring. What group is the C=O inside it?"
- **Visual:** 2-azetidinone, the bare ring (`C1CNC1=O`, CID 136721).
- **Interaction:** pick one. `a` a ketone and an amine · `b` an amide · `c` none: groups in rings don't count · `d` an ester
- **Answer:** {b}
- **Correct line:** "N sits right on the C=O carbon, so it's an amide. A ring changes nothing: a group in a ring is still that group."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "The N touches the C=O carbon directly. Read them as one group." |
  | `c` | "Cyclohexanol was still an alcohol. A ring doesn't hide a group." |
  | `d` | "The ring atom beside the C=O is N, not O." |
  | *(any other)* | "What is the neighbour on the other side of the C=O carbon?" |

- **Reveal:** `b`, with C=O and N ringed together, "C=O + N = amide, here in a ring".
- **Source note:** "Structure: PubChem CID 136721."

### `u1-l05-s11` … `s13` · Check

The three Check Problems below, in order.

### `u1-l05-s14` · Wrap · Explain (big-statement card)

- **Prompt:** "**Skip the skeleton. Read the neighbours.**
  Groups live where there's a π bond or a heteroatom.
  Name an O, N or S by what it touches; read a C=O with the atom beside its carbon.
  A group behaves the same in any molecule, so a few groups let you read thousands of molecules."
- **Scene:** `group-cards` (`all`), final frame. Screen reader: "All fourteen group cards in three families: alkene, alkyne, arene, alkyl halide; alcohol, phenol, ether, sulfide, amine; aldehyde, ketone, carboxylic acid, ester, amide."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Resonance: Pushing Electrons**, secondary Back to Unit.
- **Source note:** n/a.

---

## Check Problems

### `u1-fg-ketone` · Multiple choice (structure cards) · difficulty 1

- **Tags:** Unit 1, Lesson 5 · **Status:** draft
- **Prompt:** "Same CH₃–C=O, different neighbour. Which one is a **ketone**?"
- **Interaction:** five structure cards, one correct.
  - `a` acetaldehyde (`CC=O`, CID 177)
  - `b` acetone (`CC(=O)C`, CID 180)
  - `c` acetic acid (`CC(=O)O`, CID 176)
  - `d` methyl acetate (`CC(=O)OC`, CID 6584)
  - `e` acetamide (`CC(=O)N`, CID 178)
- **Answer:** {b}
- **Correct line:** "Carbon on both sides of the C=O: a ketone."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "That C=O carbon carries an H (drawn as the end of the line). H beside a C=O makes an aldehyde." |
  | `c` | "OH beside the C=O makes a carboxylic acid." |
  | `d` | "O–C beside the C=O makes an ester." |
  | `e` | "N beside the C=O makes an amide." |
  | *(any other)* | "A ketone's C=O carbon has a carbon on each side." |

- **Reveal:** `b` ticked; each other card tagged with its group name.
- **Scene:** n/a.
- **Source note:** "Groups from the MIT OCW 5.12 *Functional Groups* sheet, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Structures: PubChem CIDs 177, 180, 176, 6584, 178."

### `u1-fg-capsaicin` · Multiple choice (multi-correct) · difficulty 2

- **Tags:** Unit 1, Lesson 5 · **Status:** draft
- **Prompt:** "Capsaicin makes chili peppers hot. Which groups does it contain? Pick all that apply."
- **Visual:** capsaicin (`CC(C)/C=C/CCCCC(=O)NCC1=CC(=C(C=C1)O)OC`, CID 1548943), full width.
- **Interaction:** eight chips, two columns. `a` alkene · `b` phenol · `c` ether · `d` amide · `e` ester · `f` ketone · `g` amine · `h` alcohol
- **Answer:** {a, b, c, d}
- **Correct line:** "Four groups: the C=C in the tail, the amide in the middle, and on the ring an OH (phenol) beside an O–CH₃ (ether)."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `e` or `f` | "The C=O's neighbour is N. That makes an amide, not an ester or a ketone." |
  | includes `g` | "The N sits right on the C=O carbon, so it belongs to the amide." |
  | includes `h` | "The only OH is on the arene ring. That's a phenol." |
  | misses `c` | "Next to the OH, the ring carries an O with a carbon on each side." |
  | misses `a` | "Follow the long tail. One bond in it is double." |
  | misses `b` or `d` | "Check the ring's OH and the C=O in the middle." |
  | *(any other)* | "Skip the skeleton. Name each π bond and heteroatom by its neighbours." |

- **Reveal:** Scene `group-spotlight` on capsaicin with the four groups labelled; chips `a`–`d` ticked.
- **Scene:** screen reader on reveal: "Capsaicin. Lit: a C=C in the left-hand tail, alkene; C=O with NH in the middle, amide; on the ring, OH, phenol, and O–CH₃, ether."
- **Source note:** "Structure: PubChem CID 1548943."

### `u1-fg-amoxicillin` · Tap-to-identify (signature) · difficulty 3

- **Tags:** Unit 1, Lesson 5 · **Status:** draft · **Source:** PS1 Q4
- **Prompt:** "Back to amoxicillin. Tap **every** functional group, then press Check."
- **Visual:** amoxicillin (CID 33613, SMILES in s01), drawn full width in PubChem's standard orientation, with OH, NH₂, NH, N, S and both O's of the acid as letters; wedges as PubChem. Tappable: ten **regions**, each a fixed, non-overlapping atom set with a hit area of at least 48 px (enlarged invisibly around small regions such as S):
  1. **phenol**: the benzene ring and its OH
  2. **amine**: the NH₂
  3. **side-chain amide**: C=O and NH between the two halves
  4. **ring amide** (β-lactam): the four-ring C=O and its N
  5. **sulfide**: the S
  6. **carboxylic acid**: C(=O)OH
  7. skeleton: the CH carrying the NH₂
  8. skeleton: the two four-ring CH carbons
  9. skeleton: the ring carbon with its two CH₃
  10. skeleton: the CH carrying the acid
  Tap and keyboard rules as s06. Tapping region 5 or 9 near the shared corner picks the region under the finger's centre; the hit areas do not overlap.
- **Answer:** {1, 2, 3, 4, 5, 6}
- **Correct line:** "Six groups: phenol, amine, two amides (one in the four-ring), sulfide and carboxylic acid. That's how a chemist reads amoxicillin at a glance."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes region 7, 8, 9 or 10 | "That's skeleton: carbons with only C, H and σ bonds. The groups are the heteroatoms and π bonds around them." |
  | misses region 4 | "The four-membered ring hides one: a C=O with N right beside it, the ring you met two Steps ago." |
  | misses region 3 | "Between the two halves sits a C=O with NH beside it. That's a group too." |
  | misses region 5 | "S isn't C or H. C–S–C is ether's sulfur twin." |
  | misses region 2 | "Top of the left half: an N on a carbon with no C=O." |
  | misses region 6 | "Bottom right: a C=O with OH beside it." |
  | misses region 1 | "Far left: an arene ring carrying OH. Ring and OH together are one group." |
  | *(any other)* | "Skip the skeleton. Tap every heteroatom and π bond, each with the neighbours it shares a group with." |

- **Reveal:** Scene `group-spotlight`, the six regions lit and labelled "phenol", "amine", "amide", "amide (β-lactam)", "sulfide", "carboxylic acid".
- **Scene:** screen reader on reveal: "Amoxicillin. Skeleton dimmed. Lit, left to right: the benzene ring with its OH, phenol; NH₂, amine; C=O and NH in the middle, amide; inside the four-membered ring, C=O and N, a second amide called the beta-lactam; S in the five-membered ring, sulfide; C=O with OH at the bottom right, carboxylic acid."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q4 and its key, Berkowski, Spring 2005, CC BY-NC-SA 4.0 (the key labels phenol, amine, amide twice, sulfide and carboxylic acid). Structure: PubChem CID 33613."
