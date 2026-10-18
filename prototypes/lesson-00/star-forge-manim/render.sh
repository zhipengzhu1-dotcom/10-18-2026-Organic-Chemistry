#!/usr/bin/env bash
# PROTOTYPE: render star-forge (Manim CE) in both aspects. Comparison only.
# Usage: ./render.sh [9x16|16x9|all] [-ql for a quick preview]
# Cut 4: writes the full continuous render AND the six beat sections (the edit's cut points) to
# out/cut4/. The cut-2 renders in out/star-forge-manim-*.mp4 are left alone.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x .venv/bin/manim ]; then
  /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
which="${1:-all}"; shift || true
mkdir -p out/cut4
for a in 9x16 16x9; do
  [ "$which" = all ] || [ "$which" = "$a" ] || continue
  name="star-forge-manim-cut4-$a"
  ASPECT=$a .venv/bin/manim render star_forge.py StarForge \
    --fps 30 --media_dir media --disable_caching --save_sections \
    -o "$name" "$@"
  full=$(find media/videos -name "$name.mp4" -newer star_forge.py | head -1)
  cp "$full" "out/cut4/$name.mp4"
  rm -rf "out/cut4/sections-$a"; mkdir -p "out/cut4/sections-$a"
  cp "$(dirname "$full")"/sections/*.mp4 "$(dirname "$full")"/sections/*.json "out/cut4/sections-$a/"
done
ls -la out out/cut4 out/cut4/sections-*
