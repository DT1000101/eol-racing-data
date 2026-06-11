#!/usr/bin/env python3
"""Report split rider profiles (Rachel-style duplicates). Exit 1 if any found."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
from difflib import SequenceMatcher

from hub_paths import DATA


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).strip().lower())


def main() -> int:
    riders = pd.read_csv(DATA / "riders.csv")
    er = pd.read_csv(DATA / "event_results.csv")
    rider_ids = set(riders["rider_id"])
    errors: list[str] = []

    for rid in sorted(rider_ids):
        m = re.match(r"^(.+)-(\d+)$", rid)
        if m and m.group(1) in rider_ids:
            errors.append(f"suffix profile: {rid} duplicates {m.group(1)}")

    # 2026 rider with 0-1 prior on own id but 2+ on similar name (different id)
    s4_ids = set(er.loc[er["season"] == 4, "rider_id"])
    for rid in s4_ids:
        row = riders[riders["rider_id"] == rid].iloc[0]
        my_name = norm(row["canonical_name"])
        prior_own = er[(er["rider_id"] == rid) & (er["season"] < 4)]
        pe_own = prior_own["event_id"].nunique()
        if pe_own > 1:
            continue
        for other in rider_ids:
            if other == rid:
                continue
            other_name = norm(
                riders[riders["rider_id"] == other].iloc[0]["canonical_name"]
            )
            if SequenceMatcher(None, my_name, other_name).ratio() < 0.88:
                continue
            prior_other = er[(er["rider_id"] == other) & (er["season"] < 4)]
            if prior_other["event_id"].nunique() >= 2:
                errors.append(
                    f"2026 {row['canonical_name']} ({rid}) has {pe_own} prior events but "
                    f"{riders[riders.rider_id==other].iloc[0]['canonical_name']} "
                    f"({other}) has {prior_other['event_id'].nunique()}"
                )
                break

    if errors:
        print("FAILED — possible duplicate rider profiles:\n")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("OK — no suffix/base duplicate profiles or obvious 2026 split-history cases.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
