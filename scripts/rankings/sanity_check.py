#!/usr/bin/env python3
"""Quick sanity checks after rebuild. Exit 1 on hard failures."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_master_data import (  # noqa: E402
    TRIAL_FINALS_EVENT_ID,
    TRIAL_FINALS_PODIUM_CATEGORIES,
    load_finals_race_results,
    validate_podium_overrides,
)

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
DATA = ROOT / "data"

REQUIRED_SOURCES = [
    REPO / "Season 1 - 2023/EOL Rankings 2023.pdf",
    REPO / "Season 1 - 2023/2 - Swiss Onewheel Race/Swiss Race Ranking.xlsx",
    REPO / "season 2 - 2024/Rankings/EOL 2023_2024 Overall Rankings.xlsx",
    REPO
    / "season 2 - 2024/Tier 1/2 - Onewheel Algarve Race/OneWheel Final Results_231128_173038.pdf",
    REPO / "Season 3 - 2025/EOL 2025 Overall Rankings.xlsx",
    REPO / "Season 4 - 2026/EOL 2026 Overall Rankings.xlsx",
]

errors: list[str] = []
warnings: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def main() -> int:
    for p in REQUIRED_SOURCES:
        if not p.exists():
            fail(f"Missing canonical source: {p.relative_to(REPO)}")

    summary_path = DATA / "build_summary.json"
    if not summary_path.exists():
        fail("Missing data/build_summary.json — run build_master_data.py")
        return report()

    summary = json.loads(summary_path.read_text())
    if summary.get("unnumbered", 0) > 0:
        fail(f"{summary['unnumbered']} riders without race numbers")
    if summary.get("riders", 0) < 100:
        fail(f"Suspiciously few riders: {summary.get('riders')}")

    riders = pd.read_csv(DATA / "riders.csv")
    rider_ids = set(riders["rider_id"])
    suffix_dupes = []
    for rid in rider_ids:
        m = re.match(r"^(.+)-(\d+)$", rid)
        if m and m.group(1) in rider_ids:
            suffix_dupes.append(f"{rid} + {m.group(1)}")
    if suffix_dupes:
        fail(
            "Duplicate rider profiles (suffix id + base id): "
            + "; ".join(suffix_dupes[:8])
            + (" …" if len(suffix_dupes) > 8 else "")
        )

    dup_nums = riders["race_number"].dropna().duplicated()
    if dup_nums.any():
        fail("Duplicate race numbers in riders.csv")

    events = pd.read_csv(DATA / "events.csv")
    if events["event_id"].duplicated().any():
        fail("Duplicate event_id in events.csv")

    site_json = ROOT / "site/public/eol-data.json"
    if not site_json.exists():
        warn("Missing site/public/eol-data.json — run build_site_data.py")
    else:
        payload = json.loads(site_json.read_text())
        if payload.get("meta", {}).get("riderCount") != len(riders):
            warn("Site JSON rider count does not match riders.csv — rebuild site data")

    mm = summary.get("alignment_mismatches", 0)
    if mm:
        warnings.append(
            f"{mm} season rows differ from best-N recompute by >15 pts (see alignment_report.md)"
        )
    review = summary.get("name_pairs_for_review", 0)
    if review:
        warnings.append(f"{review} name pairs in name_discrepancies_for_review.csv")

    ovr_path = DATA / "podium_overrides.csv"
    if not ovr_path.exists():
        fail("Missing data/podium_overrides.csv")
    else:
        try:
            validate_podium_overrides()
        except SystemExit as exc:
            fail(str(exc))

    race_path = DATA / "finals_race_results.csv"
    if race_path.exists():
        race = load_finals_race_results()
        for cat in TRIAL_FINALS_PODIUM_CATEGORIES:
            key = (TRIAL_FINALS_EVENT_ID, cat)
            got = {o["position"] for o in race if (o["event_id"], o["category"]) == key}
            if key in {(o["event_id"], o["category"]) for o in race} and {1, 2, 3} - got:
                fail(
                    f"finals_race_results.csv: {key[0]} / {cat} missing positions "
                    f"{sorted({1, 2, 3} - got)}"
                )

    er = pd.read_csv(DATA / "event_results.csv")
    for (eid, cat, pos), grp in er.groupby(["event_id", "category", "position"]):
        if pd.isna(pos) or pos <= 0:
            continue
        if len(grp) > 1:
            names = ", ".join(grp["canonical_name"].astype(str).tolist())
            warn(f"Duplicate finish position: {eid} / {cat} P{int(pos)} — {names}")

    return report()


def report() -> int:
    if warnings:
        print("Warnings:")
        for w in warnings:
            print(f"  - {w}")
    if errors:
        print("Errors:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("Sanity check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
