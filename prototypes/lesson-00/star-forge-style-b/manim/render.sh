#!/usr/bin/env bash
# PROTOTYPE: render star-forge Style B (Manim CE) in both aspects to ../media/manim-<aspect>.mp4.
# Uses the existing venv in ../../star-forge-manim/.venv (read-only use). Usage: ./render.sh [9x16|16x9|all]
set -euo pipefail
cd "$(dirname "$0")"
VENV="../../star-forge-manim/.venv"
which="${1:-all}"
for a in 9x16 16x9; do
  [ "$which" = all ] || [ "$which" = "$a" ] || continue
  name="star-forge-b-$a"
  ASPECT=$a "$VENV/bin/manim" render star_forge_b.py StarForgeB --fps 30 --media_dir mediacache --disable_caching -o "$name" --progress_bar none
  full=$(find mediacache/videos -name "$name.mp4" | head -1)
  cp "$full" "../media/manim-$a.mp4"
  ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=width,height,nb_read_frames,r_frame_rate -of csv=p=0 "../media/manim-$a.mp4"
done
