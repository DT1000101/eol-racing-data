#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
python3 scripts/build_master_data.py
python3 scripts/build_site_data.py
python3 scripts/sanity_check.py
echo "OK — data + site JSON rebuilt"
