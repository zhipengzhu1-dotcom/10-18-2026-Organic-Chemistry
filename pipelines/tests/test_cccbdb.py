from pathlib import Path

import pytest

from geometry.cccbdb import IdentityError, check_identity, parse
from geometry.molecules import BY_ID

CACHE = Path(__file__).parents[1] / "geometry" / "cccbdb"


def page(cas_digits: str):
    return parse((CACHE / f"{cas_digits}.html").read_text(encoding="utf-8"))


def test_parses_methane_name_formula_and_cartesians():
    p = page("74828")
    assert p.name == "Methane"
    assert p.formula == {"C": 1, "H": 4}
    assert [a.label for a in p.atoms] == ["C1", "H2", "H3", "H4", "H5"]
    assert (p.atoms[1].x, p.atoms[1].y, p.atoms[1].z) == (0.6276, 0.6276, 0.6276)


def test_parses_internal_coordinates_with_their_reference_keys():
    p = page("74828")
    r, a = p.internals
    assert (r.description, r.value, r.atoms, r.ref, r.comment) == ("rCH", 1.087, (1, 2), "1979Hir:213", "re")
    assert (a.description, a.value, a.atoms, a.ref) == ("aHCH", 109.471, (2, 1, 3), "1974sve/kov")


def test_parses_the_reference_list_with_dois():
    refs = page("74828").references
    assert refs["1979Hir:213"].doi == "10.1016/0022-2852(79)90103-6"
    assert "Anharmonic Potential Function and Equilibrium Structure of Methane" in refs["1979Hir:213"].citation
    assert refs["1974sve/kov"].doi is None


def test_identity_check_accepts_the_requested_molecule():
    check_identity(page("74828"), BY_ID["methane"])


def test_identity_check_rejects_a_page_for_another_species():
    # CCCBDB answers an unknown CAS with some other species and HTTP 200; the check must catch it.
    with pytest.raises(IdentityError, match="formula"):
        check_identity(page("74828"), BY_ID["ammonia"])
