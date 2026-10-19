"""Lesson 8 s09's combined frame (#86): NH₃ placed over BF₃ for the picture. Each molecule keeps its
own B3LYP-optimised shape; only a rigid move puts them together, N straight over B with the lone
pair facing down. Runs without PySCF."""

import json

import numpy as np

from orbitals.compute import DATA, PAIR, PAIR_GAP, place_pair


def source_atoms(molecule: str) -> list:
    return json.loads((DATA / f"{molecule}.json").read_text(encoding="utf-8"))["atoms"]["list"]


def xyz(atoms: list) -> np.ndarray:
    return np.array([a[1:] for a in atoms], float)


def placed() -> list:
    return place_pair(source_atoms("ammonia-b3lyp"), source_atoms("boron-trifluoride-b3lyp"))


def test_boron_trifluoride_lies_flat_at_the_origin():
    atoms = placed()
    bf3 = [a for a in atoms if a[0] in ("B", "F")]
    assert [a[0] for a in bf3] == ["B", "F", "F", "F"]
    assert np.allclose(xyz(bf3)[0], 0, atol=1e-9)
    assert np.allclose(xyz(bf3)[:, 2], 0, atol=1e-3)


def test_nitrogen_sits_straight_over_boron_with_its_hydrogens_further_up():
    atoms = placed()
    n = xyz([a for a in atoms if a[0] == "N"])[0]
    hs = xyz([a for a in atoms if a[0] == "H"])
    assert np.allclose(n[:2], 0, atol=1e-3)
    assert abs(n[2] - PAIR_GAP) < 1e-9
    assert (hs[:, 2] > n[2]).all()


def test_each_molecule_keeps_its_own_shape():
    atoms = placed()
    for molecule, elements in (("ammonia-b3lyp", ("N", "H")), ("boron-trifluoride-b3lyp", ("B", "F"))):
        before = xyz(source_atoms(molecule))
        after = xyz([a for a in atoms if a[0] in elements])
        d = lambda p: np.linalg.norm(p[:, None] - p[None], axis=2)  # noqa: E731
        assert np.allclose(d(before), d(after), atol=2e-4)


def test_the_committed_pair_file_is_the_placement_of_the_committed_molecules():
    doc = json.loads((DATA / f"{PAIR}.json").read_text(encoding="utf-8"))
    assert doc["kind"] == "molecule" and doc["geometry"] == "computed"
    assert doc["atoms"]["list"] == placed()
    assert sorted(doc["bonds"]) == [[0, 1, 1], [0, 2, 1], [0, 3, 1], [4, 5, 1], [4, 6, 1], [4, 7, 1]]
