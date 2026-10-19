# Lesson 4: Hybridization & Orbitals

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md). Ticket: [Specify Lesson 4: Hybridization & Orbitals](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/25). Written by an agent under the owner's 2026-10-19 delegation (see [the map](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/1)); the judgment calls are listed in the PR.

## Shape checks

- [x] 15 Steps: Hook 1, Build 9, Check 4, Wrap 1
- [x] Explain Steps at 2, 4, 6, 9, 15, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Every measured or computed number is a pipeline field in curly braces with a Source note. The only numbers typed here are the hybrid model's own angles (109.5°, 120°, 180°) and the p orbitals' 90°, always named as the model's prediction next to the measured value, plus counting answers.
- [x] Bond lengths shown to 2 decimals in Å, angles to 1 decimal; full values in the Source note
- [x] No Tap-to-identify Step sits among Draw-arrows Steps (this Lesson has no Draw-arrows Steps)
- [x] Nothing taken from material excluded by the source's licence: Lecture 1 pp. 13–14 carry no Moore credit (Moore-credited pages are pp. 5–11 and 18). The orbital pictures on pp. 13–14 are not reused either: every orbital here is our own model drawing or our own calculation. PS1 Q7 and Q14 are not used.

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l04` |
| Title | Hybridization & Orbitals |
| Goal | Assign sp³, sp² or sp to an atom by counting its groups, predict its bond angles, and tell a σ bond (head-on, on the axis) from a π bond (side-on p overlap, above and below the plane), counting σ + π in double and triple bonds. |
| Prerequisites | Lesson 0 (carbon makes four bonds), Lesson 1 (boron's sextet in BF₃, reused for BeCl₂), Lesson 2 (reading Kekulé drawings), Lesson 3 (electron domains → tetrahedral / trigonal planar / linear, measured angles, the 3D Step card) |
| Key idea | Carbon mixes its orbitals to match its groups (four sp³, three sp², two sp) and builds a σ framework from head-on overlaps; leftover p orbitals overlap side-on as π bonds above and below it. |
| Check Problems | `u1-hyb-pi-count`, `u1-hyb-tap-sp2`, `u1-hyb-becl2`, `u1-hyb-ketene-pi` |
| Sources | MIT OCW 5.12 *Organic Chemistry I*, Spring 2005, Kimberly Berkowski, CC BY-NC-SA 4.0: Lecture 1 p. 13 lower slide ("Orbital Drawings I": 2s and 2p atomic orbitals), p. 14 upper slide ("Orbital Drawings II": sp³ / sp² / sp sets and their angles), p. 14 lower slide ("Orbital Drawings III": ethylene and acetylene, σ and π); Problem Set 1 Q5 with the key (p. 3). All wording is ours; no figure is reused. Lecture 1 p. 13 upper slide (wedges, VSEPR) belongs to Lesson 3. Geometries: NIST CCCBDB, SRD 101, Release 22 (references per value, see Data notes). Orbitals: our own PySCF calculations, labelled "computed". |
| Structure drawing | 3D molecules use the `molecule-card` (ball-and-stick by default, every atom carries its letter in JetBrains Mono, Jmol colours). 2D drawings are full Kekulé: every C and H as a letter (so groups can be counted), every lone pair as cyan dots (acrylonitrile's N, BeCl₂'s Cl's). All drawn by the site's own renderer; RDKit.js parses and lays out only. |

**Orbital drawing rule (whole Lesson).** Colour says what an orbital is, the pattern says its sign, and a text chip names it, so nothing is colour-only:
- hybrid orbitals and σ bond orbitals: ignite orange; p orbitals and π bond orbitals: electron cyan;
- the two signs (phases) of one orbital: one lobe solid, the other hatched (the "shading" MIT's PS1 Q5 asks for);
- every shown orbital carries a chip: `2s`, `2p`, `sp³`, `sp²`, `sp`, `σ`, `π`.

Two honesty labels, always visible on the Scene frame:
- **"model"**: hybrid-orbital shapes built from textbook hydrogen-like 2s and 2p orbitals mixed in the textbook proportions. A picture of the idea, not a calculation on a real molecule.
- **"computed"**: bond orbitals from our PySCF calculation (see Orbital data notes).

### New Scenes

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `methane-unmixed-vs-real` | s01 reveal | R3F, rotatable. Left panel, labelled "model: if carbon used its orbitals unmixed (not a real molecule)": three H's at the tips of the three 2p lobes, at right angles, and a fourth H on the round 2s sphere, drawn dashed with a "?" because a sphere points nowhere. Right panel, labelled "measured": methane in the `molecule-card`, all six H–C–H angles drawn and read out, all four C–H lengths labelled. | `panel: unmixed \| real \| both` | `geometry/methane.json` | both panels, labels shown |
| `hybrid-mixing` | s02 | Watch-only, a **silent plain Manim CE render** (16:9 and 9:16, 30 fps, about 10 s; same rule as Lesson 0's `star-forge`). One 2s sphere and three 2p dumbbells (solid/hatched lobes) slide to the centre, blend, and split into four sp³ lobes that swing out to the corners of a tetrahedron. A counter writes "4 in → 4 out"; the "model" label stays on screen. | `set: sp3 \| sp2 \| sp` (this Lesson uses `sp3`; the other two are rendered for the future video channel) | the analytic model in `pipelines/orbitals/hybrid_model.py` (no measured numbers) | the last frame: four sp³ lobes in a tetrahedron, "4 in → 4 out" |
| `hybrid-sets` | s04 | R3F, rotatable. A carbon with one hybrid set at a time: orange hybrid lobes with chips, cyan leftover p orbitals with chips, and the model angle drawn between two lobes ("model: 109.5°", "model: 120°", "model: 180°"). A translucent plane appears for sp² (the three lobes lie in it; the p stands at right angles to it). | `set: sp3 \| sp2 \| sp \| all` (segmented toggle) | `orbitals/model/sp3.glb`, `sp2.glb`, `sp.glb`, `p.glb` (meshed from the same analytic model) | `all`: the three sets side by side, chips and model angles shown |
| `molecule-card` | s05, s10 | The 3D viewer Step card decided in [Prototype: 3D molecule viewer at true scale](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/13) (variant A): tap 2 atoms = distance, 3 = angle, Ball & stick ⟷ True scale, ↺/↻, 1 Å scale bar, "ⓘ Where these numbers come from". **One shared Scene id with Lesson 3**: whichever Lesson is built first registers it. New here: an optional segmented molecule switcher, and `autoMeasure` (a bond measured and labelled on load). | `molecule`, `switcher: [molecules]`, `autoMeasure: [atom ids]` | `geometry/<molecule>.json` | the molecule in its starting view with any `autoMeasure` label shown |
| `ethylene-sigma-pi` | s06, s07, s15 | R3F, rotatable. Ethylene at its measured geometry with computed bond orbitals: the C–C σ (orange) and the C=C π (cyan, solid lobe above the plane, hatched below). A toggle shows the molecular plane as a translucent sheet. | `show: sigma \| pi \| both`, `view: face-on \| edge-on`, `plane: on \| off` | `geometry/ethylene.json`, `orbitals/ethylene/manifest.json` | `both`, edge-on, plane on: σ on the axis, π above and below |
| `pi-twist` | s08 | R3F, Manipulate. Ethylene's σ framework with one model p orbital per carbon. A slider twists the right-hand CH₂ group about the C–C axis (0° to 180°, 15° stops); its p orbital turns with it. A bar labelled "π overlap (model)" shrinks to nothing at 90° and returns as the orbitals line up again (flipped, solid meets hatched, the sign chip says so). No numbers on the bar. | `twist` (slider, keyboard ←/→) | the analytic model; ethylene frame from `geometry/ethylene.json` | twist 0°, full bar, both p orbitals upright and parallel |
| `acetylene-sigma-pi` | s09 | R3F, rotatable. Acetylene at its measured geometry with computed bond orbitals: C–C σ, π₁ (above and below), π₂ (front and back), and the two π's summed into one tube of density around the axis. | `show: sigma \| pi1 \| pi2 \| pi-both \| all` | `geometry/acetylene.json`, `orbitals/acetylene/manifest.json` | `all`, three-quarter view: σ on the axis, the π tube around it |
| `ketene-pi` | `u1-hyb-ketene-pi` | R3F, rotatable. Ketene at its measured geometry with its two computed π bond orbitals: C=C π and C=O π, each with its chip. Starts end-on (looking down the C=C=O axis) so the planes have to be found by spinning. A plane toggle shows the H–C–H plane. | `show: cc-pi \| co-pi \| both`, `view: end-on \| side`, `plane: on \| off` | `geometry/ketene.json`, `orbitals/ketene/manifest.json` | `both`, side view, H–C–H plane on |

**Every rotatable Scene** follows #11 and #13: drag or arrow keys rotate, +/- zoom, `[`/`]` move between atoms, Enter picks; a **Describe** button reads the arrangement aloud (its text is the Scene's screen-reader line); no idle spin in reduced motion. These are interactive, so they are R3F, not Manim. The one watch-only Scene, `hybrid-mixing`, is a silent plain Manim render.

### Geometry data notes

All five molecules have complete experimental Cartesians in CCCBDB (checked live on 2026-10-19), so **no computed geometry is used** in this Lesson. The build fetches each page once at ≥8 s spacing and stores it, per [Research: NIST CCCBDB coverage](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/19).

| Data file | Molecule (SMILES, PubChem CID) | CCCBDB CAS | Values the Lesson shows | References CCCBDB lists |
|---|---|---|---|---|
| `geometry/methane.json` | `C`, CID 297 | 74-82-8 | `{methane.r.CH}`, `{methane.a.HCH}` | Hirota 1979 (C–H), Sverdlov et al. 1974 (angle) |
| `geometry/ethane.json` | `CC`, CID 6324 | 74-84-0 | `{ethane.r.CC}` | Herzberg 1966 |
| `geometry/ethylene.json` | `C=C`, CID 6325 | 74-85-1 | `{ethylene.r.CC}`, `{ethylene.a.HCH}`, `{ethylene.a.HCC}` | Herzberg 1966 |
| `geometry/acetylene.json` | `C#C`, CID 6326 | 74-86-2 | `{acetylene.r.CC}` | Kuchitsu 1998 (lengths), Herzberg 1966 (angle) |
| `geometry/ketene.json` | `C=C=O`, CID 10038 | 463-51-4 | none shown (orbital Scene only; tapping still works) | Kuchitsu 1998 |

- **Consistency check (new, all molecules):** the distances and angles computed from the stored Cartesians must match CCCBDB's internal-coordinate table within 0.001 Å and 0.1°. **Ketene fails it today**: its Cartesian table on CCCBDB was built from different values than its own listed internal coordinates. For any molecule that fails, the build rebuilds the Cartesians from the listed internal coordinates (ketene's are complete, C2v) and records that in the data file, so a tapped value always equals the cited one.
- **Point-group labels are not shown** (CCCBDB mislabels ethane as D3h; its coordinates are staggered D3d).
- **Display:** lengths to 2 decimals in Å, angles to 1 decimal. The C–C lengths in s10 come from different structure types (CCCBDB marks acetylene's as rm; ethane's and ethylene's are Herzberg's); the differences between types are far smaller than the single/double/triple trend, and the Source note says so.
- **Source note (each molecule):** "Geometry: experimental (gas phase). <values> from <references>, via NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z. Other distances and angles are derived from these values." Full values (CCCBDB's own precision) go in the note.
- **Licence:** the stored CCCBDB-derived files carry the NIST notice and are not under the code's MIT licence (open item from #19, still for a human).

### Orbital data notes

- **What is computed:** for ethylene, acetylene and ketene, a single-point B3LYP/cc-pVTZ calculation with PySCF **at the experimental geometry above** (so the atoms in every orbital Scene sit exactly where the card measures them), then **intrinsic bond orbitals** (IBO, Knizia, *J. Chem. Theory Comput.* 9, 4834 (2013); `pyscf.lo.ibo`) over the valence occupied orbitals. Each orbital is written as a cube file (`cubegen`) and meshed to glTF at one isovalue for the whole Lesson, recorded in the manifest. Per #4 and #3: offline only, shipped as meshes.
- **Why IBO and not Boys:** Boys localisation turns a double bond into two identical bent "banana" bonds, which would contradict the σ + π picture this Lesson teaches. IBO (and Pipek–Mezey, the fallback) keep σ and π apart.
- **Acetylene's two π orbitals** are equivalent, so any rotation of the pair about the axis is equally correct. The build rotates them to lie in the two axis-aligned planes, and `pi-both` meshes their summed density.
- **Not computed:** the hybrid orbitals themselves (`hybrid-sets`, `hybrid-mixing`, `pi-twist`) are the labelled "model". Canonical molecular orbitals, bonding/antibonding and HOMO/LUMO are Lesson 8's and do not appear here.
- **Sanity check at build time** (not shown to Students):
  - ethylene: exactly one valence IBO is antisymmetric through the molecular plane (the π), centred on the two carbons; the C–C σ is symmetric through it;
  - acetylene: two π IBOs, each antisymmetric through a plane containing the axis, the two planes at right angles; the summed π density is the same (within 2%) at every angle around the axis;
  - ketene: the C=C π is antisymmetric through the H–C–H plane; the C=O π is antisymmetric through the plane at right angles to it that contains the C=C=O axis;
  - every IBO's sign is fixed so the larger lobe of a π orbital is the "solid" one above the plane (or in front), so the solid/hatched pattern is stable between builds.
- **Source note (orbital Scenes):** "Orbitals: computed, not measured. Intrinsic bond orbitals (Knizia 2013) from a B3LYP/cc-pVTZ calculation with PySCF <version> (our calculation, <date>) at the experimental geometry, drawn at the isovalue in the manifest. Bond orbitals are one honest way to divide a molecule's electrons into bonds; Lesson 8 shows another."
- **Source note (model Scenes):** "Model, not computed: textbook hydrogen-like 2s and 2p orbitals mixed into hybrids. Hybrid orbitals are a way to picture bonding, not something measured. Adapted from MIT OCW 5.12, Lecture 1 pp. 13–14, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

---

## Steps

### `u1-l04-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "Carbon's four outer electrons live in one round **2s** orbital and three **2p** orbitals, which point at right angles (90°) to each other. If carbon bonded four H's straight onto those orbitals as they are, what would methane look like?"
- **Visual:** a small static drawing of the 2s sphere and the three 2p dumbbells on x, y, z (model, solid/hatched lobes, chips).
- **Interaction:** pick one. `a` four identical C–H bonds in a perfect tetrahedron · `b` three H's at right angles to each other, plus a fourth one that's different · `c` a flat square of four H's
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `methane-unmixed-vs-real` (`both`). "Unmixed orbitals would give **b**: three bonds at right angles and an odd one out. Real methane (you met it in Lesson 3) has four identical C–H bonds, {methane.r.CH} Å each, and every H–C–H angle is {methane.a.HCH}°. So carbon doesn't bond with its orbitals as they come. It **mixes** them first."
- **Scene:** `methane-unmixed-vs-real`, plays on reveal. Screen reader: "Left, a model that is not a real molecule: three hydrogens sit on three p orbitals at right angles, and a fourth sits on the round s orbital with a question mark. Right, real methane, measured: four identical C–H bonds of {methane.r.CH} ångströms, and all six H–C–H angles {methane.a.HCH} degrees."
- **Source note:** methane geometry (Geometry data notes). "The left panel is a model, not a molecule."

### `u1-l04-s02` · Build · Explain

- **Prompt:** "Each p orbital has two lobes of opposite sign, drawn solid and hatched.
  Before it bonds, carbon **mixes** its 2s with its three 2p orbitals. Four orbitals go in, four come out: four identical **sp³** hybrid orbitals, each mostly one big lobe.
  Four equal lobes spread as far apart as they can, to the corners of a tetrahedron. The model predicts 109.5° between them, just what methane shows. This mixing is called **hybridization**."
- **Visual / Scene:** `hybrid-mixing` (`sp3`), autoplays once. Screen reader: "One round 2s orbital and three dumbbell-shaped 2p orbitals slide together and blend. Four identical sp3 orbitals come out, each one big lobe, and swing out to the four corners of a tetrahedron. Four in, four out. Labelled: model."
- **Source note:** model Scene note (Orbital data notes).

### `u1-l04-s03` · Build · Numeric input

- **Prompt:** "Now carbon mixes its 2s with only **two** of its 2p orbitals. How many hybrid orbitals come out?"
- **Visual:** a static row: `2s` + `2p` + `2p` → ?, and a third `2p` set aside, dimmed.
- **Interaction:** number pad; unit "hybrid orbitals" shown beside the box.
- **Answer:** 3 hybrid orbitals, ±0.
- **Correct line:** "Three in, three out: three **sp²** hybrids. The third 2p orbital stays out of the mix, unchanged."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 2 | "You mixed three orbitals: one s and two p. Mixing never creates or loses orbitals: what goes in comes out." |
  | 4 | "Only two of the three p orbitals join in. The third stays out of the mix." |
  | 1 | "Mixing makes several equal orbitals, not one big one. Count how many go in." |
  | *(any other)* | "Count the orbitals that go into the mix. The same number comes out." |

- **Reveal:** "One 2s + two 2p = three sp² hybrids, with one 2p left over." The row fills in.
- **Source note:** n/a (counting).

### `u1-l04-s04` · Build · Explain

- **Prompt:** "How many p orbitals join the mix depends on how many **groups** the atom points at: bonded atoms plus lone pairs, Lesson 3's electron domains. A double or triple bond counts as **one** group.
  **4 groups → sp³**: s + 3 p, four hybrids, tetrahedral (model: 109.5°). No p left.
  **3 groups → sp²**: s + 2 p, three hybrids in a plane (model: 120°). One p left, standing at right angles to that plane.
  **2 groups → sp**: s + 1 p, two hybrids in a line (model: 180°). Two p left, at right angles to each other."
- **Visual / Scene:** `hybrid-sets`, starts on `sp3`, steps to `sp2` and `sp` in time with the text, then lets the Student toggle and rotate. Screen reader: "sp3: four orange hybrid lobes to the corners of a tetrahedron, model angle 109.5 degrees. sp2: three orange lobes in a flat triangle, model angle 120 degrees, and one cyan p orbital standing straight up through the plane. sp: two orange lobes in a straight line, model angle 180 degrees, and two cyan p orbitals at right angles to the line and to each other."
- **Source note:** model Scene note. "Hybrid sets and their angles adapted from MIT OCW 5.12, Lecture 1 p. 14, Berkowski, Spring 2005, CC BY-NC-SA 4.0."

### `u1-l04-s05` · Build · Rotate-and-identify 3D

- **Prompt:** "Ethylene, H₂C=CH₂, measured. Tap H, C, H to measure an angle at one carbon. Which hybrid set do its carbons use?"
- **Visual / Scene:** `molecule-card` (`molecule: ethylene`), starting at a three-quarter view.
- **Interaction:** rotate and measure freely (not graded), then pick one. `a` sp³ · `b` sp² · `c` sp
- **Answer:** {b}
- **Correct line:** "Each carbon has three groups (two H's and the other carbon), so three sp² hybrids, all six atoms in one plane. The measured angles, {ethylene.a.HCH}° (H–C–H) and {ethylene.a.HCC}° (H–C–C), sit close to the model's 120°. Real angles shift a little because a C=C neighbour and an H neighbour aren't the same."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "sp³ needs four groups. Count what one carbon is bonded to: two H's and one carbon. The double bond is a single neighbour." |
  | `c` | "sp is for two groups in a straight line. Each carbon here has three neighbours, and the angles aren't 180°." |
  | *(any other)* | "Count the groups around one carbon, then match: 4 → sp³, 3 → sp², 2 → sp." |

- **Reveal:** `b`; the card turns edge-on to show all six atoms in one plane, with the H–C–H angle measured.
- **Scene:** Describe text: "Ethylene: two carbons joined by a double bond, each with two hydrogens. All six atoms lie in one flat plane. H–C–H {ethylene.a.HCH} degrees, H–C–C {ethylene.a.HCC} degrees."
- **Source note:** ethylene geometry (Geometry data notes).

### `u1-l04-s06` · Build · Explain

- **Prompt:** "Orbitals overlap in two ways.
  **σ (sigma):** head-on, along the line between the two nuclei. The shared electrons sit right on that line. Every single bond is a σ bond, and in ethylene the sp² hybrids make all five σ bonds: the **σ framework**.
  **π (pi):** each carbon's leftover p orbital stands upright, and side by side they overlap **above and below** the plane. No π electrons sit on the C–C line itself.
  So a double bond is **one σ + one π**."
- **Visual / Scene:** `ethylene-sigma-pi`, autoplays once: `sigma` edge-on, then `pi` added, then `both` with the plane on. Rotatable afterwards. Screen reader: "Ethylene, edge-on. An orange σ orbital sits on the line between the two carbons. Then a cyan π orbital appears as two lobes, one above the plane of the atoms and one below, with nothing on the line between the carbons. Labelled: computed."
- **Source note:** ethylene geometry + orbital Scene note. "σ and π in ethylene adapted from MIT OCW 5.12, Lecture 1 p. 14, CC BY-NC-SA 4.0."

### `u1-l04-s07` · Build · Rotate-and-identify 3D (signature)

- **Prompt:** "Here's ethylene with only its π bond shown, seen from straight above. Spin it. Where are the π electrons?"
- **Visual / Scene:** `ethylene-sigma-pi` (`show: pi`, `view: face-on`, `plane: off`). From above, the π lobes sit on top of the atoms and their position is hidden until the molecule is turned.
- **Interaction:** rotate (drag or arrow keys; plane toggle available), then pick one. `a` on the line between the two carbons · `b` above and below the plane of the six atoms · `c` in the plane, out between the H's · `d` wrapped around the C–H bonds
- **Answer:** {b}
- **Correct line:** "Side-on overlap puts the π electrons above and below the plane, with none in the plane itself. The line between the carbons belongs to the σ bond."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "That's where the σ bond lives. Turn the molecule until its plane is edge-on and look again." |
  | `c` | "Turn the plane edge-on: the π lobes stick out of the plane, not along it." |
  | `d` | "The C–H bonds are σ bonds. The π lobes sit over the two carbons only." |
  | *(any other)* | "Spin until you see the six atoms edge-on, as a line. Where are the cyan lobes?" |

- **Reveal:** the model turns edge-on, the plane switches on, and both lobes are labelled "above" and "below".
- **Scene:** Describe text: "Ethylene's π bond: one lobe above the plane of the six atoms and one below, both over the two carbons. Nothing lies in the plane."
- **Source note:** ethylene geometry + orbital Scene note.

### `u1-l04-s08` · Build · Manipulate a Scene

- **Prompt:** "A π bond needs its two p orbitals parallel. Twist one end of ethylene. Find the twist where the π overlap is gone, then press Check."
- **Visual / Scene:** `pi-twist`, slider under it from 0° to 180° in 15° stops.
- **Interaction:** drag the slider (keyboard ←/→) and press Check.
- **Answer:** twist = 90°.
- **Correct line:** "At 90° the two p orbitals are at right angles: no side-on overlap, no π bond. That's why a C=C bond doesn't spin: turning it means breaking the π bond. A σ bond alone, like ethane's C–C, can spin freely, because head-on overlap is the same at any twist."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 0° | "That's flat ethylene, full overlap. Start twisting." |
  | 15° – 75° | "Still overlapping a little. Keep twisting." |
  | 180° | "At 180° the p orbitals are parallel again, just flipped, so they overlap fully. Look in between." |
  | 105° – 165° | "Past the gap: the overlap is coming back. Go back a little." |
  | *(any other)* | "Watch the overlap bar and stop where it hits zero." |

- **Reveal:** the slider glides to 90°; the bar empties and the two p orbitals are shown at right angles, chip "no π bond".
- **Scene:** screen reader (live region updates per stop): "Twist {twist} degrees. π overlap: full / partial / none." At 90: "Twist 90 degrees. The two p orbitals are at right angles. π overlap: none."
- **Source note:** model Scene note. "The overlap bar is the model, not a calculation."

### `u1-l04-s09` · Build · Explain

- **Prompt:** "Acetylene, H–C≡C–H. Each carbon has two groups, so it's **sp**, and all four atoms sit in a straight line. The sp hybrids make the σ framework.
  Each carbon keeps **two** p orbitals at right angles to each other, so they overlap side-on twice: one π above and below, one in front and behind.
  A triple bond is **one σ + two π**. Together the two π bonds wrap the C–C line in a tube of electrons."
- **Visual / Scene:** `acetylene-sigma-pi`, autoplays once: `sigma`, then `pi1`, then `pi2`, then `pi-both`. Rotatable afterwards. Screen reader: "Acetylene, four atoms in a straight line. An orange σ orbital on the axis. A cyan π orbital above and below the axis, then a second one in front and behind. Together the two π orbitals make a tube around the axis. Labelled: computed."
- **Source note:** acetylene geometry + orbital Scene note. "Acetylene adapted from MIT OCW 5.12, Lecture 1 p. 14, CC BY-NC-SA 4.0."

### `u1-l04-s10` · Build · Rank / order

- **Prompt:** "Switch between the three molecules. Each card measures its C–C bond. Order the bonds from shortest to longest."
- **Visual / Scene:** `molecule-card` (`switcher: [ethane, ethylene, acetylene]`, `autoMeasure: [C1, C2]`). Below it three rank cards: `ethane C–C`, `ethylene C=C`, `acetylene C≡C`, starting in that order. Phone layout: card about 45% of the height, switcher, then the three cards in one compact column; no page scroll.
- **Interaction:** drag cards (keyboard: arrow keys move the focused card).
- **Answer:** acetylene, ethylene, ethane.
- **Correct line:** "{acetylene.r.CC} < {ethylene.r.CC} < {ethane.r.CC} Å. Each π bond adds another overlap between the same two carbons and pulls them closer."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | ethane first | "Check the measurements: more bonds between the same two carbons hold them closer, so the single bond is the longest." |
  | ethylene before acetylene | "Two π bonds pull tighter than one. Check acetylene's number." |
  | acetylene, ethane, ethylene | "Compare ethane and ethylene: the double bond is the shorter one." |
  | *(any other)* | "Read the three measurements and sort them, smallest first." |

- **Reveal:** the three cards settle in order with their lengths, labelled "σ", "σ + π", "σ + 2π".
- **Scene:** Describe text per molecule: "Ethane C–C {ethane.r.CC} ångströms." / "Ethylene C=C {ethylene.r.CC} ångströms." / "Acetylene C≡C {acetylene.r.CC} ångströms."
- **Source note:** ethane, ethylene and acetylene geometry. "These lengths come from different kinds of measured structure (see each reference); those differences are much smaller than the gaps between single, double and triple bonds."

### `u1-l04-s11` … `s14` · Check

The four Check Problems below, in order.

### `u1-l04-s15` · Wrap · Explain (big-statement card)

- **Prompt:** "**Mix, then bond.**
  Count the groups: 4 → sp³ (109.5°), 3 → sp² (120°), 2 → sp (180°), model angles; real ones sit close.
  Head-on overlap is **σ**: the framework that holds every atom in place.
  Side-on p overlap is **π**, above and below it. Double = σ + π. Triple = σ + 2π.
  π electrons sit outside the framework. In Lesson 6 they're the ones that move."
- **Scene:** `ethylene-sigma-pi`, poster frame. Screen reader: "Ethylene edge-on: the σ bond on the axis, the π bond above and below the plane."
- **Lesson-end screen:** key idea (above), streak tick if earned, **Next Lesson: Functional Groups**, secondary Back to Unit.
- **Source note:** n/a.

---

## Check Problems

Each Source note reads "Adapted from MIT OCW 5.12, Problem Set 1 Q5, Berkowski, Spring 2005, CC BY-NC-SA 4.0. Wording ours." where marked PS1; the others read "Our Problem, in the style of MIT OCW 5.12 PS1 Q5."

### `u1-hyb-pi-count` · Numeric input · difficulty 1

- **Tags:** Unit 1, Lesson 4 · **Status:** draft · **Source:** ours (PS1 Q5 style: "indicate the σ and π bonds")
- **Prompt:** "Acrylonitrile, used to make acrylic fibres. How many **π** bonds does it have?"
- **Visual:** full Kekulé of H₂C=CH–C≡N (`C=CC#N`, CID 7855), every H drawn, N's lone pair as cyan dots.
- **Interaction:** number pad; unit "π bonds" beside the box.
- **Answer:** 3 π bonds, ±0.
- **Correct line:** "The C=C has one π and the C≡N has two: three π bonds, alongside six σ bonds."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 2 | "A triple bond holds **two** π bonds, not one." |
  | 1 | "There are two multiple bonds here, the C=C and the C≡N. Count both." |
  | 6 | "That's the σ count: every bond has exactly one σ. π bonds are the extras in double and triple bonds." |
  | 9 | "That's every bond, σ and π together. Count only the π's." |
  | *(any other)* | "Single = σ. Double = σ + π. Triple = σ + 2π. Add up the π's." |

- **Reveal:** each bond lights up with its label (σ, σ + π, σ + 2π) and the π's count up 1, 2, 3.
- **Scene:** n/a.

### `u1-hyb-tap-sp2` · Tap-to-identify · difficulty 2

- **Tags:** Unit 1, Lesson 4 · **Status:** draft · **Source:** ours (PS1 Q5 style: "indicate the hybridization at each non-hydrogen atom")
- **Prompt:** "Pent-1-en-4-yne. Tap every **sp²** carbon, then press Check."
- **Visual:** full Kekulé of H₂C=CH–CH₂–C≡CH (`C=CCC#C`, CID 522708), every C and H a letter, carbons numbered 1–5 from the left. Tappable: C1–C5 (48 px hit areas).
- **Answer:** {C1, C2}
- **Correct line:** "C1 and C2 each have three groups, so both are sp². C3 has four (sp³); C4 and C5 have two each (sp)."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | includes C3 | "C3 has four single bonds: four groups, so it's sp³." |
  | includes C4 or C5 | "A carbon in a triple bond has two groups, one neighbour on each side: sp." |
  | only C1 or only C2 | "Both ends of a C=C have three groups. Find the other one." |
  | *(any other)* | "Count the groups on each carbon: 4 → sp³, 3 → sp², 2 → sp." |

- **Reveal:** C1 and C2 ringed in cyan; every carbon gets its label (sp², sp², sp³, sp, sp).
- **Scene:** n/a.

### `u1-hyb-becl2` · Multiple choice · difficulty 2

- **Tags:** Unit 1, Lesson 4 · **Status:** draft · **Source:** PS1 Q5a and key p. 3
- **Prompt:** "Beryllium chloride, BeCl₂, as a single molecule in the gas. Be has 2 outer electrons and uses both to bond to the two Cl's. Which describes the Be atom?"
- **Visual:** full Lewis Cl–Be–Cl, three lone pairs on each Cl, none on Be.
- **Interaction:** pick one.
  - `a` sp, linear (model: 180°), with two empty p orbitals
  - `b` sp², bent, with one empty p orbital
  - `c` sp³, tetrahedral, with two lone pairs
  - `d` sp, linear, with a lone pair in each p orbital
- **Answer:** {a}
- **Correct line:** "Two groups → two sp hybrids in a line. Be's two remaining p orbitals hold nothing: with only 4 electrons around it, Be is short of an octet, like boron in BF₃ (Lesson 1)."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Count the groups around Be: two Cl's and no lone pairs. Two groups → sp." |
  | `c` | "Be has no lone pairs: both its electrons are in the Be–Cl bonds. That's two groups, not four." |
  | `d` | "Be's two electrons are both used in bonds, so nothing is left for the p orbitals." |
  | *(any other)* | "Count Be's groups (bonded atoms + lone pairs), then match: 4 → sp³, 3 → sp², 2 → sp." |

- **Reveal:** `a`, with a model drawing: two orange sp lobes pointing at the Cl's, two empty cyan p orbitals drawn as outlines, chip "empty".
- **Scene:** n/a.

### `u1-hyb-ketene-pi` · Rotate-and-identify 3D · difficulty 3

- **Tags:** Unit 1, Lesson 4 · **Status:** draft · **Source:** PS1 Q5b and key p. 3
- **Prompt:** "Ketene, H₂C=C=O. Its middle carbon makes two π bonds, both shown here. Spin it. How do they sit?"
- **Visual / Scene:** `ketene-pi` (`show: both`, `view: end-on`, plane toggle available). Geometry `geometry/ketene.json` (`C=C=O`, CID 10038).
- **Interaction:** rotate, then pick one.
  - `a` both π bonds above and below the H–C–H plane
  - `b` the C=C π above and below the H–C–H plane; the C=O π lying in that plane
  - `c` the C=C π lying in the H–C–H plane; the C=O π above and below it
  - `d` both π bonds lying in the H–C–H plane
- **Answer:** {b}
- **Correct line:** "The middle carbon is sp, with two p orbitals at right angles. One pairs with the CH₂ carbon's p, which stands at right angles to the H–C–H plane (C=C π). The other pairs with oxygen's p, in that plane (C=O π)."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` or `d` | "The middle carbon is sp: its two p orbitals are at right angles to each other, so its two π bonds can't lie the same way." |
  | `c` | "The CH₂ carbon is sp², and its leftover p stands at right angles to the H–C–H plane. That's the p in the C=C π." |
  | *(any other)* | "Turn the plane toggle on, spin until the H–C–H plane is edge-on, then find each π bond's lobes." |

- **Reveal:** the model turns to a side view with the plane on; the C=C π lobes are labelled "above / below" and the C=O π lobes "in the plane".
- **Scene:** `ketene-pi`. Describe text: "Ketene: CH2, then C, then O, in a straight line from the middle carbon. The C=C π bond has lobes above and below the plane of the H–C–H group. The C=O π bond has its lobes in that plane, at right angles to the first. Labelled: computed."
- **Source note:** "Adapted from MIT OCW 5.12, Problem Set 1 Q5b, Berkowski, Spring 2005, CC BY-NC-SA 4.0." + ketene geometry + orbital Scene note.
