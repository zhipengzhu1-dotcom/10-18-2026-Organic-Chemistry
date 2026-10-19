"""Every Unit 1 molecule that needs 3D geometry, and how its geometry is sourced.

Tiers (ADR 0002, research #19):
- "experimental": NIST CCCBDB, used only when its page has a complete Cartesian table.
  If CCCBDB turns out to have no Cartesians, the build stops and says so; the molecule
  is moved to "computed" here by hand, with a note, never silently.
- "computed": our own PySCF B3LYP/cc-pVTZ optimisation plus a frequency check.

`start` (computed only) says where the optimisation starts:
- "cccbdb": the CCCBDB experimental Cartesians of `start_from` (same atom order, so the
  result is directly comparable with experiment);
- "xyz": explicit coordinates in `xyz` (a deliberate conformer, recorded in the file);
- "smiles": an RDKit ETKDG embed of `smiles` (seed 7), then MMFF, then `dihedrals` set.

`values` (computed only) names the parameters the data file cites: key -> (label, atom indices,
0-based). Experimental files cite CCCBDB's own internal-coordinate table instead.
"""

from __future__ import annotations

from dataclasses import dataclass, field

Dihedral = tuple[int, int, int, int, float]


@dataclass(frozen=True)
class Molecule:
    id: str
    title: str
    formula: str  # Hill-ish formula used to check the CCCBDB page (element counts)
    smiles: str
    cid: int
    cas: str | None  # CAS with dashes; None when CCCBDB is not consulted
    tier: str  # "experimental" | "computed"
    used_by: str
    charge: int = 0
    cccbdb_name: str | None = None  # the name CCCBDB prints in its <h1>, lower-cased
    start: str | None = None  # computed: "cccbdb" | "xyz" | "smiles"
    start_from: str | None = None  # computed + start="cccbdb": CAS of the experimental page
    start_note: str | None = None
    xyz: str | None = None
    dihedrals: tuple[Dihedral, ...] = ()
    values: dict[str, tuple[str, tuple[int, ...]]] = field(default_factory=dict)
    note: str | None = None


def M(**kw) -> Molecule:  # noqa: N802 - short constructor for the table below
    return Molecule(**kw)


# Starting structures for Lesson 6 (Å), from the prototype on prototype/lesson-06-resonance
# (prototypes/lesson-06-geometry/acetate_pyscf.py). Rough by design: PySCF optimises them.
ACETIC_ACID_SYN = """
C  -1.500  0.000  0.000
C   0.000  0.000  0.000
O   0.690  1.000  0.000
O   0.700 -1.150  0.000
H  -1.860  1.020  0.000
H  -1.860 -0.510  0.880
H  -1.860 -0.510 -0.880
H   1.650 -1.000  0.000
"""
ACETATE_IN_PLANE_H = """
C  -1.540  0.000  0.000
C   0.000  0.000  0.000
O   0.660  1.100  0.000
O   0.660 -1.100  0.000
H  -1.900  1.020  0.000
H  -1.900 -0.510  0.880
H  -1.900 -0.510 -0.880
"""

MOLECULES: list[Molecule] = [
    # Lesson 3: Molecules in 3D
    M(id="methane", title="Methane", formula="CH4", smiles="C", cid=297, cas="74-82-8", tier="experimental", cccbdb_name="methane", used_by="L3, L4"),
    M(id="ammonia", title="Ammonia", formula="H3N", smiles="N", cid=222, cas="7664-41-7", tier="experimental", cccbdb_name="ammonia", used_by="L3"),
    M(id="water", title="Water", formula="H2O", smiles="O", cid=962, cas="7732-18-5", tier="experimental", cccbdb_name="water", used_by="L3"),
    M(id="formaldehyde", title="Formaldehyde", formula="CH2O", smiles="C=O", cid=712, cas="50-00-0", tier="experimental", cccbdb_name="formaldehyde", used_by="L3"),
    M(id="carbon-dioxide", title="Carbon dioxide", formula="CO2", smiles="O=C=O", cid=280, cas="124-38-9", tier="experimental", cccbdb_name="carbon dioxide", used_by="L3"),
    M(id="boron-trifluoride", title="Boron trifluoride", formula="BF3", smiles="FB(F)F", cid=6356, cas="7637-07-2", tier="experimental", cccbdb_name="borane, trifluoro-", used_by="L3"),
    M(id="carbon-tetrachloride", title="Carbon tetrachloride", formula="CCl4", smiles="ClC(Cl)(Cl)Cl", cid=5943, cas="56-23-5", tier="experimental", cccbdb_name="carbon tetrachloride", used_by="L3"),
    M(id="dichloromethane", title="Dichloromethane", formula="CH2Cl2", smiles="ClCCl", cid=6344, cas="75-09-2", tier="experimental", cccbdb_name="methylene chloride", used_by="L3"),
    M(
        id="ethanol", title="Ethanol", formula="C2H6O", smiles="CCO", cid=702, cas="64-17-5", tier="computed",
        cccbdb_name="ethanol", used_by="L3", start="cccbdb", start_from="64-17-5",
        start_note="CCCBDB Cartesians of the anti (trans) conformer",
        note=(
            "Computed, not experimental: CCCBDB has Cartesians, but every listed parameter comes from Coussan et al. "
            "1998 (doi:10.1021/jp9805961), a matrix-isolation infrared study; infrared spectra do not determine bond "
            "lengths, so those parameters are taken to be the paper's ab initio values. Needs a human read of the paper."
        ),
        values={
            "r.OH": ("O–H", (2, 3)), "r.CO": ("C–O", (1, 2)), "r.CC": ("C–C", (0, 1)),
            "a.CCO": ("C–C–O", (0, 1, 2)), "a.HOC": ("H–O–C", (3, 2, 1)), "d.CCOH": ("C–C–O–H", (0, 1, 2, 3)),
        },
    ),
    M(
        id="2-fluorobutane-r", title="(R)-2-Fluorobutane", formula="C4H9F", smiles="C[C@@H](F)CC", cid=54429975,
        cas="359-01-7", tier="computed", cccbdb_name="butane, 2-fluoro-", used_by="L3, Practice",
        start="smiles", dihedrals=((0, 1, 3, 4, 180.0),),
        start_note="RDKit ETKDG embed (seed 7) + MMFF94, C1–C2–C3–C4 set to 180° (anti)",
        values={"r.CF": ("C–F", (1, 2)), "d.CCCC": ("C1–C2–C3–C4", (0, 1, 3, 4))},
    ),
    # Lesson 4: Hybridization & Orbitals
    M(id="ethane", title="Ethane", formula="C2H6", smiles="CC", cid=6324, cas="74-84-0", tier="experimental", cccbdb_name="ethane", used_by="L4"),
    M(id="ethylene", title="Ethylene", formula="C2H4", smiles="C=C", cid=6325, cas="74-85-1", tier="experimental", cccbdb_name="ethylene", used_by="L4"),
    M(id="acetylene", title="Acetylene", formula="C2H2", smiles="C#C", cid=6326, cas="74-86-2", tier="experimental", cccbdb_name="acetylene", used_by="L4"),
    M(id="ketene", title="Ketene", formula="C2H2O", smiles="C=C=O", cid=10038, cas="463-51-4", tier="experimental", cccbdb_name="ketene", used_by="L4"),
    # Lesson 6: Resonance (computed on purpose, same method for both; see the spec)
    M(
        id="acetic-acid", title="Acetic acid", formula="C2H4O2", smiles="CC(=O)O", cid=176, cas="64-19-7",
        tier="computed", cccbdb_name="acetic acid", used_by="L6", start="xyz", xyz=ACETIC_ACID_SYN,
        start_note="syn conformer (O=C–O–H dihedral 0°), start from the Lesson 6 prototype",
        note="Computed on purpose: Lesson 6 compares acetic acid with acetate, so both use one method.",
        values={
            "r.CO.double": ("C=O", (1, 2)),
            "r.CO.single": ("C–O", (1, 3)),
            "r.CC": ("C–C", (0, 1)),
            "d.OCOH": ("O=C–O–H", (2, 1, 3, 7)),
        },
    ),
    M(
        id="acetate", title="Acetate", formula="C2H3O2", smiles="CC(=O)[O-]", cid=175, cas=None, charge=-1,
        tier="computed", used_by="L6", start="xyz", xyz=ACETATE_IN_PLANE_H,
        start_note="one methyl H in the carboxylate plane (the perpendicular-H conformer is a methyl-rotation saddle)",
        note="Computed on purpose: Lesson 6 compares acetic acid with acetate, so both use one method.",
        values={"r.CO.a": ("C–O (a)", (1, 2)), "r.CO.b": ("C–O (b)", (1, 3)), "r.CC": ("C–C", (0, 1))},
    ),
    # Lesson 7: Which Contributor Wins (computed on purpose, same method for all three)
    M(
        id="methylamine", title="Methylamine", formula="CH5N", smiles="CN", cid=6329, cas="74-89-5",
        tier="computed", cccbdb_name="methyl amine", used_by="L7", start="smiles",
        start_note="RDKit ETKDG embed (seed 7) + MMFF94 (staggered)",
        note="Computed on purpose: Lesson 7 compares three C–N lengths, so all three use one method.",
        values={"r.CN": ("C–N", (0, 1))},
    ),
    M(
        id="acetamide", title="Acetamide", formula="C2H5NO", smiles="CC(N)=O", cid=178, cas="60-35-5",
        tier="computed", cccbdb_name="acetamide", used_by="L7", start="smiles",
        start_note="RDKit ETKDG embed (seed 7) + MMFF94",
        note="Computed on purpose: Lesson 7 compares three C–N lengths, so all three use one method.",
        values={"r.CN": ("C–N", (1, 2)), "r.CO": ("C=O", (1, 3)), "r.CC": ("C–C", (0, 1))},
    ),
    M(
        id="methanimine", title="Methanimine", formula="CH3N", smiles="C=N", cid=123139, cas="2053-29-4",
        tier="computed", cccbdb_name="methanimine", used_by="L7", start="smiles",
        start_note="RDKit ETKDG embed (seed 7) + MMFF94",
        note="Computed on purpose: Lesson 7 compares three C–N lengths, so all three use one method.",
        values={"r.CN": ("C=N", (0, 1))},
    ),
    # Practice Problems additions
    M(id="chloroform", title="Chloroform", formula="CHCl3", smiles="ClC(Cl)Cl", cid=6212, cas="67-66-3", tier="experimental", cccbdb_name="chloroform", used_by="Practice"),
    M(id="hydrogen-cyanide", title="Hydrogen cyanide", formula="CHN", smiles="C#N", cid=768, cas="74-90-8", tier="experimental", cccbdb_name="hydrogen cyanide", used_by="Practice"),
    M(id="allene", title="Allene", formula="C3H4", smiles="C=C=C", cid=10037, cas="463-49-0", tier="experimental", cccbdb_name="allene", used_by="Practice"),
]

# Lesson 8 (orbitals) re-optimises H2, ethane, ethylene, NH3 and BF3 at B3LYP/cc-pVTZ so energies and
# geometry come from one method. Each gets its own file (<id>-b3lyp), never mixed into the experimental one.
L8_NOTE = "Computed on purpose: Lesson 8 compares orbital energies, so geometry and orbitals come from one method."
LESSON8 = [
    M(id="hydrogen-b3lyp", title="Hydrogen (H₂), B3LYP", formula="H2", smiles="[H][H]", cid=783, cas="1333-74-0", tier="computed", cccbdb_name="hydrogen diatomic", used_by="L8", start="cccbdb", start_from="1333-74-0", start_note="CCCBDB experimental Cartesians",
      note=L8_NOTE, values={"r.HH": ("H–H", (0, 1))}),
    M(id="ethane-b3lyp", title="Ethane, B3LYP", formula="C2H6", smiles="CC", cid=6324, cas=None, tier="computed", used_by="L8", start="cccbdb", start_from="74-84-0", start_note="CCCBDB experimental Cartesians (staggered)",
      note=L8_NOTE, values={"r.CC": ("C–C", (0, 1)), "r.CH": ("C–H", (0, 2)), "a.HCH": ("H–C–H", (2, 0, 3))}),
    M(id="ethylene-b3lyp", title="Ethylene, B3LYP", formula="C2H4", smiles="C=C", cid=6325, cas=None, tier="computed", used_by="L8", start="cccbdb", start_from="74-85-1", start_note="CCCBDB experimental Cartesians",
      note=L8_NOTE, values={"r.CC": ("C=C", (0, 1)), "r.CH": ("C–H", (0, 2)), "a.HCH": ("H–C–H", (2, 0, 3))}),
    M(id="ammonia-b3lyp", title="Ammonia, B3LYP", formula="H3N", smiles="N", cid=222, cas=None, tier="computed", used_by="L8", start="cccbdb", start_from="7664-41-7", start_note="CCCBDB experimental Cartesians",
      note=L8_NOTE, values={"r.NH": ("N–H", (0, 1)), "a.HNH": ("H–N–H", (1, 0, 2))}),
    M(id="boron-trifluoride-b3lyp", title="Boron trifluoride, B3LYP", formula="BF3", smiles="FB(F)F", cid=6356, cas=None, tier="computed", used_by="L8", start="cccbdb", start_from="7637-07-2", start_note="CCCBDB experimental Cartesians",
      note=L8_NOTE, values={"r.BF": ("B–F", (0, 1)), "a.FBF": ("F–B–F", (1, 0, 2))}),
]

ALL = MOLECULES + LESSON8
BY_ID = {m.id: m for m in ALL}


def cas_digits(cas: str) -> str:
    return cas.replace("-", "")
