#!/usr/bin/env bash
# Symlink season source folders from the existing rankings repo (local dev only).
set -euo pipefail
HUB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RANKINGS_SRC="$(cd "$HUB_ROOT/../rankings per season" && pwd)"
SEASONS="$HUB_ROOT/seasons"

mkdir -p "$SEASONS"
for d in "Season 1 - 2023" "season 2 - 2024" "Season 3 - 2025" "Season 4 - 2026"; do
  target="$SEASONS/$d"
  if [[ -e "$target" ]]; then
    echo "exists: $d"
  else
    ln -s "$RANKINGS_SRC/$d" "$target"
    echo "linked: $d"
  fi
done
