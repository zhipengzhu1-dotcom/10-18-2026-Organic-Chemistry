# NIST CCCBDB pages (not MIT)

The `*.html` files in this folder are pages from the NIST Computational Chemistry Comparison and
Benchmark Database, fetched once at build time (2026-10-19) by `geometry/fetch.py` and kept so the
pipeline can rebuild its output offline. They are **not** covered by this repository's MIT licence
or by the content's CC BY-NC-SA licence.

NIST Computational Chemistry Comparison and Benchmark Database, NIST Standard Reference Database
Number 101, Release 22, May 2022, Editor: Russell D. Johnson III, http://cccbdb.nist.gov/,
DOI:10.18434/T47C7Z. © U.S. Secretary of Commerce; used with acknowledgement under
https://www.nist.gov/open/license.

Redistributing these pages and the geometry derived from them in a public repository still needs
the human licence check on the pre-public checklist (#88).

File names are the CAS number without dashes. Some pages are not the molecule asked for (CCCBDB
answers an unknown CAS with another species): `359017.html` (2-fluorobutane's CAS) is formaldehyde.
The pipeline's identity check catches this; the page is kept as the record of that check.
