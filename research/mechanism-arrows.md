# Prior art: interactive mechanism (curved-arrow) drawing

Research for issue #7 (map #1). Question: how do existing tools let a Student draw curved electron-pushing arrows and get them checked, and how are mechanisms stored as data? What works on touch, how is grading done, what should a mechanism Step's data look like, and what can we reuse under an open licence?

Researched 2026-10-18. Every claim cites its source. **Unverified** marks claims where the primary source could not be read in full.

## TL;DR

- **Interaction:** every shipping tool uses the same gesture: pick an electron source (a lone pair, a bond or a radical), drag to a sink (an atom, a bond, or the gap between two atoms where a new bond forms), and release when the target highlights. Pearson tells students to do Marvin JS mechanisms on a computer, not a phone. The one tool built for touch (the Mechanisms app) has students drag electrons with a finger and checks each move straight away.
- **Grading:** commercial systems don't compare arrows pixel by pixel. They run the arrows to produce products, then check the products, the arrow count and required substructures, and give feedback on common errors. Pearson's evaluators are ordered conditions, each graded correct or incorrect. Norton gives per-step feedback on common errors plus generic hints. None of the docs I could read describe partial credit.
- **Data model:** the research datasets agree. A step is an **atom-mapped reactant structure** plus an **ordered list of arrows**, where each arrow goes from (atom | bond) to (atom | bond). Products are *derived* by running the arrows. That makes "equivalent mechanism" checks possible: two arrow sets are equivalent when they give the same products (up to symmetry-equivalent atoms).
- **Reusable (MIT/Apache):** Kekule.js (MIT) has an `ElectronPushingArrow` glyph and editor tools. Ketcher (Apache-2.0) has no electron-flow arrows. FlowER (MIT) and ChRIMP/MechSMILES (MIT) are Python research code, useful for their formats and as a source of test cases, not as UI. PMechDB data is **CC BY-NC-ND**, so we can't ship derivatives of it. Marvin JS is commercial.
- **Recommendation:** build our own small SVG arrow layer over our own 2D renderer, store steps in a MechSMILES-style form (mapped SMILES + arrows), and grade by running the arrows and comparing products, with the author's arrow key used for targeted feedback.

## 1. Tools surveyed

| Tool | Licence | How arrows are drawn | How answers are checked |
|---|---|---|---|
| **Marvin JS** (ChemAxon) | Commercial | Pick a single (1 e⁻) or double (2 e⁻) electron-flow arrow and drag from the electrons to the target atom or bond. A grey preview follows the drag. Sources: radical, lone pair, bond. Targets: atom, bond, or an *incipient bond* between two unbonded atoms. Clicking an arrow toggles incipient or normal. Lone pairs must be visible to start from them. At most one arrow per electron or lone pair. [ChemAxon: Electron flow arrow](https://docs.chemaxon.com/display/lts-europium/electron-flow-arrow), [Reactions and mechanisms](https://docs.chemaxon.com/latest/marvin-js_reactions-and-mechanisms.html) | It doesn't grade. Hosts (Pearson, Moodle) grade on top of it. |
| **Pearson Mastering** (on Marvin JS) | Commercial | As Marvin JS: drag from the dot symbols on the source atom. Students check for a dotted line where a new bond forms and click the arrow to cycle through interpretations. "Complete Marvin JS mechanism questions on a computer, not on a smartphone." [Pearson student help](https://help.pearsoncmg.com/mastering/student/mplus/TopicsStudent/answering_marvin_mechanism.htm) | Ordered **answer evaluators**. "Grading conditions are evaluated in order starting at the top"; the first match decides. *Mechanism Electron Flow* checks whether "the electron flow arrows in any step [...] produce the products expected" (graded by **products produced**, not arrow identity). *Mechanism Substructure* requires a substructure plus its arrows, with options to ignore charge, radical or isotope. *Mechanism Counter* counts boxes and arrows. Automatic feedback such as a missing deprotonation arrow appears before the author's own text. [Evaluators](https://help.pearsoncmg.com/mastering/authoring/simple_editor/Topics/chem_evaluators_marvin.htm), [Mechanism answer type](https://help.pearsoncmg.com/mastering/authoring/simple_editor/Topics/chem_mechanism_marvin.htm), [Substructure evaluator](https://help.pearsoncmg.com/mastering/authoring/simple_editor/Topics/chem_mech_substruct_evaluator.htm). Partial credit isn't described. |
| **W. W. Norton Smartwork** | Commercial | Electron Flow tool, double-headed or fishhook arrows. Click the origin bond or lone pair, drag, release "when the destination bond or atom becomes highlighted". Double-clicking an atom enlarges it so you can pick a specific electron. Lone pairs must be drawn. [Norton multi-step module](https://knowledgebase.wwnorton.com/help/multi-step-module) | One box per step with feedback on common errors in that step. Generic feedback (check lone pairs, formal charges, arrow direction) after repeated or unusual errors. Steps can be submitted one at a time. Locked boxes are given and not graded. |
| **UCI Reaction Explorer / ChemDB** (Chen, Kayala, Baldi; sold via Wiley) | Commercial | Click a source (atom or bond), then click a target. For a bond source the target is the space where the new bond forms. Blue semicircles show the selection. Separate fishhook tool. [Walkthrough](https://chemdb.igb.uci.edu/cgibin/tutorial/help/walkthrough.mechanismProblem.htm), [Reaction Explorer](https://appserver-sqlv.onrender.com/cgibin/tutorial/ReactionTutorialSetupWeb.py) | Per step: reports whether the submission "matched any expected steps", and congratulates once every expected step is done. **Unverified:** whether it matches against a rule base or an answer key. |
| **Mechanisms app** (Alchemie) | Commercial (one-time purchase) | Built for touch: students "explore the electron movement [...] through a touch screen interface of a smart phone or tablet with real-time feedback", game-like. Winter et al., *J. Chem. Educ.* 2020, 97, 4520 ([abstract](https://idun.augsburg.edu/faculty_scholarship/74), [NSF PAR full text](https://par.nsf.gov/servlets/purl/10205034)), [App Store](https://apps.apple.com/us/app/id1157056029) | Every move is checked immediately with graphical and audio feedback. Moves are logged as a "decision tree", which allows hypothesis-driven trial and error. **Unverified:** the exact gesture details (paper full text not read). |
| **EasyOChem Moodle qtype** (`qtype_easyomechjs`) | GPL (Moodle), needs commercial Marvin JS | Marvin JS | Superseded by OpenOChem's LTI system, which is no longer maintained. [Moodle plugin](https://moodle.org/plugins/qtype_easyomechjs), [older repo](https://github.com/cleblond/moodle-qtype_easyomech) |
| **Reusch evaluator** (MSU archive) | Free, Java era | Students *don't* draw arrows. They're shown the arrows and draw the products in JME. [Reusch](https://reusch-archive.organicchemistrydata.org/Questions/MOLEDITOR/mechprb2.htm) | Products compared with "Check Answer". This is the reverse task ("arrows → products") and is cheap to build. |
| **OrgChem101 "Mastering the Arrows"** (uOttawa) | Free, login | Interactive videos and questions with instant feedback. [Module list](https://orgchem101.uottawa.ca/modules.php) | Pre/post-test learning gains after about one hour, largest on "draw the products" items. Flynn et al., *CERP* 2020 ([article](https://pubs.rsc.org/en/content/articlehtml/2020/rp/c9rp00274j)) |
| **AktivGrid**, **Macmillan Achieve/Sapling**, **CLUE** | Commercial / research | No public technical docs found. AktivGrid only claims "rich feedback that helps them identify missed concepts" ([Aktiv](https://aktiv.com/organic-arrow-drawing)). | Unknown. |
| **Ketcher** (EPAM) | **Apache-2.0** | **No electron-flow arrows.** It has multi-tail and retrosynthetic reaction arrows ([2.25.0 notes](https://lifescience.opensource.epam.com/ketcher/release-notes/ketcher-2.25.0.html)). Open issues for a lone-pair tool ([#9783](https://github.com/epam/ketcher/issues/9783), [#1383](https://github.com/epam/ketcher/issues/1383)) and delocalisation ([#11985](https://github.com/epam/ketcher/issues/11985)). | n/a |
| **Kekule.js** | **MIT** | `Kekule.Glyph.ElectronPushingArrow` (an arc) with `donor`/`receptor` (atom or bond) and `directDonor`/`directReceptor` (e.g. a specific lone pair), and `electronCount` 1 or 2 set by arrowhead side. A `BondFormingElectronPushingArrow` variant exists. The Composer editor exposes single and double presets. [glyph source](https://unpkg.com/kekule@1.0.4/src/chemdoc/kekule.glyph.chemGlyphs.js), [repo](https://github.com/partridgejiang/Kekule.js) | None. It's an editor, not a grader. |

### Interaction patterns that work (and fail) on touch

1. **Drag from source to sink, highlight on hover, commit on release** is universal (Marvin, Norton, Pearson). On touch, the finger hides the target, so tools add **enlarged targets** (Norton: double-click to enlarge an atom) and **post-hoc toggles** (Marvin and Pearson: tap the arrow to cycle incipient-bond or polarity interpretations). Pearson still says not to use a phone. That's the gap our mobile-first requirement has to close.
2. **Tap-tap (source then target)** (UCI) avoids occlusion and a precise drag. It's also the natural keyboard-operable fallback: focus a source, press Enter, move to a target, press Enter. That fits the map's accessibility requirement.
3. **Discrete, snap-to-valid targets.** Arrows connect to *semantic* objects (lone pair, bond, atom, bond-forming gap), never to free coordinates. Marvin refuses invalid sources and limits each electron pair to one arrow. Snapping turns arrow drawing into choosing from a small set of options, which is what makes touch and grading tractable.
4. **Show lone pairs explicitly.** Marvin needs lone-pair visibility to start from one. Norton needs lone pairs drawn and gives feedback when they're missing.
5. **Immediate per-move feedback** (Mechanisms app) versus **submit-per-step** (Norton, UCI). Both are used. Per-move suits Lesson Steps, per-step suits Practice Sets.
6. **Pedagogical caveat:** students often "decorate" a known answer with arrows instead of reasoning from them (Grove, Cooper & Rush, *J. Chem. Educ.* 2012, "Decorating with Arrows", [ERIC record](https://www.science.gov/topicpages/c/curved+arrow+notation); full text not read). Running the arrows to *produce* the next structure, rather than showing the product first, guards against this.

## 2. How answers are graded

The approaches, from simplest to most robust:

1. **Exact arrow match** against an answer key, by (source, sink) pairs. Simple, but it rejects correct alternatives: symmetry-equivalent atoms, arrow order, or drawing to the atom rather than the bond.
2. **Product-equivalence** (Pearson *Mechanism Electron Flow*): run the student's arrows on the mapped reactants and compare the resulting structure with the expected one by canonical form. This accepts any arrow set that gives the right intermediate. It needs an "apply arrows" engine, which every dataset format below provides by construction (FlowER's bond-electron matrix, MechSMILES' arrow semantics, Lewis-labeled graphs).
3. **Rule checks for feedback**: required substructure plus its arrows (Pearson Substructure), arrow count (Pearson Counter), and generic validity: electrons must leave a source, octet not exceeded, arrow direction. Norton's generic feedback names lone pairs, formal charges and arrow direction as the usual culprits. Ordered first-match evaluators (Pearson) let an author attach specific feedback to specific *wrong* answers.
4. **Partial credit:** none of the public docs describe any. Norton and UCI give **per-step** granularity, which is the natural unit. For a no-account, practice-only site, "attempts until correct, with hints" is enough.

Formal backing for (2): Lewis-labeled graphs model curly arrows and fishhooks as atomic electron transfers that conserve valence electrons and charge. Strict replay accepted all 160 reviewed steps and rejected all 1,120 controlled corruptions (Phan, [arXiv 2607.26088](https://arxiv.org/abs/2607.26088), CC BY 4.0, no code linked).

## 3. How mechanisms are stored as data

| Format | Step representation | Arrow encoding | Licence |
|---|---|---|---|
| **PMechDB** (Baldi lab) | Canonicalised, balanced, atom-mapped elementary polar step as reaction SMIRKS | Arrow codes: `=` separates the electrons' start from their end, `a,b` means the bond a–b, `;` separates arrows. Nucleophile atoms are mapped 10, 11, … and electrophile atoms 20, 21, …, so a chain reads e.g. `15>14>…>10>20>21…`. CSV columns: SMIRKS+arrows, classification (+ solvent etc.). [PMechDB how-to](https://deeprxn.ics.uci.edu/pmechdb/howtouse), [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC10966657) | **CC BY-NC-ND 4.0**: no derivatives, so not shippable in our Problem Bank |
| **RMechDB** | Same, radical steps | Fishhook arrows | See [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9976277/) |
| **MechSMILES** (Schwaller lab) | Mapped SMILES `\|` arrows | Three types: attack `(a, b)` (lone pair on a attacks b), ionization `((a, b), b)` (bond a–b breaks toward b), bond attack `((a, b), c)` (bond a–b attacks c through b). Example: `[BH3-:2][H:3].[CH:4](CCCC(C)=O)=[O:1]\|((2, 3), 4);((4, 1), 1)`. Explicit H atoms are mapped so specific hydrogens can be chosen (E2). [arXiv 2512.05722](https://arxiv.org/html/2512.05722v1) | Code: [ChRIMP](https://github.com/schwallergroup/ChRIMP) **MIT**. Data: [HF SchwallerGroup](https://huggingface.co/SchwallerGroup), licence not checked |
| **mech-USPTO-31k / MechFinder** | Reactants plus every arrow to products, from reaction + expert mechanistic templates. Stable intermediates are not given explicitly. | List of tuples, e.g. `[(26, 1), ([1, 9], 9), (9, [9, 1]), ([1, 101], 101)]`, with atom or `[bond]` as source and sink | [MechFinder](https://github.com/snu-micc/MechFinder): no licence stated; open release stubs core functions. Chen et al., *Sci. Data* 2024 |
| **FlowER** (Coley lab) | Bond-electron (BE) matrix (Ugi). A step is the change in the BE matrix, with atoms and electrons conserved. | Implicit: a delta matrix | **MIT** ([repo](https://github.com/FongMunHong/FlowER)). *Nature* 645, 115 (2025). Data on figshare |
| **Marvin MRV** | Molecule document | `MEFlow` (2-point polyline with `arcAngle`). Source: `MEFlowBasePoint` (atom plus electron container) or `MAtomSetPoint` (bond). Sink: `MAtomSetPoint` (atom, bond or incipient bond). [MRV docs](https://docs.chemaxon.com/lts-iodine/marvin-documents-mrv.html) | Proprietary format, readable spec |
| **Kekule.js JSON** | Chem document | `ElectronPushingArrow` with donor/receptor refs and electronCount | MIT |

All the research formats agree on one model: **atoms are identified by map number, and an arrow is (source → sink) where each end is an atom (lone pair or radical) or a bond (pair of atoms)**. They differ only in syntax.

## 4. Proposed data model for a mechanism Step (draft for #14)

```ts
type AtomRef = number;                    // atom-map number in `start`
type ElectronSite =
  | { atom: AtomRef }                     // lone pair / radical on atom
  | { bond: [AtomRef, AtomRef] };         // existing bond
type Sink =
  | { atom: AtomRef }
  | { bond: [AtomRef, AtomRef] }          // existing bond (e.g. making a π bond)
  | { newBond: [AtomRef, AtomRef] };      // incipient bond (the gap)

interface Arrow { from: ElectronSite; to: Sink; electrons: 1 | 2 }  // 1 = fishhook

interface MechanismStep {
  start: string;           // atom-mapped SMILES, explicit H where it matters
  arrows: Arrow[];         // answer key (one accepted solution)
  result?: string;         // optional: derived by applying arrows; stored for review/diff
  grading: "products" | "exact";       // default "products"
  feedback?: { match: Partial<Arrow>[] | "missing-arrow" | "wrong-direction"; text: string }[];
  given?: Arrow[];         // pre-drawn, locked arrows (Norton-style locked boxes)
}
interface MechanismProblem { steps: MechanismStep[]; source: string /* citation */ }
```

- Serialise arrows to and from MechSMILES (`(a,b)`, `((a,b),b)`, `((a,b),c)`) so we can import and validate against MIT-licensed research code and test sets.
- `result` is always *derived* (apply arrows → canonical SMILES). Grading compares the student's derived result with the key's, so symmetry-equivalent atoms and arrow order don't matter. Exact arrow match is used only to pick the feedback message.
- The same structure drives the video-ready Scene. Animate each arrow, then morph to `result`.

## 5. Reusable open pieces

- **Kekule.js (MIT):** arrow glyph geometry and donor/receptor model; possibly the whole editor. It's a large dependency, and touch quality isn't verified.
- **Ketcher (Apache-2.0):** a good structure editor, but it would need a custom arrow layer. Lone pairs aren't even drawn yet.
- **RDKit.js (BSD-3, not researched here):** a candidate for canonical SMILES comparison in the browser. Check its licence and size in the stack ticket.
- **ChRIMP / MechSMILES (MIT):** reference semantics for "apply arrows" and a source of test fixtures.
- **FlowER (MIT):** BE-matrix conservation check as a reference algorithm.
- **Not reusable:** PMechDB (NC-ND), Marvin JS (commercial), MechFinder (licence unstated, core withheld), OrgChem101 and realochem.study (CC BY-NC per its footer) content.

## Open questions / gaps

- I couldn't read the full text of Winter 2020 (Mechanisms app gestures), the Reaction Explorer matching method, Achieve/Sapling or CLUE grading.
- I didn't check the licence of the Hugging Face SchwallerGroup datasets.
- Prototype needed: tap-tap versus drag on a 375 px screen with enlarged atom targets (a #14 / prototype ticket).
