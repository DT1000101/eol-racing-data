#!/usr/bin/env bash
set -euo pipefail
HUB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$HUB_ROOT"
python3 scripts/rankings/build_master_data.py
python3 scripts/rankings/build_site_data.py
python3 scripts/rankings/sanity_check.py
echo "OK — rankings data + site JSON rebuilt"
