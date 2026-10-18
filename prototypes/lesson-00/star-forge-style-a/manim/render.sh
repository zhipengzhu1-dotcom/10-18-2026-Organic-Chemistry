#!/usr/bin/env bash
# PROTOTYPE: render star-forge Style A (Manim CE) in both aspects. Reuses the cut-4 venv and fonts.
# Usage: ./render.sh [9x16|16x9|all] [extra manim flags, e.g. -ql]
set -euo pipefail
cd "$(dirname "$0")"
VENV=../../star-forge-manim/.venv
which="${1:-all}"; shift || true
mkdir -p ../out/manim
for a in 16x9 9x16; do
  [ "$which" = all ] || [ "$which" = "$a" ] || continue
  name="star-forge-style-a-manim-$a"
  ASPECT=$a BEATS_OUT="../out/manim/beats-$a.json" $VENV/bin/manim render star_forge_a.py StarForgeA \
    --fps 30 --media_dir media --disable_caching -o "$name" "$@"
  full=$(find media/videos -name "$name.mp4" -newer star_forge_a.py | head -1)
  cp "$full" "../out/manim/$name.mp4"
done
ls -la ../out/manim
