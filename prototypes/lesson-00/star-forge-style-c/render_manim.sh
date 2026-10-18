#!/usr/bin/env bash
# PROTOTYPE (style C): render the Manim half in both aspects with the cut-4 venv (read-only use of it).
# Writes work/manim/star-forge-c-<aspect>.mp4 (+ section json for the cut-point check).
set -euo pipefail
cd "$(dirname "$0")"
VENV=../star-forge-manim/.venv
which="${1:-all}"
mkdir -p work/manim
for a in 9x16 16x9; do
  [ "$which" = all ] || [ "$which" = "$a" ] || continue
  (
    name="star-forge-c-$a"
    ASPECT=$a $VENV/bin/manim render star_forge_c.py StarForgeC --fps 30 --media_dir "work/media-$a" \
      --disable_caching --save_sections -o "$name" >"work/manim/render-$a.log" 2>&1
    full=$(find "work/media-$a/videos" -name "$name.mp4" | head -1)
    cp "$full" "work/manim/$name.mp4"
    cp "$(dirname "$full")"/sections/*.json "work/manim/$name-sections.json"
    echo "done $a"
  ) &
done
wait
ls -la work/manim
