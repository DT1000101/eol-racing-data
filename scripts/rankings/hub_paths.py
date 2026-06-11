"""Shared paths for the EOL Hub rankings data pipeline."""

from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parents[2]
SEASONS = HUB_ROOT / "seasons"
DATA = HUB_ROOT / "data" / "rankings"
PUBLIC = HUB_ROOT / "site" / "public" / "data" / "rankings"
APPROVED_MERGES = DATA / "approved_merges.csv"

# Aliases used by build_master_data and audit scripts
SOURCE = SEASONS
OUT = DATA
ROOT = HUB_ROOT
