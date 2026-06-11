#!/usr/bin/env python3
"""Export master CSVs to compact JSON for the rankings website."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from hub_paths import DATA, PUBLIC

OUT = PUBLIC / "eol-data.json"

CATEGORY_LABELS = {
    "groms": "Groms",
    "female": "Women",
    "open": "Open",
}
# Through 2025: show "Men" instead of "Open" (league naming; 2026+ uses Open)
MEN_INSTEAD_OF_OPEN_SEASONS = {1, 2, 3}
GROMS_FIRST_SEASON = 3  # 2025 onward


def category_label(cat: str, season: int) -> str:
    if cat == "open" and season in MEN_INSTEAD_OF_OPEN_SEASONS:
        return "Men"
    return CATEGORY_LABELS.get(cat, cat.title())


def is_finals_event(event_id: str, name: str) -> bool:
    from build_master_data import FINALS_EVENT_IDS

    if event_id in FINALS_EVENT_IDS:
        return True
    if re.search(r"finals", event_id, re.I):
        return True
    if re.search(r"finals", name, re.I):
        return True
    return False


def event_short(name: str, event_id: str = "") -> str:
    """Abbreviation for collapsed column headers."""
    if event_id == "s2-owar-2023":
        return "OWAR"
    if event_id == "s2-owar-finals-2024":
        return "FINALS"
    if "(2024)" in name and "Wanyi" in name:
        return "WOW2"
    if "(Finals)" in name:
        base = name.replace("(Finals)", "").strip()
        abbr = "".join(w[0] for w in base.split()[:4]).upper() or base[:6].upper()
        return f"{abbr}F"
    words = name.replace("*", "").split()
    if len(words) <= 2:
        return name[:10]
    return "".join(w[0] for w in words[:4]).upper() or name[:8]


def main():
    from build_master_data import normalize_finals_finish
    from build_podiums_data import build_podiums_hall
    from build_rider_directory import build_rider_directory
    from build_rookie_data import build_rookie_payload

    riders = pd.read_csv(DATA / "riders.csv")
    standings = pd.read_csv(DATA / "season_standings.csv")
    events = pd.read_csv(DATA / "events.csv")
    event_results = pd.read_csv(DATA / "event_results.csv")
    rules = json.loads((DATA / "league_rules.json").read_text())

    rider_num_event = riders.set_index("rider_id")["number_assigned_at_event"].to_dict()

    # Event results keyed by season, category, rider, event
    er_lookup: dict[tuple, dict] = {}
    for _, row in event_results.iterrows():
        key = (int(row["season"]), row["category"], row["rider_id"], row["event_id"])
        prev = er_lookup.get(key)
        pos = row["position"] if pd.notna(row["position"]) else None
        pts = row["points"] if pd.notna(row["points"]) else None
        pos_i = int(pos) if pos is not None else None
        pts_i = float(pts) if pts is not None else None
        pos_i, pts_i = normalize_finals_finish(str(row["event_id"]), pos_i, pts_i)
        if not prev or (pos_i and (prev.get("position") is None or pos_i < prev["position"])):
            er_lookup[key] = {
                "position": pos_i,
                "points": int(pts_i) if pts_i and pts_i > 0 else None,
                "isNewNumber": bool(row.get("number_is_new_at_this_event")),
            }

    seasons_meta = []
    events_by_season: dict[str, list] = {}
    rows_by_season_category: dict[str, dict[str, list]] = {}

    for season in sorted(standings["season"].unique()):
        season = int(season)
        slabel = events.loc[events["season"] == season, "season_label"].iloc[0]
        cats = sorted(standings.loc[standings["season"] == season, "category"].unique(),
                      key=lambda c: {"groms": 0, "female": 1, "open": 2}.get(c, 9))
        cats = [c for c in cats if c != "groms" or season >= GROMS_FIRST_SEASON]

        seasons_meta.append({
            "id": season,
            "label": str(slabel),
            "categories": list(cats),
            "categoryLabels": {c: category_label(c, season) for c in cats},
            "defaultCategory": "open" if "open" in cats else cats[0],
        })

        tier1 = set(rules.get("seasons", {}).get(str(season), {}).get("tier1_event_ids", []) or [])
        tier2 = set(rules.get("seasons", {}).get(str(season), {}).get("tier2_event_ids", []) or [])
        ev_list = events[events["season"] == season].sort_values("sort_key")
        season_events = [
            {
                "id": r["event_id"],
                "name": r["name"],
                "short": event_short(r["name"], r["event_id"]),
                "sortKey": int(r["sort_key"]),
                "isFinals": is_finals_event(r["event_id"], r["name"]),
                "tier": (
                    "tier1" if r["event_id"] in tier1
                    else "tier2" if r["event_id"] in tier2
                    else None
                ),
            }
            for _, r in ev_list.iterrows()
        ]
        season_events.sort(
            key=lambda e: (1 if e["isFinals"] else 0, e["sortKey"]),
        )
        events_by_season[str(season)] = season_events

        rows_by_season_category[str(season)] = {}
        for cat in cats:
            sub = standings[(standings["season"] == season) & (standings["category"] == cat)].copy()
            event_rider_ids = set(
                event_results.loc[
                    (event_results["season"] == season)
                    & (event_results["category"] == cat),
                    "rider_id",
                ]
            )
            has_pts = sub["total_points"].notna() & (sub["total_points"] > 0)
            sub = sub[has_pts | sub["rider_id"].isin(event_rider_ids)]
            # One row per rider (sheet can list merged aliases twice)
            sub = sub.drop_duplicates(subset=["rider_id"], keep="first")
            has_pts = sub["total_points"].notna() & (sub["total_points"] > 0)
            with_pts = sub[has_pts].sort_values("total_points", ascending=False)
            without_pts = sub[~has_pts].sort_values("season_rank", na_position="last")
            sub = pd.concat([with_pts, without_pts])

            rows = []
            display_rank = 1
            for _, r in sub.iterrows():
                rid = r["rider_id"]
                num_evt = rider_num_event.get(rid)
                ev_cells = {}
                for ev in events_by_season[str(season)]:
                    eid = ev["id"]
                    cell = er_lookup.get((season, cat, rid, eid))
                    if cell:
                        c = dict(cell)
                        if num_evt == eid:
                            c["eolNumberAssignedHere"] = True
                        ev_cells[eid] = c

                rider_row = riders[riders["rider_id"] == rid]
                race_number = int(rider_row.iloc[0]["race_number"]) if len(rider_row) and pd.notna(rider_row.iloc[0]["race_number"]) else None
                team = str(r.get("team", "") or "").strip()
                if team.lower() in ("nan", "fill the team form here"):
                    team = ""
                pts = r["total_points"]
                if pd.notna(pts) and pts > 0:
                    rank = display_rank
                    display_rank += 1
                    total_pts: int | float = (
                        int(pts) if pts == int(pts) else float(pts)
                    )
                else:
                    rank = (
                        int(r["season_rank"])
                        if pd.notna(r["season_rank"])
                        else display_rank
                    )
                    if pd.isna(r["season_rank"]):
                        display_rank += 1
                    total_pts = 0
                rows.append({
                    "riderId": rid,
                    "name": r["canonical_name"],
                    "raceNumber": race_number,
                    "numberAssignedAtEvent": num_evt if pd.notna(num_evt) else None,
                    "team": team,
                    "seasonRank": rank,
                    "totalPoints": total_pts,
                    "events": ev_cells,
                })
            rows_by_season_category[str(season)][cat] = rows

    event_results_df = pd.read_csv(DATA / "event_results.csv")

    summary_path = DATA / "build_summary.json"
    summary = (
        json.loads(summary_path.read_text())
        if summary_path.exists()
        else {}
    )

    rider_directory = build_rider_directory(
        riders,
        standings,
        events,
        event_results_df,
        events_by_season,
        seasons_meta,
    )

    payload = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "riderCount": len(riders),
            "alignmentMismatches": summary.get("alignment_mismatches", 0),
            "namesToReview": summary.get("name_pairs_for_review", 0),
        },
        "leagueRules": rules,
        "seasons": seasons_meta,
        "eventsBySeason": events_by_season,
        "rowsBySeasonCategory": rows_by_season_category,
        "riderDirectory": rider_directory,
        "rookieOfYear": build_rookie_payload(event_results_df, riders, events),
        "podiumsHallOfFame": build_podiums_hall(event_results_df, events, riders),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")

    rookie_only = payload["rookieOfYear"]
    rookie_path = OUT.parent / "rookie-of-year.json"
    rookie_path.write_text(json.dumps(rookie_only, separators=(",", ":")))
    print(
        f"Wrote {rookie_path} — pool {rookie_only['summary']['poolCount']}, "
        f"eligible {rookie_only['summary']['eligibleCount']}"
    )
    print(
        f"Rider directory: {len(rider_directory['riders'])} riders, "
        f"{len(rider_directory['eventStandings'])} event/category standings"
    )

    from build_attendance_stats import main as build_attendance

    build_attendance()


if __name__ == "__main__":
    main()
