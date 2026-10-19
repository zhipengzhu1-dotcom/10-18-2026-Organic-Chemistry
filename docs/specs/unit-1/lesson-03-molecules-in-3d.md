# Lesson 3: Molecules in 3D

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md). Decided in [Specify Lesson 3: Molecules in 3D](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/24). The 3D viewer is the Step card from [Prototype: 3D molecule viewer at true scale](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/13); geometry sources follow [Research: NIST CCCBDB coverage and a fallback geometry source](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/19).

## Shape checks

- [x] 15 Steps: Hook 1, Build 10, Check 3, Wrap 1
- [x] Explain Steps at 2, 5, 8, 15, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame (the 3D viewer's "Describe" text is given per Step)
- [x] Every chemistry number points at pipeline output with a Source note; none typed here (numbers in curly braces are pipeline fields). The only typed angles are the VSEPR model's predictions (180°, 120°, 109.5°), always named as the model's, never as a measurement, and the right angle of the flat Lewis drawing.
- [x] Bond lengths shown to 2 decimals in Å and angles to 1 decimal in degrees, full values in the Source note
- [x] No Tap-to-identify Step sits among Draw-arrows Steps (this Lesson has neither)
- [x] Nothing taken from the Moore-credited slides (Lecture 1 pp. 5–11 and 18); Lecture 1 p. 13 upper slide carries no such credit. PS1 Q7/Q14 are not used.

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l03` |
| Title | Molecules in 3D |
| Goal | Predict a small molecule's shape by counting the electron domains on its central atom, read and check a wedge-and-dash drawing against a 3D model, and decide whether a molecule's polar bonds cancel. |
| Prerequisites | Lesson 0 (octet; a shared pair is a bond; carbon makes 4 bonds), Lesson 1 (electronegativity, δ+/δ−, bond dipoles as crossed arrows; boron in BF₃ has only three bonds), Lesson 2 (Lewis drawings with every lone pair) |
| Key idea | Electron domains push as far apart as they can, and that sets the shape. Lines, wedges and dashes put the shape on paper, and the shape decides whether polar bonds cancel. |
| Check Problems | `u1-3d-flat-or-pyramid`, `u1-3d-perspective`, `u1-3d-polar-molecules` |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 1 p. 13, upper slide "Representing Molecules: 3-D" (molecules aren't flat; line / dash / wedge; methane drawn in perspective; "governed by VSEPR"); Problem Set 1 Q2a (reorienting 2-fluorobutane to a partly drawn perspective view) with the key. All wording is ours. Not used from p. 13: the dimethylcyclohexane pair (stereochemistry, a later Unit) and the lower slide (orbitals, Lesson 4). Geometry: NIST CCCBDB, SRD 101, Release 22, doi:10.18434/T47C7Z (experimental), or our PySCF B3LYP/cc-pVTZ optimisation labelled "computed" (see Geometry below). Electronegativities for dipole arrow lengths: the Pauling data file Lesson 1 reads. **Excluded:** every "Courtesy of Jeffrey S. Moore … used with permission" figure (Lecture 1 pp. 5–11, 18), PS1 Q7/Q14 (Smith), OpenStax text. |
| Structure drawing | Full Lewis drawings, every lone pair as cyan dots, for every one-centre molecule (CH₄, NH₃, H₂O, H₂C=O, CO₂, BF₃, CCl₄, CH₂Cl₂). Wedge-and-dash drawings for 3D: a plain line lies in the page, a solid wedge comes toward you, a hashed wedge (dash) goes away; the two in-page bonds form a V and the wedge and dash sit side by side in the gap opposite it. 2-fluorobutane is drawn as in PS1, with CH₃, CH₂CH₃, F and H written as groups around one explicit central C. Every drawing, structure cards included, uses the site's own renderer; RDKit.js parses and lays out, it never supplies the final drawing. In 3D: Jmol colours, every atom carries its letter (JetBrains Mono, never a pixel font). |

### New Scenes

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `methane-unflatten` | s01 reveal | Watch-only, a silent plain Manim CE render (~8 s, 16:9 and 9:16, 30 fps; see the s01 Video note). The flat Lewis CH₄ with a right-angle mark between two H's lifts off the page: the H's swing out into 3D until every H–C–H angle is equal. The right-angle mark is replaced by an arc labelled with the measured angle. | `aspect: 9:16 \| 16:9` (video renders) | `geometry/methane.json` | flat drawing (right-angle mark) beside the 3D methane (measured arc label) |
| `domain-spread` | s02 | Watch-only, silent plain Manim CE render (~10 s). Three panels: a centre with 2, 3 and 4 translucent "domain" balloons that start bunched and push apart into a line, a flat triangle and a tetrahedron. Each panel ends with its name and a caption "model: 180°", "model: 120°", "model: 109.5°". | `aspect: 9:16 \| 16:9` | none (model geometry, labelled as the model) | all three panels settled, names and model captions shown |
| `four-domain-family` | s05 | Interactive (React/R3F). Three small viewer cards in a row: CH₄, NH₃, H₂O, all in the same orientation, rotating together (drag any one). Lone pairs drawn as translucent ghost domains labelled "lone pair (sketch)". Under each: shape name and the measured angle. A dashed reference line reads "model: 109.5°". | none | `geometry/methane.json`, `geometry/ammonia.json`, `geometry/water.json` | the three molecules side on, names and angles shown |
| `wedge-dash-methane` | s08 | Watch-only, silent plain Manim CE render (~10 s). 3D methane turns until two H's lie on a translucent sheet (the page). Those two bonds flatten into plain lines; the H in front grows a solid wedge, the H behind a hashed wedge. The sheet fades and the finished drawing sits beside the model. | `aspect: 9:16 \| 16:9` | `geometry/methane.json` | the 3D model with the sheet, beside the finished wedge-and-dash drawing, each bond labelled "in page", "toward you", "away" |
| `dipole-sum` | s11; reveal of `u1-3d-polar-molecules` | Interactive (React/R3F) on the Step-card viewer. Each polar bond carries a bond-dipole crossed arrow (Lesson 1 style: + tail at δ+, head toward δ−). **Add** slides the arrows tip to tail, in 3D, and draws the sum: a thick net arrow, or a ring with the words "net: zero" when they cancel. Rotatable; the 1 Å scale bar stays. | `molecule: water \| co2 \| ccl4 \| ch2cl2 \| nh3 \| bf3`; `added: false \| true` | the molecule's geometry file; the Lesson 1 Pauling electronegativity file | `added: true`: the arrows tip to tail and the net result in words |

The 3D molecule viewer (`molecule-card`, the Step card from #13) is a component, not a new Scene: drag or arrow keys rotate, ↺/↻ buttons, `[`/`]` move between atoms, Enter picks one, two picks give a distance, three an angle, a live region reads each measurement, Ball & stick ⟷ True scale switch, 1 Å scale bar, "ⓘ Where these numbers come from" one tap away, and a **Describe** button whose text is given in each Step. Reduced motion: no idle spin, instant mode switch. New viewer options this Lesson needs: `startView` (a named orientation stored in the geometry file), `pageSheet: true` (a translucent plane in the screen plane through the central atom, with an "In the page" text badge, see s09), and `labels` (atom labels like "C1"; letters always stay).

**Geometry.** One source per molecule, never mixed (#19):

| File | Molecule | SMILES | PubChem CID | Source |
|---|---|---|---|---|
| `geometry/methane.json` | methane | `C` | 297 | CCCBDB experimental (confirmed in #19) |
| `geometry/ammonia.json` | ammonia | `N` | 222 | CCCBDB experimental if its page has complete Cartesians, else computed |
| `geometry/water.json` | water | `O` | 962 | same rule |
| `geometry/formaldehyde.json` | formaldehyde | `C=O` | 712 | same rule |
| `geometry/carbon-dioxide.json` | carbon dioxide | `O=C=O` | 280 | same rule |
| `geometry/boron-trifluoride.json` | boron trifluoride | `FB(F)F` | 6356 | same rule |
| `geometry/carbon-tetrachloride.json` | carbon tetrachloride | `ClC(Cl)(Cl)Cl` | 5943 | same rule |
| `geometry/dichloromethane.json` | dichloromethane | `ClCCl` | 6344 | same rule |
| `geometry/ethanol.json` | ethanol, anti conformer | `CCO` | 702 | CCCBDB experimental (confirmed in #19), unless the human check #19 left open finds its reference holds computed parameters; then computed |
| `geometry/2-fluorobutane-r.json` | (R)-2-fluorobutane | `C[C@@H](F)CC` | 54429975 | computed (no CCCBDB experimental structure expected; the build records what CCCBDB has). Optimised from the anti C1–C2–C3–C4 conformer, followed by a frequency check. |

- **Same method for compared angles.** s05 sets methane, ammonia and water side by side. If any of the three lacks complete experimental Cartesians, all three use the computed geometry, so the comparison isn't across methods (the same reasoning as Lesson 6's acetate exception). The build agent records which case applied.
- **Fields.** `{<molecule>.angle.<ABC>}` is the angle at B in degrees, shown to 1 decimal; `{<molecule>.len.<AB>}` a bond length in Å, shown to 2 decimals. Every value the viewer shows on tap is calculated from the file's coordinates. Full-precision values go in the Source note.
- **Sanity checks at build time** (not shown to Students): all six H–C–H angles of methane agree within 0.1°, and so do CCl₄'s Cl–C–Cl angles; {water.angle.HOH} < {ammonia.angle.HNH} < {methane.angle.HCH}; CO₂'s O=C=O angle is 180° within 0.1°; the three F–B–F angles of BF₃ sum to 360° within 0.1° (flat); NH₃'s H–N–H angles sum to clearly less than 360° (a pyramid); {formaldehyde.angle.HCO} > {formaldehyde.angle.HCH}; the 2-fluorobutane file is (R) by CIP from its coordinates and a true minimum; each `startView` puts the atoms where the Step's drawing says (checked by projecting the coordinates).
- **Licence:** CCCBDB-derived files carry the NIST acknowledgement and sit outside the code's MIT licence; republishing them in the public repo still needs the human licence check flagged in #19.

**Source note wording** (from #19), filled per molecule from its file:
- *Experimental:* "Geometry: experimental (gas phase). <parameters with values> from <reference>, via NIST CCCBDB, SRD 101, Release 22, doi:10.18434/T47C7Z. Other distances and angles are calculated from these values."
- *Computed:* "Geometry: computed, not measured. Optimised at B3LYP/cc-pVTZ with PySCF <version> (our calculation, <date>), isolated molecule. For molecules with experimental structures, this method's bond lengths differ from experiment by up to <max> Å."

**Dipole arrows (`dipole-sum`).** Each arrow lies along its bond in the real geometry and points toward the more electronegative atom. Its length is proportional to the two atoms' Pauling electronegativity difference from Lesson 1's data file, so identical bonds get identical arrows. The Scene labels the arrows "length: a rough guide, not to scale"; the direction of the net result is what the Step asks about. No dipole-moment values are shown.

---

## Steps

### `u1-l03-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "Here's methane, CH₄, the way you've drawn it so far. On paper, neighbouring H's sit at right angles. In the real molecule, is the angle between two H's (with C at the corner)…"
- **Visual:** flat Lewis CH₄, a right-angle mark between the top H and the right H.
- **Interaction:** pick one. `a` smaller than a right angle · `b` a right angle, like the drawing · `c` bigger than a right angle
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `methane-unflatten`. "**Bigger: {methane.angle.HCH}°**, and every pair of H's measures the same. Methane isn't flat. Its H's spread out in 3D, as far from each other as they can get. A flat drawing can't show that. This Lesson is about the real shapes, and how to draw them."
- **Scene:** `methane-unflatten`, plays on reveal (reduced motion: poster frame + Play). Screen reader: "The flat drawing of methane, with a right angle between two hydrogens, lifts off the page. The four hydrogens swing out into three dimensions until every H–C–H angle is equal: {methane.angle.HCH} degrees."
- **Source note:** methane geometry note (experimental, CCCBDB).
- **Video note:** watch-only, so a plain **Manim CE** render, **silent**, no editing pass, as decided in [Prototype: Specify Lesson 0](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/31); the render reads `geometry/methane.json` and the angle field at render time, never a typed value. The last frame is the poster. The same rule holds for `domain-spread` and `wedge-dash-methane`.

### `u1-l03-s02` · Build · Explain

- **Prompt:** "Why that shape? Count the **electron domains** around the central atom. Each bond is one domain, and a double or triple bond still counts as **one**. Each lone pair is one domain too.
  Domains are clouds of negative charge, so they push each other as far apart as they can. That's the **VSEPR** model (valence-shell electron-pair repulsion):
  2 domains → a **line** · 3 → a flat **triangle** · 4 → a **tetrahedron**, a pyramid with four triangular faces.
  Methane's carbon has 4 bonds, so 4 domains: a tetrahedron."
- **Visual / Scene:** `domain-spread`, autoplays once. Screen reader: "Three panels. Two balloons on a centre push apart until they point in opposite directions: a line, model angle 180 degrees. Three balloons spread into a flat triangle, model angle 120 degrees. Four balloons spread to the corners of a tetrahedron, model angle 109.5 degrees."
- **Source note:** "Molecules aren't flat, and VSEPR sets their shape: after MIT OCW 5.12, Lecture 1 p. 13, Berkowski, Spring 2005, CC BY-NC-SA 4.0. The angles in this animation are the model's predictions, not measurements."

### `u1-l03-s03` · Build · Rotate-and-identify 3D

- **Prompt:** "Real methane, from measured data. Tap an H, the C, then another H to measure an angle. Try a few different pairs. What do you find?"
- **Visual:** `molecule-card`, methane, ball and stick, `startView: tilted` (no two H's in an obvious line with C).
- **Interaction:** rotate and measure freely, then pick one. `a` every H–C–H angle is the same · `b` some angles are right angles, some are wider · `c` some pairs of H's sit in a straight line through C
- **Answer:** {a}
- **Correct line:** "All six H–C–H angles read {methane.angle.HCH}°: the four H's are perfectly spread. The tetrahedron model predicts 109.5°, and methane matches it."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Measure two or three more pairs: H, then C, then a different H. Does any of them read as a right angle?" |
  | `c` | "Pick two H's that look opposite, with C between them. If they were in a straight line the angle would be 180°. What does it read?" |
  | *(any other)* | "Tap H, C, H for different pairs and compare the readouts." |

- **Reveal:** the viewer measures three pairs in turn, each reading {methane.angle.HCH}°: "Every pair gives the same angle. That's a tetrahedron."
- **Describe text:** "Methane. Carbon in the centre, four hydrogens at the corners of a tetrahedron, each {methane.len.CH} ångströms from carbon. Every H–C–H angle is {methane.angle.HCH} degrees."
- **Source note:** methane geometry note.

### `u1-l03-s04` · Build · Numeric input

- **Prompt:** "Ammonia, NH₃. How many electron domains surround the nitrogen?"
- **Visual:** Lewis NH₃, the lone pair on N as cyan dots.
- **Interaction:** number pad.
- **Answer:** 4 domains, ±0.
- **Correct line:** "Three bonds plus one lone pair: 4 domains. So they spread out like methane's."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 3 | "You counted the bonds. The lone pair on N is a domain too: it pushes just like a bond does." |
  | 5 | "A lone pair is one domain, not two. Count the bonds, then add one per lone pair." |
  | 8 | "That's the electron count. Count groups instead: each bond is one, each lone pair is one." |
  | 1 | "That's just the lone pair. Add the bonds to H." |
  | *(any other)* | "Count each bond to N once and each lone pair on N once." |

- **Reveal:** the three bonds and the lone pair light up one by one, counting 1, 2, 3, 4.
- **Source note:** n/a.

### `u1-l03-s05` · Build · Explain

- **Prompt:** "The **shape** is named by where the **atoms** are. Lone pairs push, but you can't see them in the shape. With 4 domains:
  4 bonds → **tetrahedral** (CH₄)
  3 bonds + 1 lone pair → **trigonal pyramidal**, a tripod (NH₃)
  2 bonds + 2 lone pairs → **bent** (H₂O)
  A lone pair is held by only one nucleus, so it spreads wider and squeezes the bonds a little closer. Measured: CH₄ {methane.angle.HCH}°, NH₃ {ammonia.angle.HNH}°, H₂O {water.angle.HOH}°."
- **Scene:** `four-domain-family`, opens side on; drag any card to turn all three. Screen reader: "Three molecules side by side. Methane: four hydrogens, tetrahedral, H–C–H {methane.angle.HCH} degrees. Ammonia: three hydrogens below the nitrogen and one lone pair above, trigonal pyramidal, H–N–H {ammonia.angle.HNH} degrees. Water: two hydrogens and two lone pairs, bent, H–O–H {water.angle.HOH} degrees. The tetrahedron model predicts 109.5 degrees for all three."
- **Source note:** the three geometry notes (same method for all three; see Geometry).

### `u1-l03-s06` · Build · Rotate-and-identify 3D

- **Prompt:** "Water, H₂O. Turn it around. Which name fits its shape?"
- **Visual:** `molecule-card`, water, `startView: end-on` (looking down the H···H line, so the bend is hidden until the Student rotates).
- **Interaction:** rotate, then pick one. `a` linear · `b` bent · `c` trigonal pyramidal · `d` tetrahedral
- **Answer:** {b}
- **Correct line:** "Bent: O has 4 domains, but only 2 of them hold atoms. The shape is named by the three atoms, and they make a V."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "Rotate a quarter turn (↻). Do the two H's and the O line up?" |
  | `d` | "Tetrahedral describes O's four domains. The shape is named only by the atoms. How many atoms are there?" |
  | `c` | "A pyramid needs three atoms around the centre. Water's O holds two." |
  | *(any other)* | "Count the atoms around O and look at the angle they make." |

- **Reveal:** the model turns side on and the angle {water.angle.HOH}° is drawn: "Two bonds and two lone pairs: bent."
- **Describe text:** "Water. Oxygen in the middle bonded to two hydrogens, {water.len.OH} ångströms each. The H–O–H angle is {water.angle.HOH} degrees, so the molecule is bent."
- **Source note:** water geometry note.

### `u1-l03-s07` · Build · Multiple choice

- **Prompt:** "Formaldehyde, H₂C=O. Count carbon's electron domains. What shape is it around C?"
- **Visual:** Lewis H₂C=O, two lone pairs on O.
- **Interaction:** pick one.
  - `a` 3 domains: flat triangle (trigonal planar)
  - `b` 4 domains: tetrahedral
  - `c` 3 domains: trigonal pyramidal
  - `d` 2 domains: linear
- **Answer:** {a}
- **Correct line:** "The double bond's electrons sit between the same two atoms, so they push as one domain. Three domains: a flat triangle."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Carbon has four bonds' worth of electrons, but the C=O double bond points one way. It counts as one domain." |
  | `c` | "A pyramid needs a lone pair on the centre. Does carbon have one here?" |
  | `d` | "Count carbon's neighbours: two H's and one O." |
  | *(any other)* | "Count the atoms bonded to C, plus any lone pairs on C. A double bond counts once." |

- **Reveal:** `molecule-card` with formaldehyde turns edge on (all four atoms in one line of sight, so it's flat), then face on with the angles drawn: "Three domains, all four atoms in one plane. Measured: H–C–H {formaldehyde.angle.HCH}°, H–C=O {formaldehyde.angle.HCO}°, near the model's 120°. The double bond's extra electrons take a little more room."
- **Describe text (reveal):** "Formaldehyde. Carbon bonded to two hydrogens and double-bonded to oxygen, all four atoms in one plane. H–C–H {formaldehyde.angle.HCH} degrees, H–C=O {formaldehyde.angle.HCO} degrees."
- **Source note:** formaldehyde geometry note.

### `u1-l03-s08` · Build · Explain

- **Prompt:** "To put 3D on paper, chemists use three kinds of bond line:
  **line**: in the plane of the page
  **wedge** (solid): coming toward you
  **dash** (hashed): going away, behind the page
  A tetrahedral carbon is drawn with **two lines** in a V, and a **wedge and a dash** side by side in the gap opposite the V."
- **Scene:** `wedge-dash-methane`, autoplays once. Screen reader: "Methane turns until two hydrogens lie on a sheet, the page. Those two bonds become plain lines in a V. The hydrogen in front of the sheet gets a solid wedge, the one behind gets a hashed wedge. The finished drawing: two lines, one wedge and one dash, the wedge and dash next to each other opposite the V."
- **Source note:** "Line, wedge and dash conventions and the perspective drawing of methane adapted from MIT OCW 5.12, Lecture 1 p. 13, Berkowski, Spring 2005, CC BY-NC-SA 4.0." Plus the methane geometry note.

### `u1-l03-s09` · Build · Rotate-and-identify 3D (signature)

- **Prompt:** "Ethanol, CH₃CH₂OH. Turn the model until the O and both carbons lie flat on the page (the badge says **In the page**). Now look at the two H's on the carbon bonded to O. Where are they?"
- **Visual:** `molecule-card`, ethanol, labels C1 (the CH₂ bonded to O) and C2, `pageSheet: true` through C1, `startView: off-page` (the O–C1–C2 plane turned well away from the screen plane). The badge "In the page" appears, with an outline that turns solid, when the O–C1–C2 plane is within 10° of the screen plane: text, not colour alone. A "Snap to page" button appears after the first wrong try.
- **Interaction:** rotate, then pick one. `a` both in the page · `b` one toward you, one away · `c` both toward you · `d` both away
- **Answer:** {b}
- **Correct line:** "Two bonds in the page means the other two straddle it: one in front, one behind. That's why every tetrahedral carbon is drawn line, line, wedge, dash."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "Turn the model a quarter turn (↻) so you see the page edge on. Does either H sit on it?" |
  | `c` or `d` | "Look at the page edge on (↻). The two H's are mirror images across it. Can both be on the same side?" |
  | *(any other)* | "Get the badge to say In the page, then look at the page edge on: which side is each H on?" |

- **Reveal:** the model snaps to the page view, then turns edge on; one H is labelled "toward you: wedge", the other "away: dash", and the wedge-and-dash drawing of ethanol fades in beside it.
- **Describe text:** "Ethanol. C2 is bonded to C1, and C1 is bonded to the oxygen, which carries one hydrogen. With oxygen and both carbons in the page, one hydrogen on C1 points toward you and the other points away. The H–C1–H angle is {ethanol.angle.HC1H} degrees." The Describe text updates to "in the page" or "not in the page" as the Student rotates.
- **Source note:** ethanol geometry note.

### `u1-l03-s10` · Build · Multiple choice (structure cards)

- **Prompt:** "Which drawing shows a carbon's four bonds correctly in 3D?"
- **Interaction:** four structure cards of CH₄, one correct.
  - `a` lines to the top H and the left H; wedge and dash side by side, lower right
  - `b` lines to the top H and the left H; wedge lower right, dash between the two lines (upper left)
  - `c` four plain lines at right angles (the flat Lewis drawing)
  - `d` lines to the top H and the left H; two wedges, lower right
- **Answer:** {a}
- **Correct line:** "Two in-page bonds make a V, and the other two share the gap opposite: one in front, one behind."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "The two in-page lines make a V. The wedge and dash both belong in the gap opposite the V, not inside it." |
  | `c` | "That's the flat Lewis drawing. It's fine for counting bonds but says nothing about 3D." |
  | `d` | "With two bonds in the page, the other two are mirror images across it. They can't both come toward you." |
  | *(any other)* | "Two lines in a V, then a wedge and a dash side by side opposite the V." |

- **Reveal:** `a` ringed; one line on each wrong card ("dash on the wrong side", "flat", "two wedges can't both be in front").
- **Source note:** "Perspective drawing after MIT OCW 5.12, Lecture 1 p. 13, CC BY-NC-SA 4.0."

### `u1-l03-s11` · Build · Rotate-and-identify 3D

- **Prompt:** "Polar bonds, but is the **molecule** polar? Shape decides. Each bond dipole pulls toward δ−; press **Add** to put the pulls tip to tail, like a tug-of-war. (CO₂'s carbon has 2 domains, two double bonds, so it's a line.) Which molecule is polar overall?"
- **Visual / Scene:** `dipole-sum`, segmented toggle **H₂O | CO₂** above one viewer card, `added: false`.
- **Interaction:** toggle, rotate, press Add on each, then pick one. `a` water only · `b` CO₂ only · `c` both · `d` neither
- **Answer:** {a}
- **Correct line:** "Water is bent, so both pulls lean toward O and add up: polar. CO₂ is straight, so its two equal pulls point opposite ways and cancel: nonpolar, even though each C=O bond is polar."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `c` | "Both have two polar bonds. Now press Add on CO₂: its arrows point in exactly opposite directions. Equal and opposite pulls cancel." |
  | `b` | "CO₂ is a straight line. Press Add: what's left when two equal arrows point opposite ways?" |
  | `d` | "Water is bent. Press Add on water: both arrows lean toward O's side. Do they cancel?" |
  | *(any other)* | "Press Add on each. A net arrow means polar; 'net: zero' means nonpolar." |

- **Reveal:** both added, side by side: water's net arrow pointing from between the H's toward O, labelled "polar"; CO₂'s ring "net: zero", labelled "nonpolar". "Polar bonds aren't enough. The shape has to let the pulls add up."
- **Scene:** `dipole-sum`. Screen reader (water): "Water, bent. Two bond-dipole arrows point from each hydrogen toward oxygen. Added tip to tail, they give one net arrow pointing toward oxygen: water is polar." (CO₂): "Carbon dioxide, a straight line. Two equal bond-dipole arrows point from carbon toward each oxygen, in opposite directions. Added, they cancel: net zero, nonpolar."
- **Source note:** water and carbon dioxide geometry notes; "Arrow lengths from Pauling electronegativity differences (the values Lesson 1 cites), a rough guide, not to scale."

### `u1-l03-s12` … `s14` · Check

The three Check Problems below, in order.

### `u1-l03-s15` · Wrap · Explain (big-statement card)

- **Prompt:** "**Molecules aren't flat. Electron domains push apart, and that sets the shape.**
  2 domains: line · 3: flat triangle · 4: tetrahedron, with lone pairs hidden from the shape's name.
  Line in the page, wedge toward you, dash away.
  Polar bonds make a polar molecule only if the shape lets them add up."
- **Scene:** `four-domain-family`, final frame. Screen reader: "Methane tetrahedral, ammonia trigonal pyramidal, water bent."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Hybridization & Orbitals**, secondary Back to Unit.
- **Source note:** n/a.

---

## Check Problems

Every Problem's geometry Source note is the molecule's note from Geometry above. Problems adapted from MIT add: "Adapted from MIT OCW 5.12, Problem Set 1 Q<n>, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-3d-flat-or-pyramid` · Rotate-and-identify 3D · difficulty 1

- **Tags:** Unit 1, Lesson 3 · **Status:** draft
- **Prompt:** "BF₃ and NH₃ each have three atoms around a central atom. Turn both. Which one is flat, with all four atoms in one plane?"
- **Visual:** `molecule-card` with a segmented toggle **BF₃ | NH₃**, both `startView: face-on` (looking down the threefold axis, where the two look alike). Lewis drawings beside the toggle: B with three bonds and no lone pair; N with three bonds and one lone pair.
- **Interaction:** toggle, rotate, pick one. `a` BF₃ only · `b` NH₃ only · `c` both · `d` neither
- **Answer:** {a}
- **Correct line:** "Boron has three domains, so they spread into a flat triangle. Nitrogen has four, one a lone pair, so its H's form a tripod below it."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Count N's domains: three bonds and a lone pair make four, so they spread like methane's. Turn NH₃ side on." |
  | `c` | "Seen from the top they look alike. Turn both side on. NH₃ has something BF₃ doesn't: a lone pair." |
  | `d` | "Boron has three bonds and no lone pair: three domains. How do three domains spread?" |
  | *(any other)* | "Count the domains on B and on N, then turn each model side on." |

- **Reveal:** both models turn side on: BF₃ reads as a flat line of atoms, NH₃ as a tripod. "BF₃: 3 domains, flat, F–B–F {bf3.angle.FBF}°. NH₃: 4 domains, pyramid, H–N–H {ammonia.angle.HNH}°."
- **Describe text:** "Boron trifluoride: boron bonded to three fluorines, all four atoms in one plane, F–B–F {bf3.angle.FBF} degrees." / "Ammonia: nitrogen bonded to three hydrogens that sit below it like a tripod, with a lone pair on top; H–N–H {ammonia.angle.HNH} degrees."
- **Scene:** n/a (viewer only).
- **Source note:** boron trifluoride and ammonia geometry notes. Boron's three bonds follow Lesson 1.

### `u1-3d-perspective` · Rotate-and-identify 3D · difficulty 2

- **Tags:** Unit 1, Lesson 3 · **Status:** draft · **Source:** PS1 Q2a
- **Prompt:** "This is 2-fluorobutane, drawn one way (left) and partly drawn from another angle (right). Turn the 3D model until F and H sit as in the right-hand drawing. Then: which group goes on the dash, and which on the wedge?"
- **Visual:** left, the full drawing around one central C: CH₂CH₃ up (line), CH₃ lower left (line), F right (dash), H below (wedge). Right, the partial drawing: F upper right (line), H down (line), an empty dash upper left, an empty wedge straight up. Below, `molecule-card` with `geometry/2-fluorobutane-r.json`, `startView: as-left-drawing`, groups labelled F, H, CH₃, CH₂CH₃.
- **Interaction:** rotate, then pick one.
  - `a` CH₃ on the dash, CH₂CH₃ on the wedge
  - `b` CH₂CH₃ on the dash, CH₃ on the wedge
  - `c` either way: it's the same molecule
- **Answer:** {a}
- **Correct line:** "CH₃ goes back on the dash and CH₂CH₃ comes forward on the wedge. Same molecule, just turned."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Turn the model so F points upper right and H points down, both in the page. Now which group comes toward you?" |
  | `c` | "Swap two groups and you get the mirror image, a different molecule (a later Unit explains why that matters). Only one completion matches the model." |
  | *(any other)* | "Turn the model until F and H sit in the page as drawn, then read the other two: toward you is the wedge, away is the dash." |

- **Reveal:** the model turns from the left view to the right view; CH₃ slides onto the dash and CH₂CH₃ onto the wedge, and the finished right-hand drawing appears.
- **Describe text:** "2-fluorobutane. The central carbon holds a fluorine, a hydrogen, a methyl group and an ethyl group at the corners of a tetrahedron." In the right-hand view it adds: "Fluorine upper right and hydrogen below, both in the page; methyl upper left, away from you; ethyl straight up, toward you."
- **Scene:** n/a (viewer only).
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q2a and its key, Berkowski, Spring 2005, CC BY-NC-SA 4.0." Plus the computed 2-fluorobutane geometry note.

### `u1-3d-polar-molecules` · Multiple choice (multi-correct) · difficulty 2

- **Tags:** Unit 1, Lesson 3 · **Status:** draft
- **Prompt:** "Every one of these has polar bonds. Which molecules are polar overall? Pick all that apply."
- **Interaction:** five structure cards, each in its 3D drawing (lines, wedges and dashes), lone pairs shown.
  - `a` H₂O (bent, two lines)
  - `b` CO₂ (straight line)
  - `c` CCl₄ (two Cl lines, one wedge, one dash)
  - `d` CH₂Cl₂ (two Cl lines, H wedge, H dash)
  - `e` NH₃ (lone pair up; one H line, one wedge, one dash)
- **Answer:** {a, d, e}
- **Correct line:** "Water, dichloromethane and ammonia: their pulls lean one way. CO₂ and CCl₄ are so symmetric that every pull is balanced by another."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes `b` | "CO₂ is a straight line: its two equal C=O pulls point in opposite directions and cancel." |
  | includes `c` | "CCl₄'s four C–Cl pulls point to the corners of a tetrahedron, all equal. They balance perfectly." |
  | misses `d` | "Swap two of CCl₄'s Cl's for H's: the pulls are no longer equal. The Cl side wins." |
  | misses `e` | "NH₃ is a pyramid: all three N–H pulls lean toward N's side. They add up." |
  | misses `a` | "Water is bent, so its two pulls lean the same way." |
  | *(any other)* | "Polar bonds aren't enough. Picture the pulls added tip to tail: does anything survive?" |

- **Reveal:** `dipole-sum` (`added: true`) plays for each card in turn: three end on a net arrow ("polar"), two on "net: zero" ("nonpolar").
- **Scene:** `dipole-sum`, on reveal. Screen reader per molecule: "<molecule>: <shape>. <n> bond-dipole arrows, added tip to tail: <a net arrow pointing toward … | they cancel, net zero>. <Polar | Nonpolar>."
- **Source note:** the five geometry notes; "Arrow lengths from Pauling electronegativity differences (the values Lesson 1 cites), a rough guide, not to scale."
