#!/usr/bin/env bash
# PROTOTYPE: frame sheet. usage: sheet.sh <video> <outdir> <cols> <t1> <t2> ...  (overwrites, never deletes)
set -euo pipefail
V="$1"; O="$2"; C="$3"; shift 3
mkdir -p "$O"; i=0
for t in "$@"; do
  i=$((i+1)); n=$(printf "%02d" $i)
  ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 "$O/f$n.png"
done
w=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$V" | head -1)
s=$([ "$w" -gt 1500 ] && echo 640 || echo 360)
ffmpeg -v error -y -framerate 1 -i "$O/f%02d.png" -frames:v $i -vf "scale=$s:-1,tile=${C}x$(( (i + C - 1) / C ))" -update 1 -frames:v 1 "$O/sheet.png"
echo "$O/sheet.png"
