#!/usr/bin/env python3
"""Aggregate league-wide podium finishes for the Hall of Fame page."""

from __future__ import annotations

from collections import defaultdict

import pandas as pd

from build_master_data import (
    load_podium_overrides,
    normalize_finals_finish,
    podium_override_replace_keys,
)
from build_site_data import category_label


def podium_finish_position(row: pd.Series) -> int | None:
    """Finish position for podium detection (1–3), including finals-sheet quirks."""
    eid = str(row["event_id"])
    cat = str(row["category"])
    if (eid, cat) in podium_override_replace_keys():
        return None
    pos = pd.to_numeric(row["position"], errors="coerce")
    pts = pd.to_numeric(row["points"], errors="coerce")
    pos_i = int(pos) if pd.notna(pos) else None
    pts_i = float(pts) if pd.notna(pts) else None
    pos_i, _ = normalize_finals_finish(eid, pos_i, pts_i)
    if pos_i is None or pos_i not in (1, 2, 3):
        return None
    return pos_i


def build_podiums_hall(
    event_results: pd.DataFrame,
    events: pd.DataFrame,
    riders: pd.DataFrame,
) -> dict:
    er = event_results.copy()
    ev_info = events.set_index("event_id")
    rider_info = riders.set_index("rider_id")

    best: dict[tuple, tuple[pd.Series, int]] = {}
    for _, row in er.iterrows():
        pos_i = podium_finish_position(row)
        if pos_i is None:
            continue
        key = (str(row["rider_id"]), str(row["event_id"]), str(row["category"]))
        prev = best.get(key)
        if prev is None or pos_i < prev[1]:
            best[key] = (row, pos_i)

    for o in load_podium_overrides():
        eid = o["event_id"]
        cat = o["category"]
        rid = o["rider_id"]
        pos_i = o["position"]
        if pos_i not in (1, 2, 3):
            continue
        ev = ev_info.loc[eid] if eid in ev_info.index else None
        season = int(ev["season"]) if ev is not None else 0
        name = (
            str(rider_info.loc[rid, "canonical_name"])
            if rid in rider_info.index
            else rid
        )
        synthetic = pd.Series({
            "rider_id": rid,
            "event_id": eid,
            "category": cat,
            "season": season,
            "canonical_name": name,
        })
        key = (rid, eid, cat)
        best[key] = (synthetic, pos_i)

    by_rider: dict[str, list[dict]] = defaultdict(list)
    for row, pos_i in best.values():
        season = int(row["season"])
        eid = str(row["event_id"])
        cat = str(row["category"])
        ev = ev_info.loc[eid] if eid in ev_info.index else None
        by_rider[str(row["rider_id"])].append({
            "position": pos_i,
            "eventId": eid,
            "eventName": str(ev["name"]) if ev is not None else eid,
            "season": season,
            "seasonLabel": str(ev["season_label"]) if ev is not None else str(season),
            "category": cat,
            "categoryLabel": category_label(cat, season),
        })

    def sort_key(p: dict) -> tuple:
        return (-p["season"], p["eventName"])

    riders_out: list[dict] = []
    for rid, podiums in by_rider.items():
        podiums.sort(key=sort_key)
        firsts = [p for p in podiums if p["position"] == 1]
        seconds = [p for p in podiums if p["position"] == 2]
        thirds = [p for p in podiums if p["position"] == 3]
        if rid in rider_info.index:
            name = str(rider_info.loc[rid, "canonical_name"])
        else:
            name = next(
                (str(row["canonical_name"]) for k, (row, _) in best.items() if k[0] == rid),
                rid,
            )
        race_number = None
        if rid in rider_info.index and pd.notna(rider_info.loc[rid, "race_number"]):
            race_number = int(rider_info.loc[rid, "race_number"])
        riders_out.append({
            "riderId": rid,
            "name": name,
            "raceNumber": race_number,
            "podiumCount": len(podiums),
            "gold": len(firsts),
            "silver": len(seconds),
            "bronze": len(thirds),
            "firsts": firsts,
            "seconds": seconds,
            "thirds": thirds,
        })

    riders_out.sort(
        key=lambda r: (-r["podiumCount"], -r["gold"], -r["silver"], r["name"].lower()),
    )

    total_podiums = sum(r["podiumCount"] for r in riders_out)
    return {
        "summary": {
            "riderCount": len(riders_out),
            "podiumCount": total_podiums,
        },
        "riders": riders_out,
    }
