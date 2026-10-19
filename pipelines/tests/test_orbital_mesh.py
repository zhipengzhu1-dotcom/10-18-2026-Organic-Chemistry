"""The orbital mesh gate (#70): every lobe is a closed surface whose triangles wind counter-clockwise
seen from outside and whose normals point outward, checked before any mesh is written. Analytic
fields stand in for orbitals, so these run without PySCF."""

import numpy as np
import pytest

from orbitals.mesh import Grid, MeshError, assert_outward, isosurface, read_glb, write_glb

GRID = Grid(origin=np.array([-2.0, -2.0, -2.0]), step=0.1, shape=(41, 41, 41))


def p_orbital(points: np.ndarray) -> np.ndarray:
    """A 2p_z-like field: + above the xy plane, − below."""
    r = np.linalg.norm(points, axis=1)
    return points[:, 2] * np.exp(-3.0 * r)


def p_gradient(points: np.ndarray) -> np.ndarray:
    r = np.maximum(np.linalg.norm(points, axis=1), 1e-12)[:, None]
    e = np.exp(-3.0 * r)
    g = -3.0 * points[:, 2:3] * e * points / r
    g[:, 2] += e[:, 0]
    return g


def lobes():
    values = p_orbital(GRID.points()).reshape(GRID.shape)
    return {sign: isosurface(values, GRID, 0.05, sign, p_gradient) for sign in ("+", "-")}


def test_a_p_orbital_meshes_into_two_outward_lobes_one_per_sign():
    plus, minus = lobes()["+"], lobes()["-"]
    assert plus.vertices[:, 2].min() > 0 and minus.vertices[:, 2].max() < 0
    for sign, lobe in (("+", plus), ("-", minus)):
        assert_outward(lobe, sign, p_gradient)  # passes: no exception


def test_the_gate_rejects_clockwise_winding():
    plus = lobes()["+"]
    flipped = plus._replace(faces=plus.faces[:, ::-1])
    with pytest.raises(MeshError, match="counter-clockwise"):
        assert_outward(flipped, "+", p_gradient)


def test_the_gate_rejects_inward_normals():
    plus = lobes()["+"]
    with pytest.raises(MeshError, match="normals"):
        assert_outward(plus._replace(normals=-plus.normals), "+", p_gradient)


def test_the_gate_rejects_a_lobe_cut_open_by_the_grid_edge():
    small = Grid(origin=np.array([-2.0, -2.0, 0.3]), step=0.1, shape=(41, 41, 18))
    values = p_orbital(small.points()).reshape(small.shape)
    with pytest.raises(MeshError, match="closed"):
        isosurface(values, small, 0.05, "+", p_gradient)


def test_a_mesh_survives_the_glb_round_trip_within_quantisation(tmp_path):
    ls = lobes()
    path = tmp_path / "p.glb"
    write_glb(path, [("plus", ls["+"]), ("minus", ls["-"])])
    back = dict(read_glb(path))
    assert list(back) == ["plus", "minus"]
    for name, sign in (("plus", "+"), ("minus", "-")):
        assert np.array_equal(back[name].faces, ls[sign].faces)
        assert np.abs(back[name].vertices - ls[sign].vertices).max() < 1e-3  # Å
        assert np.abs(back[name].normals - ls[sign].normals).max() < 0.02
        assert_outward(back[name], sign, p_gradient)


def test_write_glb_refuses_a_mesh_that_fails_the_gate(tmp_path):
    plus = lobes()["+"]
    with pytest.raises(MeshError):
        write_glb(tmp_path / "bad.glb", [("plus", plus._replace(faces=plus.faces[:, ::-1]))], gate={"plus": ("+", p_gradient)})
    assert not (tmp_path / "bad.glb").exists()
