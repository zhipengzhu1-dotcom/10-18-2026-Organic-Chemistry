# Lesson 8: Molecular Orbitals: Why Electrons Flow

Lesson spec, following the [template](../lesson-spec-template.md) and the [Lesson 6 pilot](lesson-06-resonance.md). Decided in [Specify Lesson 8: Molecular Orbitals: Why Electrons Flow](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/28). The Unit 1 capstone, added by the owner in [Choose the first Unit to build](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/17). Written by an agent under the owner's delegation of 2026-10-19 (no grilling, no per-Lesson prototype); the judgment calls are listed in the PR.

**In scope:** bonding and antibonding orbitals (H₂ σ/σ\*), bond order and why there is no He₂, ethylene π/π\*, HOMO, LUMO and the gap, NH₃ + BF₃ as HOMO → empty LUMO, a curved arrow read as HOMO → LUMO. **Out of scope:** full second-row diatomic MO diagrams (no O₂, N₂, F₂), Hückel and conjugated systems (Unit 12), orbital symmetry and the Woodward–Hoffmann rules (Unit 13).

## Shape checks

- [x] 15 Steps: Hook 1, Build 10, Check 3, Wrap 1
- [x] Explain Steps at 2, 5, 8, 15, never two in a row
- [x] Every interactive Step has a generic fallback Hint
- [x] Every Scene has screen-reader text and a poster frame
- [x] Every chemistry number points at pipeline output with a Source note; none typed here (numbers in curly braces are pipeline fields). The only bare numbers are electron counts and bond orders the Student works out by counting.
- [x] Computed orbital energies and gaps shown to 1 decimal in eV, full values in the Source note. No bond lengths appear in this Lesson (measuring is switched off in the orbital viewer).
- [x] No Tap-to-identify Step in this Lesson, so no tap-only cue is needed. The one Build Draw-arrows Step (s11) follows Multiple choice and Rotate-and-identify Steps whose answers are always ordinary choices.
- [x] Nothing reused from material excluded by the source's licence: OpenStax is used for facts only, with no wording, figures or problems adapted (its pages restrict generative-AI use). Every picture is our own render or our own computed orbital.

---

## Lesson

| Field | Value |
|---|---|
| Id | `u1-l08` |
| Title | Molecular Orbitals: Why Electrons Flow |
| Goal | Explain a bond as electrons in a bonding orbital (and its absence, as in He₂, by bond order), name a molecule's HOMO and LUMO, and read a curved arrow as electrons flowing from one molecule's HOMO into another's empty LUMO. |
| Prerequisites | Lesson 0 (a shared pair is a bond), Lesson 1 (formal charge; BF₃'s boron has only six electrons), Lesson 3 (BF₃ is flat, NH₃ is a pyramid with its lone pair on top), Lesson 4 (p orbitals; σ = head-on overlap, π = side-on overlap, weaker), Lesson 6 (curved arrows run source → sink) |
| Key idea | A curved arrow is electrons flowing from a filled orbital, usually the HOMO, into an empty one, usually the LUMO. |
| Check Problems | `u1-mo-bond-order-rank`, `u1-mo-ethylene-lumo`, `u1-mo-ether-bf3` |
| Sources | OpenStax *Organic Chemistry* (McMurry, 2023), §1.11 "Describing Chemical Bonds: Molecular Orbital Theory", CC BY-NC-SA 4.0, **facts only**: bonding and antibonding MOs from two 1s orbitals in H₂, the node in σ\*, π and π\* in ethylene from two p orbitals. No sentence, figure or problem is adapted, because OpenStax's pages restrict generative-AI use; all wording and every picture is ours. Orbital shapes and energies: our own PySCF calculations, labelled "computed" (see Orbital data below). HOMO/LUMO, the gap and the NH₃ + BF₃ framing are standard chemistry written in our own words and backed by those calculations, not taken from a source. |
| Structure drawing | Full Lewis structures with every lone pair as cyan dots for H₂, He₂, NH₃, BF₃ (each F with three lone pairs), dimethyl ether and the adducts; ethylene and ethane as full Lewis (both carbons and every H drawn). In s11 only, BF₃'s empty p orbital is drawn on boron as a faint dashed two-lobe outline labelled "LUMO (empty)", and NH₃'s lone pair is labelled "HOMO"; the outline is a drawing aid, not a computed surface. Formal charges are drawn as letters (N⁺, B⁻, O⁺). Every structure is drawn by the site's own renderer; RDKit.js parses and lays out only. Orbitals in 3D are computed meshes on a ball-and-stick model in the `orbital-viewer` Scene. |

### New Scenes

| Scene id | Used in | What it shows | Parameters | Data it reads | Poster frame (reduced motion) |
|---|---|---|---|---|---|
| `bf3-nh3-snap` | s01 reveal | Watch-only, ~8 s, silent plain Manim CE render. Flat BF₃ (boron's six electrons counted) and NH₃ (lone pair on top) drift together; N's lone pair swings to B, a N–B bond forms, BF₃ folds into a pyramid around B, charges N⁺ and B⁻ appear. Ends on the adduct H₃N–BF₃. 2D Lewis drawings with a slight 3D tilt, no numbers. | `aspect: 9:16 \| 16:9 \| 1:1` | none | the adduct H₃N⁺–B⁻F₃ with the new N–B bond highlighted |
| `mo-from-overlap` | s02, s05 | Watch-only, ~10 s each, silent plain Manim CE renders. Two atomic orbitals drawn as 2D cross-sections with their sign marked; first they add in phase (density piles up between the nuclei, the level drops on a schematic energy ladder), then out of phase (they cancel in the middle, a node line appears, the level rises). Schematic: the ladder carries no numbers and is labelled "not to scale". | `system: h2-1s \| ethylene-2p`, `aspect` | none | both results side by side: bonding (lower) and antibonding (higher, node marked), with the ladder |
| `orbital-viewer` | s03, s06, s09, `u1-mo-ethylene-lumo` | Interactive (R3F), the Step card from [#13](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/13): a ball-and-stick molecule (Jmol colours, every atom lettered) inside a computed orbital isosurface. Drag or arrow keys rotate, ↺/↻ buttons, a "Describe" button reads the orbital aloud. **Phase cue, never colour alone:** the + lobe is a solid electron-cyan surface, the − lobe an ignite-orange surface with a diagonal hatch, and each lobe carries a "+" or "−" label in JetBrains Mono that stays facing the camera. Measuring by tap is **off** in this Lesson. Orbitals in a pair show as A/B side by side on wide screens, as an A/B toggle on phones. Each orbital has a "Computed" chip and the source note one tap away. | `molecule: h2 \| ethylene \| nh3-bf3`, `orbitals` (list of orbital ids), `labels: show \| hide` (hide = shown as A/B), `start-view` (per orbital, below) | `orbitals/<molecule>.json` (geometry, energies, isovalue, method), `orbitals/<molecule>/<orbital>.glb` | each orbital in its start-view: the view that shows its node or lobes most clearly, listed with each Step |
| `mo-filler` | s04 | Interactive (React SVG). Two 1s levels at the sides, σ (lower) and σ\* (higher) in the middle, schematic and labelled "not to scale". Electrons are half-arrows (↑ then ↓, a shape cue). A + / − pair of buttons adds or removes one electron; electrons always land in the lowest level with room, two per level. Live counter: "bonding n · antibonding m · bond order (n − m) ÷ 2 = x", and a label at 2 electrons ("H₂") and at 4 ("He₂"). | `electrons: 1–4` (start 1) | none | 4 electrons placed, bond order 0, label "He₂" |
| `frontier-ladder` | s07 reveal, s10 | Interactive (React SVG), static unless a flow is highlighted. One energy ladder per molecule, side by side, each showing its HOMO (filled, two half-arrows) and LUMO (empty), drawn to scale from computed energies on a shared axis, each level labelled with its energy in eV to 1 decimal, the gap drawn as a bracket. With `flow` set, a curved arrow runs from one molecule's HOMO to the other's LUMO and the bracket between them is labelled with that difference. Each panel carries a "Computed" chip. | `molecules: ethane+ethylene \| nh3+bf3`, `flow: none \| nh3→bf3 \| bf3→nh3 \| both` | `orbitals/ethane.json`, `orbitals/ethylene.json`, `orbitals/nh3.json`, `orbitals/bf3.json` | all levels and labels drawn; for `nh3+bf3`, both flows drawn, the smaller gap solid and the larger dashed |
| `arrow-is-flow` | s08, s15 | Watch-only, ~10 s, silent plain Manim CE render. Two schematic ladders (NH₃ left, BF₃ right). An arrow leaves NH₃'s HOMO and lands on BF₃'s LUMO; the ladders then fold away into the Lewis drawings, and the arrow becomes the curved arrow from N's lone pair to B. Text writes on: "HOMO → LUMO = the curved arrow". No numbers. | `aspect` | none | the Lewis drawings with the curved arrow N lone pair → B and the caption |

Reused: `push-replay` (Lesson 6), in s11 and `u1-mo-ether-bf3`.

**Video note.** The three watch-only Scenes are plain, silent Manim CE renders (16:9 and 9:16, 30 fps), with the last frame as the reduced-motion poster, as decided in [Prototype: Specify Lesson 0](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/31). They are schematic and carry no computed numbers, so they need no pipeline data.

**Orbital data (`orbitals/*.json`, meshes `orbitals/*/*.glb`).** Five molecules, H₂, ethane, ethylene, NH₃ and BF₃, each optimised and then computed with PySCF at **B3LYP/cc-pVTZ** (the fallback method from [#19](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/19)), restricted closed shell, isolated molecule, each followed by a frequency check (no imaginary frequencies). One method for every molecule, geometry included, so energies compare fairly across the Lesson (the same reasoning as Lesson 6's computed bond lengths), and one source per molecule. Orbitals are written as cube files with `pyscf.tools.cubegen.orbital` and meshed offline to glTF ([#4](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/4), [#3](https://github.com/zhipengzhu1-dotcom/10-18-2026-Organic-Chemistry/issues/3)) at **one isovalue for every orbital in the Lesson**, set in the pipeline config as `{iso}` and quoted in the Source note. The pipeline writes, per molecule: `homo`, `lumo`, `gap` (eV) and the meshes listed below; plus two derived fields, `{flow.nh3_bf3}` = `{bf3.lumo}` − `{nh3.homo}` and `{flow.bf3_nh3}` = `{nh3.lumo}` − `{bf3.homo}`.

| Molecule | Meshes | Energies used |
|---|---|---|
| H₂ | `sigma` (HOMO), `sigma-star` (LUMO) | none (`mo-filler` is schematic) |
| ethane | none | `{ethane.homo}`, `{ethane.lumo}`, `{ethane.gap}` |
| ethylene | `homo` (π), `lumo` (π\*) | `{ethylene.homo}`, `{ethylene.lumo}`, `{ethylene.gap}` |
| NH₃ | `homo` (lone pair) | `{nh3.homo}`, `{nh3.lumo}` |
| BF₃ | `lumo` (empty p on B) | `{bf3.homo}`, `{bf3.lumo}` |

For s09 the NH₃ and BF₃ meshes are shown together in one frame, NH₃ placed above the BF₃ plane with N over B at a distance chosen for clarity (not a computed complex geometry), and the Describe text says so.

- **Display:** orbital energies and gaps in eV to 1 decimal; the full values go in the Source note. The Source note says plainly that computed orbital energies are model values: good for comparing molecules computed the same way, not equal to measured energies.
- **Basis choice:** cc-pVTZ has no diffuse functions, which keeps the empty orbitals valence-like. Do not switch to an augmented basis for this Lesson; it would turn the LUMOs of ethane and NH₃ into diffuse Rydberg-type orbitals.
- **Sanity check at build time** (not shown to Students; the build fails if any fails):
  1. H₂: the HOMO has the same sign everywhere (no node between the nuclei); the LUMO changes sign across the plane midway between them. If the LUMO is not that orbital, mesh the lowest empty orbital that is, and label it σ\* only (not "LUMO").
  2. Ethylene: the HOMO changes sign across the molecular plane only (π); the LUMO changes sign across the molecular plane and across the plane bisecting the C=C (π\*).
  3. `{ethylene.homo}` > `{ethane.homo}` and `{ethylene.gap}` < `{ethane.gap}`.
  4. NH₃: the HOMO's largest lobe sits on N, on the side away from the H's. BF₃: the LUMO changes sign across the molecular plane and its largest lobes sit on B. BF₃'s HOMO is a fluorine lone-pair combination with no boron contribution.
  5. `{flow.nh3_bf3}` < `{flow.bf3_nh3}`.
  6. Ethane's and NH₃'s LUMOs are valence-like by inspection (the isosurface stays near the atoms). If ethane's is not, s07 shows only the two HOMOs and drops ethane's LUMO and gap; the correct line then compares HOMOs only.
  7. Every optimised structure is a true minimum.

Source note for every computed orbital and energy: "Orbitals and energies computed with PySCF <version>, B3LYP/cc-pVTZ, isolated molecules at geometries optimised with the same method (our calculation, <date>). Isosurfaces drawn at {iso}. Computed orbital energies are model values: compare them with each other, not with measured energies. Full values: <list>." The bonding/antibonding facts add: "Facts as in OpenStax *Organic Chemistry* §1.11, CC BY-NC-SA 4.0; wording and pictures ours."

---

## Steps

### `u1-l08-s01` · Hook · Multiple choice (`prediction: true`)

- **Prompt:** "Remember BF₃? Its boron has only six electrons (Lesson 1). Ammonia, NH₃, has a lone pair on N. Both molecules are neutral. Let the two gases meet. What happens?"
- **Visual:** BF₃ (flat, every F lone pair, boron's six electrons counted beside it: "B: 6 e⁻") and NH₃ (lone pair on N), side by side.
- **Interaction:** pick one. `a` Nothing: neither has a charge, so nothing pulls · `b` They snap together: N bonds to B · `c` They swap atoms, making NF₃ and BH₃
- **Answer:** every choice accepted; reveal follows.
- **Reveal:** Scene `bf3-nh3-snap`. "They **snap together** into one molecule, H₃N–BF₃, with a brand-new N–B bond. You could already guess the arrow from Lesson 6: N's lone pair → B. But *why* that pair, and *why* boron? Lewis dots can't say. Orbitals can, and by the end of this Lesson that arrow will mean something new."
- **Scene:** `bf3-nh3-snap`, plays on reveal. Screen reader: "Flat boron trifluoride, with only six electrons around boron, and ammonia, with a lone pair on nitrogen, drift together. The lone pair swings over to boron and becomes a nitrogen–boron bond. Boron trifluoride folds into a pyramid. Nitrogen is now positive and boron negative."
- **Source note:** n/a (no numbers; the standard Lewis acid–base pair).

### `u1-l08-s02` · Build · Explain

- **Prompt:** "In a molecule, electrons don't belong to one atom. They live in **molecular orbitals** spread over the molecule.
  Bring two H atoms together and their 1s orbitals combine two ways:
  **In phase** (same sign): they add up between the nuclei. That's **σ**, a **bonding** orbital, lower in energy than either 1s.
  **Out of phase** (opposite signs): they cancel in the middle, leaving a **node**, where the orbital is zero. That's **σ\***, **antibonding**, higher in energy.
  Two atomic orbitals in, two molecular orbitals out. **+ and − are the sign of the wave, not charges.**"
- **Visual / Scene:** `mo-from-overlap` (`system: h2-1s`), autoplays once.
- **Scene:** screen reader: "Two hydrogen 1s orbitals. Added with the same sign, they build up between the nuclei into one bonding orbital, sigma, which sits lower in energy. Added with opposite signs, they cancel in the middle, leaving a node: the antibonding orbital, sigma star, which sits higher."
- **Source note:** "Bonding and antibonding orbitals of H₂: facts as in OpenStax *Organic Chemistry* §1.11, CC BY-NC-SA 4.0; wording and pictures ours."

### `u1-l08-s03` · Build · Rotate-and-identify 3D

- **Prompt:** "Here are H₂'s two orbitals, **computed**. Rotate them. Which one is the antibonding orbital, σ\*?"
- **Visual / Scene:** `orbital-viewer` (`molecule: h2`, `orbitals: [sigma, sigma-star]`, `labels: hide`). Shown as **A** = `sigma`, **B** = `sigma-star`. Start-views: both side-on, H–H axis horizontal.
- **Interaction:** rotate (drag, arrow keys or ↺/↻), then pick one. `a` A · `b` B · `c` Neither: the − lobe means a negative charge, so these are charges, not orbitals
- **Answer:** {b}
- **Correct line:** "B changes sign halfway between the nuclei, so there's a node right where a bond would need electrons. That's σ\*. A is one lobe, the same sign everywhere, thickest between the nuclei: σ, the bonding orbital."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `a` | "A is one lobe wrapping both nuclei, the same sign everywhere. Electrons there sit between the nuclei and hold them together. That's bonding." |
  | `c` | "+ and − mark the sign of the wave, not electric charge. Look for the place where the sign flips." |
  | *(any other)* | "Look at the point midway between the two H's. In which orbital does the surface vanish, with + on one side and − on the other?" |

- **Reveal:** B ringed; its midplane drawn as a dashed node plane labelled "node: zero here". "B is σ\*: + around one H, − around the other, zero in between. A is σ."
- **Scene:** `orbital-viewer`. Describe, orbital A: "Hydrogen molecule, two atoms on a horizontal axis. One egg-shaped lobe, sign plus, wraps both nuclei and is thickest between them." Orbital B: "Two lobes: plus around the left hydrogen, minus around the right. Midway between the nuclei the orbital is zero: a flat nodal plane."
- **Source note:** the computed-orbital note (Orbital data above), with the OpenStax §1.11 facts line.

### `u1-l08-s04` · Build · Manipulate a Scene (signature)

- **Prompt:** "Fill the orbitals. Electrons go in the lowest level with room, two per level. **Bond order** = (bonding electrons − antibonding electrons) ÷ 2. Add electrons until **the bond disappears**, then press Check."
- **Visual / Scene:** `mo-filler`, starting with 1 electron in σ.
- **Interaction:** + / − buttons (keyboard: Tab to a button, Enter; or the + and − keys); press Check on the current count. Each change is announced: "3 electrons: 2 bonding, 1 antibonding, bond order one half."
- **Answer:** 4 electrons (σ², σ\*², bond order 0).
- **Correct line:** "Four electrons: two in σ, two in σ\*. The antibonding pair cancels the bonding pair (it even costs a little more than the bonding pair saves). Bond order 0. That's He₂, and it's why helium stays as single atoms."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | 1 | "One electron in σ: bond order ½. A weak bond, but still a bond. Keep adding." |
  | 2 | "That's H₂: a full pair in σ, bond order 1. Where does the next electron have to go?" |
  | 3 | "The third electron had to go into σ\*. Bond order dropped to ½, not to 0 yet." |
  | *(any other)* | "Watch the bond-order counter. Add electrons until it reads 0." |

- **Reveal:** the Scene jumps to 4 electrons, σ\* pair ringed: "2 bonding − 2 antibonding = 0. No bond: He₂ doesn't hold together."
- **Scene:** `mo-filler`. Screen reader on each change: "<n> electrons. Bonding <b>, antibonding <a>. Bond order <x>." plus "This is H₂" at 2 and "This is He₂" at 4. The diagram itself: "Two 1s levels at the sides. In the middle, sigma below and sigma star above. Not to scale."
- **Source note:** "Why He₂ has no bond: facts as in OpenStax *Organic Chemistry* §1.11, CC BY-NC-SA 4.0; wording ours. The diagram is schematic, not to scale."

### `u1-l08-s05` · Build · Explain

- **Prompt:** "The same thing happens side-on. In ethylene, each carbon has one p orbital left over (Lesson 4), standing up out of the flat molecule. In phase they make **π**, a bonding orbital above and below the C=C. Out of phase they make **π\***, antibonding, with a node cutting between the two carbons.
  Fill ethylene's orbitals from the bottom and the last pair lands in π. That's its **HOMO**, the **H**ighest **O**ccupied **M**olecular **O**rbital. The next one up, π\*, is empty: the **LUMO**, **L**owest **U**noccupied. The energy between them is the **HOMO–LUMO gap**."
- **Visual / Scene:** `mo-from-overlap` (`system: ethylene-2p`), autoplays once, ending on a two-level ladder with π labelled "HOMO (filled)" and π\* labelled "LUMO (empty)".
- **Scene:** screen reader: "Two p orbitals stand side by side on ethylene's carbons. Same sign: they merge above and below the double bond into pi, the bonding orbital, lower in energy. Opposite signs: a node cuts between the carbons, giving pi star, higher. Pi holds ethylene's last pair: it is the HOMO. Pi star is empty: it is the LUMO."
- **Source note:** "π and π\* in ethylene: facts as in OpenStax *Organic Chemistry* §1.11, CC BY-NC-SA 4.0; wording and pictures ours."

### `u1-l08-s06` · Build · Rotate-and-identify 3D

- **Prompt:** "Ethylene's HOMO, **computed**. Rotate it. Where do its electrons spend their time?"
- **Visual / Scene:** `orbital-viewer` (`molecule: ethylene`, `orbitals: [homo]`, `labels: show`). Start-view: face-on (looking down on the flat molecule), so the lobes overlap the atoms and the answer isn't given away; turning it edge-on shows the two lobes.
- **Interaction:** rotate, then pick one.
  - `a` In two lobes above and below the flat molecule, over the C=C
  - `b` In one sausage along the C–C axis, between the nuclei
  - `c` Around the H atoms, in the plane of the molecule
  - `d` Spread evenly over all six atoms
- **Answer:** {a}
- **Correct line:** "+ above, − below, and the plane of the atoms is a node. That's the π bond. Ethylene's most loosely held electrons sit above and below the molecule, out in the open."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Turn the molecule edge-on. The lobes sit above and below the plane, not along the C–C line. Along the axis is where the σ bond lives." |
  | `c` | "The H's sit in the plane, and this orbital is zero everywhere in that plane. Turn it edge-on and look." |
  | `d` | "Turn it edge-on: the surface hugs the two carbons and barely reaches the H's." |
  | *(any other)* | "Rotate until you're looking along the plane of the molecule. Where are the lobes?" |

- **Reveal:** the viewer turns edge-on, the molecular plane drawn as a dashed node plane: "Two lobes, above and below, over the C=C. Ethylene's HOMO is its π orbital."
- **Scene:** `orbital-viewer`. Describe: "Ethylene, flat, two carbons and four hydrogens. The orbital has two lobes: plus above the plane, minus below, each stretched over both carbons. The plane of the atoms is a node."
- **Source note:** the computed-orbital note.

### `u1-l08-s07` · Build · Multiple choice

- **Prompt:** "Ethane has only σ bonds. Ethylene adds a π bond, made by side-on overlap, which is weaker than head-on (Lesson 4). Whose **HOMO** sits higher in energy?"
- **Visual:** ethane and ethylene, full Lewis, side by side.
- **Interaction:** pick one. `a` Ethylene's (its π) · `b` Ethane's (a σ bond) · `c` The same: both are carbon–carbon bonds
- **Answer:** {a}
- **Correct line:** "Weaker overlap, less stabilised: ethylene's π electrons sit higher ({ethylene.homo} vs {ethane.homo} eV, computed), and its HOMO–LUMO gap is smaller ({ethylene.gap} vs {ethane.gap} eV). High HOMO, small gap: electrons easy to give. That's why alkenes react and alkanes mostly don't."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Every bond in ethane is σ, made by head-on overlap, the strongest kind, so its electrons are held low and tight. Which overlap is weaker?" |
  | `c` | "Both have C–C bonds, but the overlap differs. Weaker overlap means less stabilisation, so a higher level." |
  | *(any other)* | "Bonding orbitals sit lower the better their overlap. Which bond has the weaker overlap?" |

- **Reveal:** Scene `frontier-ladder` (`molecules: ethane+ethylene`, `flow: none`), ethylene's HOMO ringed: "Ethylene's π HOMO sits above ethane's σ HOMO, and its gap is smaller."
- **Scene:** `frontier-ladder`, on reveal and after a correct answer. Screen reader: "Two energy ladders, computed. Ethane: HOMO {ethane.homo}, LUMO {ethane.lumo} electron-volts, gap {ethane.gap}. Ethylene: HOMO {ethylene.homo}, LUMO {ethylene.lumo}, gap {ethylene.gap}. Ethylene's HOMO is higher and its gap smaller."
- **Source note:** the computed-orbital note, with the full values of the four energies and two gaps.

### `u1-l08-s08` · Build · Explain

- **Prompt:** "Now the payoff. A reaction starts when electrons move from where they're held loosely to where there's room.
  **Tail of the arrow: a filled orbital**, usually the **HOMO**, whose electrons are the easiest to give.
  **Head: an empty orbital**, usually the **LUMO**, the lowest-energy room there is.
  The smaller the gap between them, and the better they overlap in space, the easier the flow.
  Lesson 6's sources, lone pairs and π bonds, are high filled orbitals. Its sinks are atoms with low empty ones. **Every curved arrow is HOMO → LUMO.**"
- **Visual / Scene:** `arrow-is-flow`, autoplays once.
- **Scene:** screen reader: "Two energy ladders, ammonia on the left and boron trifluoride on the right. An arrow leaves ammonia's highest filled orbital and lands on boron trifluoride's lowest empty orbital. The ladders fold away into Lewis drawings, and the arrow becomes the curved arrow from nitrogen's lone pair to boron. Caption: HOMO to LUMO equals the curved arrow."
- **Source note:** n/a (schematic, no numbers).

### `u1-l08-s09` · Build · Rotate-and-identify 3D

- **Prompt:** "NH₃'s HOMO and BF₃'s LUMO, **computed**, shown together. Rotate them. For the two orbitals to overlap, how must NH₃ approach BF₃?"
- **Visual / Scene:** `orbital-viewer` (`molecule: nh3-bf3`, `orbitals: [nh3.homo, bf3.lumo]`, `labels: show`). Start-view: looking straight down on BF₃'s plane, so the out-of-plane lobes are seen end-on.
- **Interaction:** rotate, then pick one.
  - `a` N first, its lobe pointing at boron, from above or below BF₃'s flat plane
  - `b` N first, pointing at one of the fluorines
  - `c` H's first, pointing at boron
  - `d` Edge-on, in BF₃'s plane, between two fluorines
- **Answer:** {a}
- **Correct line:** "NH₃'s HOMO is its lone pair, one big lobe on N pointing away from the H's. BF₃'s LUMO is boron's empty p orbital, sticking up and down out of the plane. Point one at the other and they overlap: that's where the N–B bond forms."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "Fluorine has no room: BF₃'s empty orbital sits mostly on boron. The small lobes on the F's are only a minor part of it." |
  | `c` | "NH₃'s HOMO is on N, pointing away from the H's. The H end has nothing to give." |
  | `d` | "Turn BF₃ edge-on. Its LUMO has no lobe in the plane: the lobes stick out above and below boron." |
  | *(any other)* | "Find the big lobe of each orbital. Which way must they face to touch?" |

- **Reveal:** the view turns side-on with a dashed approach line from N straight down onto B: "Lone-pair lobe on N, empty p lobe on B, face to face."
- **Scene:** `orbital-viewer`. Describe: "Ammonia above boron trifluoride, placed for clarity, not at a computed distance. Ammonia's HOMO: one large lobe on nitrogen, pointing down toward boron, away from ammonia's hydrogens, with a small opposite-sign lobe behind it. Boron trifluoride, flat. Its LUMO: two large lobes on boron, plus above the plane and minus below, and small opposite-sign lobes on each fluorine. The plane of boron trifluoride is a node."
- **Source note:** the computed-orbital note, adding: "The two molecules are computed separately and placed together for the picture."

### `u1-l08-s10` · Build · Multiple choice

- **Prompt:** "Electrons could flow two ways between these two. Read the **computed** ladders: which flow happens?"
- **Visual / Scene:** `frontier-ladder` (`molecules: nh3+bf3`, `flow: none`), both ladders labelled.
- **Interaction:** pick one.
  - `a` NH₃'s HOMO → BF₃'s LUMO ({flow.nh3_bf3} eV apart)
  - `b` BF₃'s HOMO → NH₃'s LUMO ({flow.bf3_nh3} eV apart)
  - `c` Neither: both molecules are neutral, so no electrons flow
- **Answer:** {a}
- **Correct line:** "The smaller gap wins: NH₃'s lone pair sits high, BF₃'s empty p orbital sits low. Electrons flow from NH₃ into BF₃."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "BF₃'s HOMO is a fluorine lone pair, held tightly and far down the ladder, and NH₃'s LUMO sits high. That's the big gap." |
  | `c` | "Neutral molecules react all the time: you saw these two snap together. What matters is a filled orbital close in energy to an empty one." |
  | *(any other)* | "Flow goes across the smaller gap: from the higher filled level to the lower empty one." |

- **Reveal:** `frontier-ladder` with `flow: both`: the NH₃ → BF₃ arrow solid with its gap bracket, the BF₃ → NH₃ arrow dashed with its larger bracket: "{flow.nh3_bf3} eV vs {flow.bf3_nh3} eV. The small gap is the real flow."
- **Scene:** `frontier-ladder`. Screen reader: "Two energy ladders, computed. Ammonia: HOMO {nh3.homo}, LUMO {nh3.lumo} electron-volts. Boron trifluoride: HOMO {bf3.homo}, LUMO {bf3.lumo}. From ammonia's HOMO up to boron trifluoride's LUMO: {flow.nh3_bf3}. From boron trifluoride's HOMO up to ammonia's LUMO: {flow.bf3_nh3}."
- **Source note:** the computed-orbital note, with the full values of the four energies and both differences.

### `u1-l08-s11` · Build · Draw arrows

- **Prompt:** "Now draw it. Push the electrons from NH₃'s **HOMO** into BF₃'s **LUMO**."
- **Visual:** start, with N's lone pair labelled "HOMO" and boron's empty p orbital drawn as a faint dashed two-lobe outline labelled "LUMO (empty)"; target dimmed in the strip above on narrow screens, side by side on wide ones.
- **Start:** `[NH3:1].[B:2]([F:3])([F:4])[F:5]` · **Target:** `[NH3+:1][B-:2]([F:3])([F:4])[F:5]`
- **Pushes:** lone pair on N1 → B2 (a new bond between the two molecules). **Drop target:** a dashed spot in the gap between N1 and B2, on B's side, where the arrowhead is drawn; not on B's centre.
- **In-between flags:** n/a (one push).
- **Correct line:** "N's lone pair, NH₃'s HOMO, now fills boron's empty p orbital, BF₃'s LUMO. A new N–B bond, and boron finally has eight. N now shares a pair it used to own, so it's N⁺; B gains a share, so it's B⁻ (formal charge, Lesson 1)."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | lone pair on an F → B2 | "F's pairs sit low on the ladder, held tightly. The highest filled orbital here is N's lone pair." |
  | a B–F bond → N1 or anywhere | "That moves electrons away from boron, the atom that's short. Electrons flow *into* boron's empty orbital." |
  | an N–H bond → B2 | "σ bonds sit low. NH₃'s HOMO is its lone pair." |
  | lone pair on N1 → an F | "F already has eight. The empty orbital, the LUMO, is on boron." |
  | *(any other)* | "Tail on NH₃'s HOMO, the lone pair. Head on BF₃'s LUMO, boron's empty orbital." |

- **Reveal / success Scene:** `push-replay`. Screen reader: "Arrow from nitrogen's lone pair to boron. Result: a nitrogen–boron bond; nitrogen positive, boron negative, boron with eight electrons."
- **Source note:** n/a (no numbers).

### `u1-l08-s12` … `s14` · Check

The three Check Problems below, in order.

### `u1-l08-s15` · Wrap · Explain (big-statement card)

- **Prompt:** "**A curved arrow is electrons flowing from a filled orbital into an empty one.**
  Two orbitals overlap → bonding (lower) and antibonding (higher, with a node).
  Bond order = (bonding − antibonding) ÷ 2. He₂'s is 0, so no He₂.
  HOMO: highest filled. LUMO: lowest empty. Arrows run HOMO → LUMO, across the smallest gap.
  That's why electrons flow."
- **Scene:** `arrow-is-flow`, final frame. Screen reader: "Ammonia's lone pair, its HOMO, with a curved arrow into boron trifluoride's empty orbital, its LUMO."
- **Lesson-end screen:** key idea (above), streak tick if earned, primary **Unit 1 Practice Set** (this is the Unit's last Lesson), secondary Back to Unit.
- **Source note:** n/a.

---

## Check Problems

Every computed number follows the computed-orbital Source note above. The facts on bond order and on π/π\* follow OpenStax *Organic Chemistry* §1.11 (facts only, wording ours). The reveal for the Draw-arrows Problem plays `push-replay`.

### `u1-mo-bond-order-rank` · Rank / order · difficulty 1

- **Tags:** Unit 1, Lesson 8 · **Status:** draft
- **Prompt:** "Rank from **strongest bond** to **no bond**. (He₂⁺ is He₂ with one electron removed: three electrons.)"
- **Visual:** three cards, each the formula and its electron count: H₂ (2 e⁻), He₂⁺ (3 e⁻), He₂ (4 e⁻). Starting order: He₂, H₂, He₂⁺.
- **Interaction:** drag cards (keyboard: arrow keys move a focused card).
- **Answer:** H₂ → He₂⁺ → He₂.
- **Correct line:** "Bond orders 1, ½, 0. He₂⁺'s third electron sits in σ\*, cancelling half a bond, and He₂'s fourth cancels the rest."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | He₂⁺ above H₂ | "He₂⁺ has more electrons, but its third one sits in σ\*: (2 − 1) ÷ 2 = ½. H₂'s bond order is 1." |
  | He₂ not last | "He₂: two in σ, two in σ\*. (2 − 2) ÷ 2 = 0. No bond at all." |
  | *(any other)* | "Fill σ, then σ\*, for each. Bond order = (bonding − antibonding) ÷ 2." |

- **Reveal:** three mini `mo-filler` diagrams in the right order, with bond orders 1, ½, 0.
- **Scene:** n/a (static mini diagrams; screen reader: "H₂: two bonding, none antibonding, bond order 1. He₂ plus: two bonding, one antibonding, one half. He₂: two and two, zero.").
- **Source note:** "Bond order and the He₂ case: facts as in OpenStax *Organic Chemistry* §1.11, CC BY-NC-SA 4.0. Wording ours."

### `u1-mo-ethylene-lumo` · Rotate-and-identify 3D · difficulty 2

- **Tags:** Unit 1, Lesson 8 · **Status:** draft
- **Prompt:** "Two of ethylene's orbitals, **computed** and unlabelled. Rotate them. Which one is ethylene's **LUMO**?"
- **Visual / Scene:** `orbital-viewer` (`molecule: ethylene`, `orbitals: [lumo, homo]`, `labels: hide`), shown as **A** = `lumo` (π\*), **B** = `homo` (π). Start-views: both face-on, looking down on the flat molecule, so neither node is visible until the Student rotates.
- **Interaction:** rotate, then pick one.
  - `a` A: its sign flips between the two carbons, an extra node, so it's antibonding and empty
  - `b` B: its sign never flips between the carbons, so it's ready to take electrons
  - `c` Neither: ethylene's electrons fill every orbital it has
- **Answer:** {a}
- **Correct line:** "A is π\*: besides the plane of the molecule, a second node cuts between the carbons. Antibonding orbitals sit high and stay empty. That's ethylene's LUMO."
- **Hints:**

  | Wrong answer | Hint |
  |---|---|
  | `b` | "No sign flip between the carbons means bonding. That's π, already holding ethylene's last pair. Bonding orbitals fill first." |
  | `c` | "Ethylene's 12 valence electrons fill 6 orbitals, and π is the sixth, the HOMO. Every orbital above it is empty." |
  | *(any other)* | "Turn each orbital edge-on and look between the two carbons. Does the sign flip there?" |

- **Reveal:** both turn edge-on, the node planes drawn dashed: "A: two nodes, π\*, the LUMO. B: one node, π, the HOMO."
- **Scene:** `orbital-viewer`. Describe, orbital A: "Ethylene, flat. Four lobes: above the plane, plus over one carbon and minus over the other; below, the reverse. Nodes: the plane of the atoms, and a plane cutting between the two carbons." Orbital B: "Two lobes: plus above the plane, minus below, each stretched over both carbons. One node: the plane of the atoms."
- **Source note:** the computed-orbital note, with "π and π\*: facts as in OpenStax *Organic Chemistry* §1.11, CC BY-NC-SA 4.0."

### `u1-mo-ether-bf3` · Draw arrows (target hidden) · difficulty 3

- **Tags:** Unit 1, Lesson 8 · **Status:** draft
- **Prompt:** "Dimethyl ether meets BF₃. Find the HOMO and the LUMO yourself, then push the electrons. No target this time."
- **Visual:** dimethyl ether (O with both lone pairs) and BF₃ (every F lone pair), full Lewis, side by side; no orbital labels, no target strip.
- **Start:** `[CH3:1][O:2][CH3:3].[B:4]([F:5])([F:6])[F:7]` · **Accepted results:** {`[CH3:1][O+:2]([CH3:3])[B-:4]([F:5])([F:6])[F:7]`}
- **Pushes:** either lone pair on O2 → B4 (a new bond between the molecules; the two lone pairs give the same result). **Drop target:** a dashed spot in the gap between O2 and B4, on B's side.
- **In-between flags:** n/a (one push).
- **Correct line:** "The ether's HOMO is an oxygen lone pair; BF₃'s LUMO is boron's empty p orbital. Same flow as with NH₃: O⁺–B⁻, and boron has eight."
- **Hints:**

  | Wrong push | Hint |
  |---|---|
  | lone pair on an F → B4 | "F's pairs sit low and are already bonded to boron. The highest filled orbital here is a lone pair on the ether's oxygen." |
  | lone pair on O2 → C1 or C3 | "Carbon already has eight and no low empty orbital. Where is the empty one?" |
  | a B–F bond → anywhere | "That moves electrons out of the molecule that's short of them. Flow goes *into* boron." |
  | a C–O or C–H bond → B4 | "σ bonds sit low in energy. Use the ether's HOMO, an oxygen lone pair." |
  | *(any other)* | "Tail on the highest filled orbital (a lone pair). Head on the lowest empty one (boron's p orbital)." |

- **Reveal:** `push-replay`. Screen reader: "Arrow from a lone pair on the ether's oxygen to boron. Result: an oxygen–boron bond; oxygen positive, boron negative."
- **Source note:** n/a (no numbers; our example).
