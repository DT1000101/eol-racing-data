#!/usr/bin/env python3
"""Build rider directory + per-event standings for the site."""

from __future__ import annotations

import json
from collections import defaultdict

import pandas as pd

from build_site_data import category_label, is_finals_event


def _clean_team(raw: str) -> str:
    team = str(raw or "").strip()
    if team.lower() in ("nan", "fill the team form here", ""):
        return ""
    return team


def build_rider_directory(
    riders: pd.DataFrame,
    standings: pd.DataFrame,
    events: pd.DataFrame,
    event_results: pd.DataFrame,
    events_by_season: dict[str, list],
    seasons_meta: list[dict],
) -> dict:
    from build_master_data import normalize_finals_finish

    latest_season_id = max(int(s["id"]) for s in seasons_meta)
    season_labels = {int(s["id"]): s["label"] for s in seasons_meta}
    event_meta: dict[str, dict] = {}
    for ev_list in events_by_season.values():
        for ev in ev_list:
            event_meta[ev["id"]] = ev

    rider_names = riders.set_index("rider_id")["canonical_name"].to_dict()
    rider_numbers = {}
    for _, r in riders.iterrows():
        n = r["race_number"]
        rider_numbers[r["rider_id"]] = int(n) if pd.notna(n) else None

    # Per-event standings: eventId|category -> sorted finishers
    standings_buckets: dict[str, list[dict]] = defaultdict(list)
    seen_result: set[tuple] = set()

    for _, row in event_results.iterrows():
        pos_raw = row.get("position")
        pts_raw = row.get("points")
        has_pos = pd.notna(pos_raw) and pos_raw
        has_pts = pd.notna(pts_raw) and float(pts_raw) > 0
        if not has_pos and not has_pts:
            continue
        season = int(row["season"])
        cat = row["category"]
        eid = row["event_id"]
        rid = row["rider_id"]
        key_tuple = (season, cat, eid, rid)
        if key_tuple in seen_result:
            continue
        pos = int(pos_raw) if has_pos else None
        pts = pts_raw if pd.notna(pts_raw) else None
        pts_i = float(pts) if pts is not None else None
        pos, pts_i = normalize_finals_finish(str(eid), pos, pts_i)
        seen_result.add(key_tuple)

        bucket_key = f"{eid}|{cat}"
        standings_buckets[bucket_key].append(
            {
                "position": pos if pos is not None else 9999,
                "riderId": rid,
                "name": rider_names.get(rid, rid),
                "raceNumber": rider_numbers.get(rid),
            }
        )

    event_standings: dict[str, list[dict]] = {}
    for key, entries in standings_buckets.items():
        entries.sort(key=lambda x: x["position"])
        event_standings[key] = entries

    # Rider-centric history from event results
    history: dict[str, list[dict]] = defaultdict(list)
    for _, row in event_results.iterrows():
        pos_raw = row.get("position")
        pts_raw = row.get("points")
        has_pos = pd.notna(pos_raw) and pos_raw
        has_pts = pd.notna(pts_raw) and float(pts_raw) > 0
        if not has_pos and not has_pts:
            continue
        season = int(row["season"])
        cat = row["category"]
        eid = row["event_id"]
        rid = row["rider_id"]
        ev = event_meta.get(eid)
        if not ev:
            ev_row = events[events["event_id"] == eid]
            if len(ev_row) == 0:
                continue
            er = ev_row.iloc[0]
            ev = {
                "id": eid,
                "name": er["name"],
                "sortKey": int(er["sort_key"]),
                "isFinals": is_finals_event(eid, er["name"]),
            }
        pos = int(pos_raw) if has_pos else None
        pts = pts_raw if pd.notna(pts_raw) else None
        pts_i = float(pts) if pts is not None else None
        pos, pts_i = normalize_finals_finish(str(eid), pos, pts_i)
        history[rid].append(
            {
                "seasonId": season,
                "seasonLabel": season_labels.get(season, str(season)),
                "category": cat,
                "categoryLabel": category_label(cat, season),
                "eventId": eid,
                "eventName": ev["name"],
                "sortKey": ev["sortKey"],
                "isFinals": ev.get("isFinals", False),
                "position": pos,
                "points": int(pts_i) if pts_i and pts_i > 0 else None,
            }
        )

    # Season standings: rank + team per rider/season/category
    standing_info: dict[tuple, dict] = {}
    teams_by_rider: dict[str, set[str]] = defaultdict(set)

    for season in sorted(standings["season"].unique()):
        season = int(season)
        for cat in standings.loc[standings["season"] == season, "category"].unique():
            sub = standings[
                (standings["season"] == season) & (standings["category"] == cat)
            ].copy()
            sub = sub[sub["total_points"].notna() & (sub["total_points"] > 0)]
            sub = sub.sort_values("total_points", ascending=False).drop_duplicates(
                subset=["rider_id"], keep="first"
            )
            sub["display_rank"] = range(1, len(sub) + 1)
            for _, r in sub.iterrows():
                rid = r["rider_id"]
                team = _clean_team(r.get("team", ""))
                if team:
                    teams_by_rider[rid].add(team)
                standing_info[(season, cat, rid)] = {
                    "seasonRank": int(r["display_rank"]),
                    "totalPoints": int(r["total_points"])
                    if r["total_points"] == int(r["total_points"])
                    else float(r["total_points"]),
                    "team": team,
                }

    all_rider_ids = set(rider_names.keys()) | set(history.keys()) | set(teams_by_rider.keys())

    directory_riders = []
    for rid in all_rider_ids:
        races = history.get(rid, [])
        if not races and not any(k[2] == rid for k in standing_info):
            continue

        podium_g = podium_s = podium_b = 0
        event_keys: set[tuple] = set()
        for race in races:
            event_keys.add((race["seasonId"], race["eventId"], race["category"]))
            p = race["position"]
            if p == 1:
                podium_g += 1
            elif p == 2:
                podium_s += 1
            elif p == 3:
                podium_b += 1
        podium_count = podium_g + podium_s + podium_b

        # Group by season -> categories -> events
        by_season: dict[int, dict] = {}
        for race in races:
            sid = race["seasonId"]
            if sid not in by_season:
                by_season[sid] = {
                    "seasonId": sid,
                    "seasonLabel": race["seasonLabel"],
                    "categories": {},
                }
            cat = race["category"]
            if cat not in by_season[sid]["categories"]:
                st = standing_info.get((sid, cat, rid), {})
                by_season[sid]["categories"][cat] = {
                    "category": cat,
                    "categoryLabel": race["categoryLabel"],
                    "seasonRank": st.get("seasonRank"),
                    "totalPoints": st.get("totalPoints"),
                    "events": [],
                }
            by_season[sid]["categories"][cat]["events"].append(
                {
                    "eventId": race["eventId"],
                    "eventName": race["eventName"],
                    "sortKey": race["sortKey"],
                    "isFinals": race["isFinals"],
                    "position": race["position"],
                    "points": race["points"],
                }
            )

        # Add standing-only seasons (no per-event rows yet)
        for (sid, cat, r2), st in standing_info.items():
            if r2 != rid:
                continue
            if sid not in by_season:
                by_season[sid] = {
                    "seasonId": sid,
                    "seasonLabel": season_labels.get(sid, str(sid)),
                    "categories": {},
                }
            if cat not in by_season[sid]["categories"]:
                by_season[sid]["categories"][cat] = {
                    "category": cat,
                    "categoryLabel": category_label(cat, sid),
                    "seasonRank": st["seasonRank"],
                    "totalPoints": st["totalPoints"],
                    "events": [],
                }

        seasons_out = []
        for sid in sorted(by_season.keys(), reverse=True):
            block = by_season[sid]
            cats_out = []
            for cat in sorted(
                block["categories"].keys(),
                key=lambda c: {"groms": 0, "female": 1, "open": 2}.get(c, 9),
            ):
                entry = block["categories"][cat]
                entry["events"].sort(
                    key=lambda e: (1 if e["isFinals"] else 0, e["sortKey"]),
                )
                cats_out.append(entry)
            seasons_out.append(
                {
                    "seasonId": block["seasonId"],
                    "seasonLabel": block["seasonLabel"],
                    "categories": cats_out,
                }
            )

        teams = sorted(teams_by_rider.get(rid, set()))
        team_display = " / ".join(teams) if teams else ""

        # Latest-season rank for sorting (open first, then female, groms)
        latest_rank = None
        latest_cat = None
        if latest_season_id in by_season:
            cats = by_season[latest_season_id]["categories"]
            for pref in ("open", "female", "groms"):
                if pref in cats and cats[pref].get("seasonRank"):
                    latest_rank = cats[pref]["seasonRank"]
                    latest_cat = pref
                    break
            if latest_rank is None:
                for cat, entry in cats.items():
                    if entry.get("seasonRank"):
                        latest_rank = entry["seasonRank"]
                        latest_cat = cat
                        break

        directory_riders.append(
            {
                "riderId": rid,
                "name": rider_names.get(rid, rid),
                "raceNumber": rider_numbers.get(rid),
                "team": team_display,
                "teams": teams,
                "eventCount": len(event_keys),
                "podiumCount": podium_count,
                "gold": podium_g,
                "silver": podium_s,
                "bronze": podium_b,
                "latestSeasonRank": latest_rank,
                "latestSeasonId": latest_season_id if latest_rank else None,
                "latestCategory": latest_cat,
                "seasons": seasons_out,
            }
        )

    directory_riders.sort(key=lambda r: r["name"].lower())

    return {
        "latestSeasonId": latest_season_id,
        "latestSeasonLabel": season_labels.get(latest_season_id, ""),
        "riders": directory_riders,
        "eventStandings": event_standings,
    }
