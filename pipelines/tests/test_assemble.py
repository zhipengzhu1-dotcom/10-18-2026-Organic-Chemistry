from pathlib import Path

import pytest

from geometry.assemble import NIST_CITATION, computed, experimental, inconsistencies
from geometry.cccbdb import parse
from geometry.molecules import BY_ID, Molecule

CACHE = Path(__file__).parents[1] / "geometry" / "cccbdb"


def page(cas_digits: str):
    return parse((CACHE / f"{cas_digits}.html").read_text(encoding="utf-8"))


def test_experimental_file_cites_each_value_to_its_paper_via_cccbdb():
    f = experimental(BY_ID["methane"], page("74828"))
    assert f["id"] == "methane" and f["kind"] == "molecule" and f["geometry"] == "experimental"
    r = f["values"]["r.CH"]
    assert (r["value"], r["unit"], r["quantity"], r["label"]) == (1.087, "Å", "bond-length", "C–H")
    src = f["sources"][r["source"]]
    assert src["kind"] == "experimental" and src["via"] == "cccbdb"
    assert "Anharmonic Potential Function" in src["citation"] and "doi:10.1016/0022-2852(79)90103-6" in src["citation"]
    assert f["values"]["a.HCH"]["value"] == 109.471
    assert len(f["atoms"]["list"]) == 5 and f["atoms"]["source"] == "cccbdb"


def test_experimental_file_carries_the_nist_notice_and_sits_outside_mit():
    f = experimental(BY_ID["methane"], page("74828"))
    assert NIST_CITATION in f["notice"]
    assert "not covered by" in f["notice"] and "MIT" in f["notice"]
    assert all("NIST" in s["licence"] for s in f["sources"].values())


def test_experimental_file_lists_bonds_with_orders():
    f = experimental(BY_ID["ethylene"], page("74851"))
    orders = sorted(o for _, _, o in f["bonds"])
    assert orders == [1, 1, 1, 1, 2]


def test_parameters_on_dummy_atoms_are_left_out():
    f = experimental(BY_ID["ammonia"], page("7664417"))
    assert set(f["values"]) == {"r.NH", "a.HNH"}


def test_repeated_parameter_names_get_distinct_keys():
    # Ethanol lists three different rCH values (methyl, methyl, methylene).
    f = experimental(BY_ID["ethanol"], page("64175"))
    ch = sorted(k for k in f["values"] if k.startswith("r.CH"))
    assert ch == ["r.CH.1-5", "r.CH.1-6", "r.CH.2-8"]


def test_a_page_whose_cartesians_disagree_with_its_parameters_is_rebuilt_from_the_parameters():
    ketene = page("463514")
    assert inconsistencies(ketene.atoms, ketene.internals)  # CCCBDB's own table is inconsistent (L4 spec)
    f = experimental(BY_ID["ketene"], ketene)
    assert "rebuilt" in f["provenance"]
    from geometry.cccbdb import Atom

    atoms = [Atom(f"{e}{i + 1}", e, x, y, z) for i, (e, x, y, z) in enumerate(f["atoms"]["list"])]
    assert inconsistencies(atoms, ketene.internals) == []


def test_a_symmetric_molecule_is_rebuilt_with_every_equivalent_bond_and_angle_at_its_listed_value():
    # CCCBDB lists one C–Cl, one Cl–C–Cl and one H–C–Cl for chloroform; by symmetry they hold for all three.
    # A fit to the listed atoms alone left the other two C–Cl bonds at 1.743 and 1.776 Å (#87).
    from geometry.assemble import measure
    import numpy as np

    f = experimental(BY_ID["chloroform"], page("67663"))
    assert "rebuilt" in f["provenance"] and "symmetry" in f["provenance"]["rebuilt"]
    xyz = np.array([a[1:] for a in f["atoms"]["list"]], dtype=float)
    symbols = [a[0] for a in f["atoms"]["list"]]
    c, h = symbols.index("C"), symbols.index("H")
    cls = [i for i, s in enumerate(symbols) if s == "Cl"]
    v = {k: f["values"][k]["value"] for k in ("r.CCl", "a.ClCCl", "a.HCCl")}
    for i in cls:
        assert abs(measure(xyz, (c, i)) - v["r.CCl"]) < 0.001
        assert abs(measure(xyz, (h, c, i)) - v["a.HCCl"]) < 0.1
    for k, i in enumerate(cls):
        for j in cls[k + 1:]:
            assert abs(measure(xyz, (i, c, j)) - v["a.ClCCl"]) < 0.1


def test_consistent_pages_are_used_as_they_are():
    f = experimental(BY_ID["methane"], page("74828"))
    assert "rebuilt" not in f["provenance"]
    assert f["atoms"]["list"][1] == ["H", 0.6276, 0.6276, 0.6276]


WATER_LIKE = Molecule(
    id="test-water", title="Water", formula="H2O", smiles="O", cid=962, cas=None, tier="computed", used_by="test",
    start="xyz", start_note="test start", values={"r.OH": ("O–H", (0, 1)), "a.HOH": ("H–O–H", (1, 0, 2))},
)


def result(freqs=(1600.0, 3700.0, 3800.0)):
    return {
        "id": "test-water", "smiles": "O", "charge": 0,
        "method": {"program": "PySCF", "version": "2.14.0", "level": "B3LYP/cc-pVTZ", "optimizer": "geomeTRIC 1.1.1, GAU_TIGHT",
                   "xc_definition": "x", "grid_level": 4, "basis": "cc-pvtz"},
        "date": "2026-10-19", "start": "test start", "input_sha256": "ab" * 32, "energy_hartree": -76.4,
        "atoms": [["O", 0.0, 0.0, 0.0], ["H", 0.96, 0.0, 0.0], ["H", 0.0, 0.96, 0.0]],
        "frequencies_cm1": list(freqs), "imaginary_modes": sum(f < 0 for f in freqs),
    }


def test_computed_file_is_labelled_computed_with_method_and_max_deviation():
    f = computed(WATER_LIKE, result(), max_deviation=0.012)
    assert f["geometry"] == "computed"
    src = f["sources"]["ours"]
    assert src["kind"] == "computed"
    assert src["method"] == {"program": "PySCF", "version": "2.14.0", "level": "B3LYP/cc-pVTZ", "date": "2026-10-19", "maxDeviation": 0.012}
    assert f["values"]["r.OH"] == {"label": "O–H", "quantity": "bond-length", "value": 0.96, "unit": "Å", "source": "ours", "atoms": [0, 1]}
    assert f["values"]["a.HOH"]["value"] == 90.0
    assert f["provenance"]["start"] == "test start" and f["provenance"]["lowestFrequency"] == 1600.0
    assert "notice" not in f


def test_computed_file_refuses_a_structure_that_is_not_a_minimum():
    with pytest.raises(ValueError, match="imaginary"):
        computed(WATER_LIKE, result(freqs=(-120.0, 1600.0, 3700.0)), max_deviation=0.012)
