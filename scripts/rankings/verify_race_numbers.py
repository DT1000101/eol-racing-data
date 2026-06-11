#!/usr/bin/env python3
"""Independently verify race number assignment matches EOL rules."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
import build_master_data as b
from hub_paths import DATA

CATEGORY_ORDER = b.CATEGORY_ORDER


def recompute_numbers_exact_pipeline() -> tuple[dict[str, dict], list[dict]]:
    """Mirror build_master_data.main() numbering steps exactly."""
    approved = b.load_approved()
    reg = b.Registry(approved)
    all_standings: list[dict] = []
    all_events: list[dict] = []

    s1_st, s1_ev = b.parse_season1()
    all_standings.extend(s1_st)
    all_events.extend(s1_ev)

    for path, season in [
        (b.SOURCE / "season 2 - 2024/Rankings/EOL 2023_2024 Overall Rankings.xlsx", 2),
        (b.SOURCE / "Season 3 - 2025/EOL 2025 Overall Rankings.xlsx", 3),
        (b.SOURCE / "Season 4 - 2026/EOL 2026 Overall Rankings.xlsx", 4),
    ]:
        if path.exists():
            st, ev = b.parse_overall_xlsx(path, season)
            all_standings.extend(st)
            all_events.extend(ev)

    season_rows = []
    event_rows = []

    # Same order as main: standings first (name resolution), then events
    for st in all_standings:
        rid = reg.resolve(st["name_raw"])
        season_rows.append({
            "rider_id": rid,
            "season": st["season"],
            "category": st["category"],
            "season_rank": st.get("season_rank"),
            "canonical_name": reg.canonical[rid],
        })

    for ev in all_events:
        rid = reg.resolve(ev["name_raw"])
        event_rows.append({
            "event_id": ev["event_id"],
            "rider_id": rid,
            "canonical_name": reg.canonical[rid],
            "category": ev["category"],
            "position": ev["position"],
        })

    best: dict[tuple, dict] = {}
    for er in event_rows:
        key = (er["event_id"], er["rider_id"], er["category"])
        prev = best.get(key)
        pos = er["position"] or 9999
        if not prev or pos < (prev["position"] or 9999):
            best[key] = er
    event_rows = list(best.values())

    by_event: dict[str, list[dict]] = defaultdict(list)
    for er in event_rows:
        if er.get("position") and er["position"] > 0:
            by_event[er["event_id"]].append(er)

    batches = []
    for ev in sorted(b.EVENTS, key=lambda e: e["sort_key"]):
        eid = ev["event_id"]
        riders_raw = by_event.get(eid, [])
        if not riders_raw:
            continue
        per_rider: dict[str, dict] = {}
        for r in riders_raw:
            rid = r["rider_id"]
            if rid not in per_rider or (r["position"] or 999) < (per_rider[rid].get("position") or 999):
                per_rider[rid] = r
        batches.append({
            "event_id": eid,
            "event_name": ev["name"],
            "riders": [
                {
                    "rider_id": rid,
                    "category": d["category"],
                    "position": d["position"],
                    "canonical_name": d["canonical_name"],
                }
                for rid, d in per_rider.items()
            ],
        })

    numbers = b.assign_numbers(batches)

    unassigned = [rid for rid in reg.canonical if rid not in numbers]
    if unassigned:
        fallback_rows = [
            s for s in season_rows
            if s["rider_id"] in unassigned and s.get("season_rank")
        ]
        fallback_rows.sort(
            key=lambda s: (s["season"], CATEGORY_ORDER[s["category"]], s["season_rank"])
        )
        fb = b.assign_numbers([{
            "event_id": "s1-standings-fallback",
            "event_name": "Season standings fallback (no event position in source)",
            "riders": [
                {
                    "rider_id": s["rider_id"],
                    "category": s["category"],
                    "position": s["season_rank"],
                    "canonical_name": s["canonical_name"],
                }
                for s in fallback_rows
            ],
        }])
        offset = max(numbers.values(), key=lambda x: x["race_number"])["race_number"] if numbers else 0
        for rid, info in fb.items():
            info["race_number"] += offset
            numbers[rid] = info

    return numbers, batches


def verify_batch_order(batches: list[dict], numbers: dict[str, dict]) -> list[str]:
    errors = []
    expected_n = 1
    assigned_so_far: set[str] = set()

    for batch in batches:
        new_riders = [r for r in batch["riders"] if r["rider_id"] not in assigned_so_far]
        new_riders.sort(
            key=lambda r: (CATEGORY_ORDER.get(r["category"], 9), r.get("position") or 9999)
        )
        for r in new_riders:
            info = numbers[r["rider_id"]]
            if info["race_number"] != expected_n:
                errors.append(
                    f"#{expected_n} expected at {batch['event_name']}, "
                    f"got #{info['race_number']} for {r['canonical_name']}"
                )
            if info["assigned_at_event"] != batch["event_id"]:
                errors.append(
                    f"{r['canonical_name']}: assigned at {info['assigned_at_event']}, "
                    f"expected {batch['event_id']}"
                )
            assigned_so_far.add(r["rider_id"])
            expected_n += 1
    return errors


def main():
    print("=== Fresh rebuild + independent verify ===\n")
    b.main()
    fresh, batches = recompute_numbers_exact_pipeline()
    stored = pd.read_csv(DATA / "riders.csv")
    errors: list[str] = []

    nums = stored["race_number"].dropna().astype(int).tolist()
    if len(nums) != len(set(nums)):
        errors.append("Duplicate race numbers in riders.csv")
    expected_range = list(range(1, len(nums) + 1))
    if sorted(nums) != expected_range:
        errors.append(f"Numbers not contiguous 1..{len(nums)}")

    mismatches = 0
    for _, row in stored.iterrows():
        rid = row["rider_id"]
        sn = int(row["race_number"])
        fn = fresh[rid]["race_number"]
        if sn != fn:
            mismatches += 1
            if mismatches <= 5:
                errors.append(
                    f"{row['canonical_name']}: stored #{sn} vs fresh #{fn} "
                    f"({row['number_assigned_at_event']})"
                )
    if mismatches:
        errors.append(f"Stored vs fresh recompute: {mismatches} mismatches")
    else:
        print(f"OK: {len(stored)} riders — stored CSV matches fresh recompute from sources")

    batch_errors = verify_batch_order(batches, fresh)
    if batch_errors:
        errors.extend(batch_errors[:15])
    else:
        print("OK: Chronological batches follow groms → female → open, then position")

    print("\n=== Gattinara 2023 (first assignments) ===\n")
    g = pd.read_csv(DATA / "event_results.csv")
    g1 = g[(g["event_id"] == "s1-gattinara-2023") & g["position"].notna()].sort_values(
        ["category", "position"]
    )
    for _, r in g1.head(8).iterrows():
        n = int(stored.loc[stored["rider_id"] == r["rider_id"], "race_number"].iloc[0])
        print(f"  #{n:3} {r['category']:6} pos {int(r['position']):2} {r['canonical_name']}")

    print("\n=== Key riders ===\n")
    for rid, exp in [
        ("daniel-turner", "s2-wow-2023"),
        ("gary-bucci", "s2-sts-2024"),
        ("jay-bucci", "s2-sts-2024"),
        ("mio-wunderlin", "s1-swiss-2023"),
        ("maiko-wunderlin", "s2-wow-2023"),
    ]:
        row = stored.loc[stored["rider_id"] == rid].iloc[0]
        ok = row["number_assigned_at_event"] == exp
        print(
            f"  {'OK' if ok else 'FAIL'}: {row['display_name']} @ {row['number_assigned_at_event_name']}"
        )
        if not ok:
            errors.append(f"{rid}: expected first event {exp}")

    gary_n = int(stored.loc[stored["rider_id"] == "gary-bucci", "race_number"].iloc[0])
    jay_n = int(stored.loc[stored["rider_id"] == "jay-bucci", "race_number"].iloc[0])
    mio_n = int(stored.loc[stored["rider_id"] == "mio-wunderlin", "race_number"].iloc[0])
    maiko_n = int(stored.loc[stored["rider_id"] == "maiko-wunderlin", "race_number"].iloc[0])
    print(f"\n  Gary #{gary_n} vs Jay #{jay_n} — {'OK' if gary_n != jay_n else 'FAIL'}")
    print(f"  Mio #{mio_n} vs Maiko #{maiko_n} — {'OK' if mio_n != maiko_n else 'FAIL'}")

    fb = sum(1 for _, r in stored.iterrows() if r["number_assigned_at_event"] == "s1-standings-fallback")
    print(f"\n  Fallback-only assignments: {fb} riders")

    report = {
        "passed": len(errors) == 0,
        "rider_count": len(stored),
        "fresh_matches_stored": mismatches == 0,
        "errors": errors,
    }
    (DATA / "race_number_verification.json").write_text(json.dumps(report, indent=2))

    print("\n=== RESULT ===\n")
    if errors:
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASSED — race numbers are correct and reproducible.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
