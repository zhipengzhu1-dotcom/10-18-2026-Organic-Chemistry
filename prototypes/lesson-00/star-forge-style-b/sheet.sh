#!/usr/bin/env bash
# PROTOTYPE helper: contact sheet of chosen frames. usage: sheet.sh <video> <out.png> <cols> <width> f1 f2 ...
set -euo pipefail
v="$1"; out="$2"; cols="$3"; w="$4"; shift 4
sel=""; for f in "$@"; do sel="${sel:+$sel+}eq(n\,$f)"; done
n=$#; rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y -i "$v" -vf "select='$sel',scale=$w:-1,tile=${cols}x${rows}" -frames:v 1 "$out"
