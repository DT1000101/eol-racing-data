#!/usr/bin/env python3
"""Build attendance / evolution statistics for the stats dashboard."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from hub_paths import DATA, PUBLIC

OUT = PUBLIC / "attendance-stats.json"

CATEGORIES = ("open", "female", "groms")
CAT_LABELS = {"open": "Open / Men", "female": "Women", "groms": "Groms"}


def _attended(row: pd.Series) -> bool:
    has_pos = pd.notna(row["position"]) and row["position"] > 0
    has_pts = pd.notna(row["points"]) and float(row["points"]) > 0
    return bool(has_pos or has_pts)


def _series_name(name: str, event_id: str) -> str:
    if "finals" in event_id.lower():
        return "EOL Finals"
    base = re.sub(r"\s*\(\d{4}\).*", "", name)
    base = base.replace("*", "").strip()
    if base.startswith("Swiss OneWheel Race"):
        return "Swiss OneWheel Race"
    if base.startswith("Swiss Race Tournament"):
        return "Swiss Race Tournament"
    if base.startswith("Swiss Onewheel Race"):
        return "Swiss Onewheel Race"
    return base


def _event_short(name: str, event_id: str) -> str:
    from build_site_data import event_short

    return event_short(name, event_id)


def _category_stats(sub: pd.DataFrame, cat: str) -> dict:
    csub = sub[sub["category"] == cat]
    if csub.empty:
        return {"total": 0, "new": 0, "returning": 0}
    riders = csub.drop_duplicates(subset=["rider_id"])
    new = int((riders["number_is_new_at_this_event"] == True).sum())  # noqa: E712
    total = len(riders)
    return {"total": total, "new": new, "returning": total - new}


def build_payload() -> dict:
    from build_site_data import is_finals_event

    er = pd.read_csv(DATA / "event_results.csv")
    events_df = pd.read_csv(DATA / "events.csv")
    riders_df = pd.read_csv(DATA / "riders.csv")

    er = er[er.apply(_attended, axis=1)].copy()
    sort_map = events_df.set_index("event_id")["sort_key"].to_dict()
    er["sort_key"] = er["event_id"].map(sort_map)
    events_df = events_df.sort_values("sort_key")

    # Per-event stats (only events with at least one finisher)
    event_rows: list[dict] = []
    for _, ev in events_df.iterrows():
        eid = ev["event_id"]
        sub = er[er["event_id"] == eid]
        if sub.empty:
            continue
        by_rider = sub.drop_duplicates(subset=["rider_id"])
        total = len(by_rider)
        new = int((by_rider["number_is_new_at_this_event"] == True).sum())  # noqa: E712
        returning = total - new
        cats = {c: _category_stats(sub, c) for c in CATEGORIES}
        by_cat_totals = {c: cats[c]["total"] for c in CATEGORIES}

        event_rows.append({
            "id": eid,
            "name": ev["name"],
            "shortLabel": _event_short(ev["name"], eid),
            "seasonId": int(ev["season"]),
            "seasonLabel": str(ev["season_label"]),
            "sortKey": int(ev["sort_key"]),
            "isFinals": is_finals_event(eid, ev["name"]),
            "series": _series_name(ev["name"], eid),
            "total": total,
            "new": new,
            "returning": returning,
            "returnRate": round(returning / total, 3) if total else 0,
            "byCategory": by_cat_totals,
            "categories": cats,
        })

    # Season aggregates
    season_rows: list[dict] = []
    first_season_by_rider: dict[str, int] = {}
    for rid, grp in er.groupby("rider_id"):
        first_ev = grp.loc[grp["sort_key"].idxmin()] if "sort_key" in grp else None
        if first_ev is not None:
            first_season_by_rider[rid] = int(
                events_df.loc[events_df["event_id"] == first_ev["event_id"], "season"].iloc[0]
            )

    for season_id in sorted(events_df["season"].unique()):
        season_id = int(season_id)
        label = events_df.loc[events_df["season"] == season_id, "season_label"].iloc[0]
        season_events = {e["id"] for e in event_rows if e["seasonId"] == season_id}
        sub = er[er["event_id"].isin(season_events)]
        unique = sub["rider_id"].nunique()
        new_count = sum(
            1 for rid in sub["rider_id"].unique()
            if first_season_by_rider.get(rid) == season_id
        )
        ret_count = unique - new_count
        cat_unique: dict[str, int] = {}
        for cat in CATEGORIES:
            cat_unique[cat] = sub.loc[sub["category"] == cat, "rider_id"].nunique()

        season_rows.append({
            "id": season_id,
            "label": label,
            "uniqueRiders": int(unique),
            "newRiders": int(new_count),
            "returningRiders": int(ret_count),
            "eventCount": len([e for e in event_rows if e["seasonId"] == season_id]),
            "byCategory": cat_unique,
        })

    # Cumulative unique riders after each event
    cumulative: list[dict] = []
    seen: set[str] = set()
    for ev in event_rows:
        eid = ev["id"]
        for rid in er.loc[er["event_id"] == eid, "rider_id"].unique():
            seen.add(rid)
        cumulative.append({
            "sortKey": ev["sortKey"],
            "eventId": eid,
            "label": ev["shortLabel"],
            "seasonLabel": ev["seasonLabel"],
            "cumulativeRiders": len(seen),
        })

    # Recurring series (2+ editions)
    series_buckets: dict[str, list[dict]] = defaultdict(list)
    for ev in event_rows:
        series_buckets[ev["series"]].append({
            "seasonLabel": ev["seasonLabel"],
            "seasonId": ev["seasonId"],
            "sortKey": ev["sortKey"],
            "total": ev["total"],
            "eventName": ev["name"],
        })
    series_rows = [
        {"name": name, "editions": sorted(pts, key=lambda p: p["sortKey"])}
        for name, pts in sorted(series_buckets.items())
        if len(pts) >= 2
    ]

    # Participation histogram: how many events each rider attended
    events_per_rider = er.groupby("rider_id")["event_id"].nunique()
    hist_buckets: dict[int, int] = defaultdict(int)
    for n in events_per_rider:
        hist_buckets[int(n)] += 1
    participation = [
        {"eventsAttended": k, "riderCount": v}
        for k, v in sorted(hist_buckets.items())
    ]

    # One-and-done riders: which single event was their only appearance
    one_and_done_ids = set(events_per_rider[events_per_rider == 1].index)
    sole_event_by_rider: dict[str, str] = {}
    sole_categories_by_rider: dict[str, set[str]] = {}
    for rid in one_and_done_ids:
        rows = er[er["rider_id"] == rid]
        sole_event_by_rider[rid] = rows["event_id"].iloc[0]
        sole_categories_by_rider[rid] = set(rows["category"].unique())

    one_and_done_by_event: list[dict] = []
    for ev in event_rows:
        eid = ev["id"]
        riders_here = [
            rid for rid, only_eid in sole_event_by_rider.items() if only_eid == eid
        ]
        by_cat = {c: 0 for c in CATEGORIES}
        for rid in riders_here:
            for cat in sole_categories_by_rider[rid]:
                if cat in by_cat:
                    by_cat[cat] += 1
        total_oad = len(riders_here)
        one_and_done_by_event.append({
            "eventId": eid,
            "sortKey": ev["sortKey"],
            "shortLabel": ev["shortLabel"],
            "seasonLabel": ev["seasonLabel"],
            "name": ev["name"],
            "isFinals": ev["isFinals"],
            "total": total_oad,
            "shareOfField": round(total_oad / ev["total"], 3) if ev["total"] else 0,
            "byCategory": by_cat,
        })

    # Multi-event riders
    multi = int((events_per_rider >= 2).sum())
    one_and_done = int((events_per_rider == 1).sum())

    held = [e for e in event_rows if e["total"] > 0]
    biggest = max(held, key=lambda e: e["total"]) if held else None
    avg_attendance = round(sum(e["total"] for e in held) / len(held), 1) if held else 0

    return {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "totalRiders": int(riders_df["rider_id"].nunique()),
            "ridersWithResults": int(events_per_rider.shape[0]),
            "eventsHeld": len(held),
            "totalFinishes": int(len(er)),
            "avgAttendance": avg_attendance,
            "biggestEvent": {
                "name": biggest["name"],
                "total": biggest["total"],
                "seasonLabel": biggest["seasonLabel"],
            } if biggest else None,
            "oneEventRiders": one_and_done,
            "multiEventRiders": multi,
            "categoryLabels": CAT_LABELS,
        },
        "events": event_rows,
        "seasons": season_rows,
        "cumulative": cumulative,
        "series": series_rows,
        "participationHistogram": participation,
        "oneAndDoneByEvent": one_and_done_by_event,
    }


def main() -> None:
    payload = build_payload()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {OUT} ({len(payload['events'])} events, {payload['meta']['totalRiders']} riders)")


if __name__ == "__main__":
    main()
