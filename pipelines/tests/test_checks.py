import numpy as np
import pytest

from geometry.checks import connectivity_matches, imaginary_modes

# Methane, CCCBDB experimental Cartesians (CAS 74-82-8), Å.
METHANE = (["C", "H", "H", "H", "H"], np.array([
    [0.0, 0.0, 0.0], [0.6276, 0.6276, 0.6276], [0.6276, -0.6276, -0.6276], [-0.6276, 0.6276, -0.6276], [-0.6276, -0.6276, 0.6276],
]))


def test_connectivity_matches_the_smiles_graph_whatever_the_atom_order():
    symbols, xyz = METHANE
    assert connectivity_matches("C", symbols, xyz)
    assert connectivity_matches("C", symbols[::-1], xyz[::-1])


def test_connectivity_catches_a_broken_bond():
    symbols, xyz = METHANE
    stretched = xyz.copy()
    stretched[1] *= 3  # one H pulled off to ~3.3 Å
    assert not connectivity_matches("C", symbols, stretched)


def test_connectivity_catches_a_different_molecule():
    symbols, xyz = METHANE
    assert not connectivity_matches("N", symbols, xyz)
    assert not connectivity_matches("CC", symbols, xyz)


@pytest.mark.parametrize("freqs, n", [([41.0, 600.2, 1500.0], 0), ([-35.2, 600.0], 1), ([-1.0, -2.0, 300.0], 2)])
def test_imaginary_modes_counts_negative_frequencies(freqs, n):
    assert imaginary_modes(freqs) == n
