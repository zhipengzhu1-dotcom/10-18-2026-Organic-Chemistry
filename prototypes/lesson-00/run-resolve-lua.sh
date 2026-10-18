#!/bin/bash
# PROTOTYPE (throwaway): run a Lua script inside DaVinci Resolve (free 21.1) with no human click.
# Free 21.1 allows neither external scripting nor Python, so the MCP server can't connect. Instead this copies the
# script into Resolve's Scripts menu, clicks Workspace > Scripts > <name> through macOS UI scripting (System
# Events; needs Accessibility permission) in the background, without raising Resolve, then waits for the script's report, which it raises as an error so it
# lands in ResolveDebug.txt (free 21.1 Lua has no io library).
# usage: run-resolve-lua.sh <script.lua> <REPORT_MARKER> [timeout_s]
set -euo pipefail
SCRIPT="$1"; MARK="$2"; TIMEOUT="${3:-600}"
NAME="$(basename "$SCRIPT" .lua)"
UTIL="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"
LOG="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/logs/ResolveDebug.txt"
# one Resolve, many agents: hold a lock so runs queue instead of colliding
LOCK="${TMPDIR:-/tmp}/resolve-lua.lock"
until mkdir "$LOCK" 2>/dev/null; do sleep 2; done
trap 'rmdir "$LOCK"' EXIT
cp "$SCRIPT" "$UTIL/"
pgrep -x Resolve >/dev/null || { open -g -a "DaVinci Resolve"; echo "started Resolve; open a project, then rerun" >&2; exit 2; }
before=$(grep -a -c "$MARK" "$LOG" || true)
# AXPress clicks the menu item without bringing Resolve to the front, so the owner's screen isn't interrupted.
# A freshly copied script only appears once Resolve re-reads the Scripts menu, which listing it (read-only) triggers,
# so list, then press, retrying for up to a minute.
MENU="menu 1 of menu item \"Scripts\" of menu 1 of menu bar item \"Workspace\" of menu bar 1"
for ((try=0; try<12; try++)); do
  osascript -e "tell application \"System Events\" to tell process \"Resolve\" to get name of every menu item of $MENU" >/dev/null 2>&1 || true
  osascript -e "tell application \"System Events\" to tell process \"Resolve\" to perform action \"AXPress\" of menu item \"$NAME\" of $MENU" >/dev/null 2>&1 && break
  sleep 5
done
(( try < 12 )) || { echo "$NAME never appeared in Workspace > Scripts" >&2; exit 1; }
for ((i=0; i<TIMEOUT; i++)); do
  n=$(grep -a -c "$MARK" "$LOG" || true); [ "$n" -gt "$before" ] && break; sleep 1
done
[ "$n" -gt "$before" ] || { echo "no report after ${TIMEOUT}s" >&2; exit 1; }
END_MARK="${MARK%_REPORT}_END"
awk -v m="$MARK" -v e="$END_MARK" '$0 ~ m {buf=""; f=1} f {buf=buf $0 "\n"} $0 ~ e {f=0} END {printf "%s", buf}' "$LOG"
