"""Fetch NIST CCCBDB experimental-geometry pages once, slowly, into the committed cache.

Build time only; nothing fetches CCCBDB at runtime. CCCBDB sits behind Cloudflare and answers
HTTP 429 after ~20 requests at 1/s, so requests are spaced SPACING_S apart (research #19: 30
requests at 8 s spacing went through). Pages already in the cache are not fetched again unless
--refresh is given.

    uv run python -m geometry.fetch            # every molecule with a CAS
    uv run python -m geometry.fetch 74-82-8    # one page
"""

from __future__ import annotations

import sys
import subprocess
import time
from pathlib import Path

from .molecules import ALL, cas_digits

SPACING_S = 8.0
CACHE = Path(__file__).parent / "cccbdb"
URL = "https://cccbdb.nist.gov/expgeom2x.asp?casno={cas}&charge={charge}"
AGENT = "AstraTron geometry pipeline (build time, one request per molecule, 8 s spacing)"


def cache_path(cas: str, charge: int = 0) -> Path:
    suffix = "" if charge == 0 else f"_q{charge}"
    return CACHE / f"{cas_digits(cas)}{suffix}.html"


def fetch(cas: str, charge: int = 0) -> bytes:
    # curl, not urllib: it uses the system trust store (python.org builds ship without one).
    url = URL.format(cas=cas_digits(cas), charge=charge)
    out = subprocess.run(
        ["curl", "-sS", "--max-time", "60", "-A", AGENT, "-w", "\n%{http_code}", url],
        check=True, capture_output=True,
    ).stdout
    body, _, status = out.rpartition(b"\n")
    if status.strip() != b"200":
        raise RuntimeError(f"CCCBDB {cas}: HTTP {status.decode()}")
    return body


def main(argv: list[str]) -> int:
    refresh = "--refresh" in argv
    wanted = [a for a in argv if not a.startswith("--")]
    cas_list = wanted or sorted({m.cas for m in ALL if m.cas} | {m.start_from for m in ALL if m.start_from})
    CACHE.mkdir(parents=True, exist_ok=True)
    last = 0.0
    for cas in cas_list:
        path = cache_path(cas)
        if path.exists() and not refresh:
            print(f"cached  {cas}")
            continue
        wait = SPACING_S - (time.monotonic() - last)
        if wait > 0:
            time.sleep(wait)
        last = time.monotonic()
        body = fetch(cas)
        path.write_bytes(body)
        print(f"fetched {cas} ({len(body)} bytes)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
