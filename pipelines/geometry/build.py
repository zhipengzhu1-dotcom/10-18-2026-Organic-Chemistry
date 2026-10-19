"""Write content/subjects/organic/data/<id>.json for every Unit 1 molecule from the committed caches.

Reads only committed inputs (geometry/cccbdb/*.html and geometry/computed/**/*.json), so it is cheap
and offline:  uv run python -m geometry.build
Stops with a message, writing nothing, if any check fails.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from .assemble import computed, experimental, max_bond_deviation
from .cccbdb import IdentityError, check_identity, parse
from .compute import result_path
from .fetch import cache_path
from .molecules import ALL, MOLECULES, Molecule

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "content" / "subjects" / "organic" / "data"
SUMMARY = Path(__file__).parent / "computed" / "validation" / "summary.json"
CHECKED = "2026-10-19"


def page_for(cas: str):
    path = cache_path(cas)
    if not path.exists():
        raise SystemExit(f"no cached CCCBDB page for CAS {cas}; run `python -m geometry.fetch {cas}`")
    return parse(path.read_text(encoding="utf-8"))


def what_cccbdb_has(m: Molecule) -> str:
    if not m.cas:
        return "not looked up (not a neutral CCCBDB species)"
    page = page_for(m.cas)
    try:
        check_identity(page, m)
    except IdentityError:
        return f"not in CCCBDB: CAS {m.cas} returns another species ({page.name}) (checked {CHECKED})"
    if page.has_cartesians:
        return f"CCCBDB has experimental Cartesians and parameters (CAS {m.cas}, checked {CHECKED}); not used, see note"
    return f"CCCBDB lists internal coordinates only, no Cartesian table (CAS {m.cas}, checked {CHECKED})"


def load_result(mid: str, *, validate: bool = False) -> dict | None:
    path = result_path(mid, validate=validate)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def main() -> int:
    files: dict[str, dict] = {}
    for m in MOLECULES:
        if m.tier != "experimental":
            continue
        page = page_for(m.cas)
        check_identity(page, m)
        if not page.has_cartesians:
            raise SystemExit(f"{m.id}: CCCBDB has no Cartesian table; move it to the computed tier in molecules.py (with a note)")
        files[m.id] = experimental(m, page)

    # Max deviation of B3LYP/cc-pVTZ bond lengths from experiment, over every experimental molecule we re-optimised
    # (from the same starting atoms, so the atom order matches).
    per_molecule = {}
    for mid, f in files.items():
        res = load_result(mid, validate=True) or load_result(f"{mid}-b3lyp")
        if res:
            per_molecule[mid] = round(max_bond_deviation(f["atoms"]["list"], res["atoms"]), 4)
    missing = sorted(set(files) - set(per_molecule))
    max_dev = math.ceil(max(per_molecule.values()) * 1000) / 1000 if per_molecule else None
    SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY.write_text(
        json.dumps({"level": "B3LYP/cc-pVTZ", "maxDeviationAngstrom": max_dev, "perMolecule": per_molecule, "notReoptimised": missing},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    for m in ALL:
        if m.tier != "computed":
            continue
        res = load_result(m.id)
        if res is None:
            raise SystemExit(f"{m.id}: no PySCF result; run `python -m geometry.compute {m.id}`")
        files[m.id] = computed(m, res, max_deviation=max_dev, extra={"cccbdb": what_cccbdb_has(m), "usedBy": m.used_by})

    for m in MOLECULES:
        if m.tier == "experimental":
            files[m.id]["provenance"]["usedBy"] = m.used_by

    DATA.mkdir(parents=True, exist_ok=True)
    for mid, f in files.items():
        (DATA / f"{mid}.json").write_text(json.dumps(f, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(files)} data files; max B3LYP bond deviation {max_dev} Å over {len(per_molecule)} molecules; not re-optimised: {missing}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
