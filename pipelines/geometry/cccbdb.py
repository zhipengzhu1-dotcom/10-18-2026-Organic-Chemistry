"""Parse a cached NIST CCCBDB experimental-geometry page (expgeom2x.asp) and check its identity.

What the page gives (research #19): the species name and formula in the <h1>, an internal-coordinate
table (description, value, connectivity, reference key, comment), a Cartesian table (Å) that may be
empty, and a reference list with full citations and DOIs. The point-group label is deliberately not
parsed: CCCBDB mislabels some species (ethane "D3h" is staggered D3d), so nothing downstream uses it.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

from bs4 import BeautifulSoup

from .molecules import Molecule


class IdentityError(Exception):
    """The page is not the molecule that was requested."""


@dataclass(frozen=True)
class Atom:
    label: str  # e.g. "C1"
    element: str
    x: float
    y: float
    z: float


@dataclass(frozen=True)
class Internal:
    description: str  # e.g. "rCH", "aHCH", "dHCCH"
    value: float
    atoms: tuple[int, ...]  # 1-based CCCBDB atom numbers
    ref: str
    comment: str


@dataclass(frozen=True)
class Reference:
    key: str
    citation: str
    doi: str | None


@dataclass
class Page:
    name: str
    formula: dict[str, int]
    atoms: list[Atom] = field(default_factory=list)
    internals: list[Internal] = field(default_factory=list)
    references: dict[str, Reference] = field(default_factory=dict)

    @property
    def has_cartesians(self) -> bool:
        return bool(self.atoms)


def formula_counts(formula: str) -> dict[str, int]:
    """Element counts of a condensed formula without brackets ("CH3CONH2" -> C2 H5 N1 O1)."""
    counts: Counter[str] = Counter()
    for el, n in re.findall(r"([A-Z][a-z]?)(\d*)", formula):
        counts[el] += int(n) if n else 1
    return dict(counts)


def _text(el) -> str:
    return " ".join(el.get_text(" ", strip=True).split())


def parse(html: str) -> Page:
    soup = BeautifulSoup(html, "lxml")
    h1 = soup.find("h1")
    if h1 is None:
        raise ValueError("not a CCCBDB geometry page: no <h1>")
    span = h1.find("span")
    name = _text(span).strip("() ") if span else ""
    if span:
        span.extract()
    formula_text = h1.get_text("", strip=True).removeprefix("Listing of experimental geometry data for").strip()
    page = Page(name=name, formula=formula_counts(formula_text))

    for table in soup.find_all("table"):
        headers = [_text(th) for th in table.find_all("th")]
        if headers[:4] == ["Atom", "x (Å)", "y (Å)", "z (Å)"]:
            # Rows are written without closing tags; lxml nests them, so read the cells in order.
            cells = [_text(td) for td in table.find_all("td")]
            for i in range(0, len(cells) - 3, 4):
                label, x, y, z = cells[i : i + 4]
                page.atoms.append(Atom(label, re.match(r"[A-Z][a-z]?", label).group(0), float(x), float(y), float(z)))
        elif headers[:2] == ["Description", "Value"]:
            for tr in table.find_all("tr"):
                tds = tr.find_all("td", recursive=False)
                if len(tds) < 8:
                    continue
                desc, value, a1, a2, a3, a4, ref, comment = (_text(td) for td in tds[:8])
                if not value:
                    continue
                atoms = tuple(int(a) for a in (a1, a2, a3, a4) if a)
                page.internals.append(Internal(desc, float(value), atoms, ref, comment))
        elif table.get("id") == "reftable":
            for tr in table.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) < 3:
                    continue
                key, citation, doi = _text(tds[0]), _text(tds[1]), _text(tds[2])
                page.references[key] = Reference(key, citation, doi or None)
    return page


def check_identity(page: Page, m: Molecule) -> None:
    """Raise IdentityError unless the page is `m`: formula, name and (if present) atom count must match."""
    want = formula_counts(m.formula)
    if page.formula != want:
        raise IdentityError(f"{m.id}: CCCBDB page formula {page.formula} is not {m.formula} (page is {page.name!r})")
    if m.cccbdb_name and page.name.lower() != m.cccbdb_name:
        raise IdentityError(f"{m.id}: CCCBDB page name {page.name!r} is not {m.cccbdb_name!r}")
    if page.atoms and len(page.atoms) != sum(want.values()):
        raise IdentityError(f"{m.id}: {len(page.atoms)} atoms in the Cartesian table, expected {sum(want.values())}")
