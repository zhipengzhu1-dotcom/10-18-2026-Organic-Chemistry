"""Sanity checks shared by the CCCBDB and PySCF paths."""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np

# Covalent radii (Å), Cordero et al., Dalton Trans. 2008, 2832, doi:10.1039/b801115j (C: sp3 value).
CORDERO = {"H": 0.31, "B": 0.84, "C": 0.76, "N": 0.71, "O": 0.66, "F": 0.57, "Cl": 1.02, "Br": 1.20}
BOND_FACTOR = 1.25  # bonded if d <= 1.25 × (r_i + r_j)


def bonds_from_radii(symbols: Sequence[str], xyz: np.ndarray) -> list[tuple[int, int]]:
    """Atom pairs (i < j) close enough to be bonded, from Cordero covalent radii."""
    xyz = np.asarray(xyz, dtype=float)
    out = []
    for i in range(len(symbols)):
        for j in range(i + 1, len(symbols)):
            if np.linalg.norm(xyz[i] - xyz[j]) <= BOND_FACTOR * (CORDERO[symbols[i]] + CORDERO[symbols[j]]):
                out.append((i, j))
    return out


def _skeleton_smiles(symbols: Sequence[str], bonds: Sequence[tuple[int, int]]) -> str:
    from rdkit import Chem

    rw = Chem.RWMol()
    for s in symbols:
        a = Chem.Atom(s)
        a.SetNoImplicit(True)
        rw.AddAtom(a)
    for i, j in bonds:
        rw.AddBond(int(i), int(j), Chem.BondType.SINGLE)
    mol = rw.GetMol()
    mol.UpdatePropertyCache(strict=False)
    return Chem.MolToSmiles(mol, canonical=True, allHsExplicit=True)


def connectivity_matches(smiles: str, symbols: Sequence[str], xyz: np.ndarray, charge: int = 0) -> bool:
    """True when the bonds implied by the coordinates form the same graph as the SMILES (bond orders ignored)."""
    from rdkit import Chem

    ref = Chem.AddHs(Chem.MolFromSmiles(smiles))
    ref_symbols = [a.GetSymbol() for a in ref.GetAtoms()]
    if sorted(ref_symbols) != sorted(symbols):
        return False
    ref_bonds = [(b.GetBeginAtomIdx(), b.GetEndAtomIdx()) for b in ref.GetBonds()]
    return _skeleton_smiles(ref_symbols, ref_bonds) == _skeleton_smiles(symbols, bonds_from_radii(symbols, xyz))


def imaginary_modes(freqs_cm1: Sequence[float]) -> int:
    """Imaginary harmonic modes, reported as negative wavenumbers."""
    return sum(1 for f in freqs_cm1 if f < 0)
