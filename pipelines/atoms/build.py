"""Lesson 0's give-or-take data (#78): Li to F, one atom alone in empty space.

- Ionization energies: the NIST Atomic Spectra Database export cached in
  `nist-asd-ie-li-f.csv` (fetched 2026-10-19 from physics.nist.gov/cgi-bin/ASD/ie.pl,
  spectra Li-F, eV, CSV). An atom's outer (valence) electron count is read from its
  ground configuration there (electrons in the n = 2 shell), and "give" is the sum of
  its first that-many ionization energies.
- Electron affinities: Andersen, Haugen & Hotop (1999), Table 3 (recommended values, eV),
  typed from the paper. Be and N are left out: their anions are not bound.

    uv run python -m atoms.build   # -> content/subjects/organic/data/{ionization,electron-affinity}-li-f.json
"""

import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
DATA = HERE.parents[1] / "content" / "subjects" / "organic" / "data"

ASD_CITATION = (
    "Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team (2024). NIST Atomic Spectra Database "
    "(ver. 5.12), https://physics.nist.gov/asd (retrieved 2026-10-19), doi:10.18434/T4W30F"
)
NIST_LICENCE = "NIST Standard Reference Data; reuse with acknowledgement (https://www.nist.gov/open/license)"
ANDERSEN_CITATION = (
    "Andersen, Haugen & Hotop, \"Binding Energies in Atomic Negative Ions: III\", "
    "J. Phys. Chem. Ref. Data 28, 1511 (1999), Table 3, doi:10.1063/1.556047"
)

NAMES = {"Li": "lithium", "Be": "beryllium", "B": "boron", "C": "carbon", "N": "nitrogen", "O": "oxygen", "F": "fluorine"}
ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"]

# Table 3, EA (eV): only the atoms whose singly charged anion is bound.
ELECTRON_AFFINITY = {"Li": 0.618049, "B": 0.279723, "C": 1.262118, "O": 1.461112, "F": 3.4011887}


def _cell(text: str) -> str:
    """The ASD CSV wraps each cell as ="…" (for spreadsheets)."""
    return text.removeprefix('="').removesuffix('"')


def read_asd(path: Path = HERE / "nist-asd-ie-li-f.csv") -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append({
                "element": _cell(row["Sp. Name"]).split()[0],
                "charge": int(_cell(row["Ion Charge"])),
                "shells": _cell(row["Ground Shells"]),
                "ie": float(_cell(row["Ionization Energy (eV)"])),
            })
    return rows


def valence(shells: str) -> int:
    """Electrons in the n = 2 shell of a ground configuration such as 1s2.2s2.2p2."""
    return sum(int(n or 1) for n in re.findall(r"2[sp](\d*)", shells))


def ionization_file(rows: list[dict]) -> dict:
    values = {}
    for el in NAMES:
        mine = sorted((r for r in rows if r["element"] == el), key=lambda r: r["charge"])
        v = valence(mine[0]["shells"])
        values[f"{el}.valence"] = {"label": f"{NAMES[el]} outer electrons", "quantity": "count", "value": v, "source": "asd"}
        for i in range(v):
            values[f"{el}.{i + 1}"] = {
                "label": f"{NAMES[el]} {ORDINAL[i]} ionization energy",
                "quantity": "energy", "value": mine[i]["ie"], "unit": "eV", "source": "asd",
            }
        values[f"{el}.give"] = {
            "label": f"{NAMES[el]}, energy to remove all {v} outer electrons",
            "quantity": "energy",
            "value": round(sum(r["ie"] for r in mine[:v]), 6),
            "unit": "eV",
            "decimals": 1,
            "source": "asd",
            "note": f"sum of the first {v} ionization energies",
        }
    return {
        "id": "ionization-li-f",
        "kind": "table",
        "title": "Ionization energies, Li to F",
        "sources": {"asd": {"kind": "reference", "citation": ASD_CITATION, "licence": NIST_LICENCE}},
        "values": values,
        "provenance": {
            "fetched": "2026-10-19",
            "query": "physics.nist.gov/cgi-bin/ASD/ie.pl?spectra=Li-F&units=1&format=2",
            "valence": "electrons in the n = 2 shell of the ASD ground configuration",
            "script": "pipelines/atoms/build.py",
        },
    }


def electron_affinity_file() -> dict:
    return {
        "id": "electron-affinity-li-f",
        "kind": "table",
        "title": "Electron affinities, Li to F",
        "sources": {"andersen1999": {"kind": "experimental", "citation": ANDERSEN_CITATION, "licence": "Published values, cited (facts from the literature)"}},
        "values": {
            el: {"label": f"{NAMES[el]} electron affinity", "quantity": "energy", "value": ea, "unit": "eV", "decimals": 2, "source": "andersen1999"}
            for el, ea in ELECTRON_AFFINITY.items()
        },
        "provenance": {"unbound": "Be and N: no bound singly charged anion (Table 3 lists EA < 0)", "script": "pipelines/atoms/build.py"},
    }


def main() -> None:
    for f in (ionization_file(read_asd()), electron_affinity_file()):
        out = DATA / f"{f['id']}.json"
        out.write_text(json.dumps(f, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
