#!/usr/bin/env python3
"""Build Rookie of the Year contender data for the rankings site."""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

from hub_paths import DATA, PUBLIC, SEASONS as SOURCE

TARGET_SEASON = 4
MIN_RACES_IN_SEASON = 2
MAX_PRIOR_RACES = 1

S4_XLSX = SOURCE / "Season 4 - 2026/EOL 2026 Overall Rankings.xlsx"
SHEET_CATEGORY = {
    "open overall league points": "open",
    "female overall league points": "female",
    "groms overall league points": "groms",
}
CATEGORY_LABELS = {
    "groms": "Groms",
    "female": "Women",
    "open": "Open",
}
MEN_INSTEAD_OF_OPEN_SEASONS = {1, 2, 3}


def category_label(cat: str, season: int) -> str:
    if cat == "open" and season in MEN_INSTEAD_OF_OPEN_SEASONS:
        return "Men"
    return CATEGORY_LABELS.get(cat, cat.title())


def is_eol_finals_event(event_id: str) -> bool:
    from build_master_data import FINALS_EVENT_IDS

    eid = str(event_id)
    return eid in FINALS_EVENT_IDS or "finals" in eid.lower()


def is_race_row(row: pd.Series) -> bool:
    if is_eol_finals_event(row["event_id"]):
        return False
    pos = row.get("position")
    pts = row.get("points")
    if pd.notna(pos) and float(pos) > 0:
        return True
    return pd.notna(pts) and float(pts) > 0


def norm_name(name: str) -> str:
    return re.sub(r"\s+", " ", str(name).strip().lower())


def name_key(name: str) -> str:
    """Looser key for matching Rahel/Rachel/Rhea variants."""
    return re.sub(r"[^a-z]", "", norm_name(name))


def build_rider_id_groups(riders: pd.DataFrame) -> dict[str, frozenset[str]]:
    """Map each rider_id to all ids for the same person (shared name variants)."""
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        parent.setdefault(x, x)
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    names_for_rid: dict[str, set[str]] = {}
    for _, row in riders.iterrows():
        rid = str(row["rider_id"])
        find(rid)
        names: set[str] = set()
        cn = str(row.get("canonical_name", "")).strip()
        if cn:
            names.add(norm_name(cn))
            names.add(name_key(cn))
        for part in str(row.get("all_name_variants", "")).split("|"):
            part = part.strip()
            if part:
                names.add(norm_name(part))
                names.add(name_key(part))
        names_for_rid[rid] = {n for n in names if n}

    rids = list(names_for_rid.keys())
    for i, rid_a in enumerate(rids):
        for rid_b in rids[i + 1 :]:
            if names_for_rid[rid_a] & names_for_rid[rid_b]:
                union(rid_a, rid_b)

    groups: dict[str, set[str]] = defaultdict(set)
    for rid in rids:
        groups[find(rid)].add(rid)

    return {rid: frozenset(members) for rid, members in groups.items()}


def load_s4_qualifications() -> dict[tuple[str, str], str]:
    """(category, norm_name) -> qualification text from 2026 overall sheet."""
    if not S4_XLSX.exists():
        return {}
    out: dict[tuple[str, str], str] = {}
    for sheet in pd.ExcelFile(S4_XLSX).sheet_names:
        cat = SHEET_CATEGORY.get(sheet.strip().lower())
        if not cat:
            continue
        df = pd.read_excel(S4_XLSX, sheet_name=sheet, header=None)
        for r in range(len(df)):
            name = df.iloc[r, 3]
            qual = df.iloc[r, 5] if df.shape[1] > 5 else None
            if pd.isna(name):
                continue
            name_s = str(name).strip()
            if name_s.lower() in ("rider name", "nan", ""):
                continue
            if pd.notna(qual):
                out[(cat, norm_name(name_s))] = str(qual).strip()
    return out


def build_race_details(
    frame: pd.DataFrame,
    events: pd.DataFrame,
) -> tuple[list[dict], list[str]]:
    """Race rows → detail dicts + sorted unique event ids."""
    if frame.empty:
        return [], []
    ev_info = events.set_index("event_id")
    details: list[dict] = []
    seen: set[str] = set()
    for _, row in frame.iterrows():
        if not is_race_row(row):
            continue
        eid = str(row["event_id"])
        if eid in seen:
            continue
        seen.add(eid)
        ev = ev_info.loc[eid] if eid in ev_info.index else None
        pos = row.get("position")
        pts = row.get("points")
        details.append({
            "eventId": eid,
            "eventName": str(ev["name"]) if ev is not None else eid,
            "season": int(row["season"]),
            "seasonLabel": str(ev["season_label"]) if ev is not None else str(row["season"]),
            "category": str(row["category"]),
            "categoryLabel": category_label(str(row["category"]), int(row["season"])),
            "position": int(pos) if pd.notna(pos) and float(pos) > 0 else None,
            "points": int(pts) if pd.notna(pts) and float(pts) > 0 else None,
            "isFinals": is_eol_finals_event(eid),
        })
    details.sort(key=lambda d: (d["season"], d["eventName"]))
    return details, sorted(seen)


def build_rookie_payload(
    event_results: pd.DataFrame,
    riders: pd.DataFrame,
    events: pd.DataFrame,
) -> dict:
    er = event_results.copy()
    er["position"] = pd.to_numeric(er["position"], errors="coerce")
    er["points"] = pd.to_numeric(er["points"], errors="coerce")

    s4_quals = load_s4_qualifications()
    rider_info = riders.set_index("rider_id")
    rider_groups = build_rider_id_groups(riders)
    categories = sorted(
        er.loc[er["season"] == TARGET_SEASON, "category"].unique(),
        key=lambda c: {"groms": 0, "female": 1, "open": 2}.get(c, 9),
    )

    contenders_by_category: dict[str, list[dict]] = {}

    for cat in categories:
        s4_cat = er[(er["season"] == TARGET_SEASON) & (er["category"] == cat)]
        riders_in_season = set(s4_cat["rider_id"].unique())
        rows_out: list[dict] = []

        for rid in riders_in_season:
            related_ids = set(rider_groups.get(rid, frozenset({rid})))
            all_rider = er[er["rider_id"].isin(related_ids)]
            prior = all_rider[all_rider["season"] < TARGET_SEASON]
            current = all_rider[all_rider["season"] == TARGET_SEASON]

            prior_details, prior_event_ids = build_race_details(prior, events)
            season_details, season_event_ids = build_race_details(current, events)

            prior_count = len(prior_event_ids)
            season_count = len(season_event_ids)

            if prior_count > MAX_PRIOR_RACES:
                continue

            canonical = (
                str(rider_info.loc[rid, "canonical_name"])
                if rid in rider_info.index
                else str(s4_cat.loc[s4_cat["rider_id"] == rid, "canonical_name"].iloc[0])
            )
            nk = norm_name(canonical)

            prior_finals = prior[prior["event_id"].apply(is_eol_finals_event)]
            has_prior_finals = len(prior_finals) > 0

            qual = s4_quals.get((cat, nk), "")
            is_wildcard = "wildcard" in qual.lower()

            rookie_experience = prior_count <= MAX_PRIOR_RACES
            min_season_races = season_count >= MIN_RACES_IN_SEASON
            finals_eligible = not has_prior_finals and not is_wildcard
            eligible = rookie_experience and min_season_races and finals_eligible

            race_num = None
            if rid in rider_info.index and pd.notna(rider_info.loc[rid, "race_number"]):
                race_num = int(rider_info.loc[rid, "race_number"])

            def names_from_details(details: list[dict]) -> list[str]:
                return [d["eventName"] for d in details]

            prior_names = names_from_details(prior_details)
            season_names = names_from_details(season_details)

            rows_out.append({
                "riderId": rid,
                "name": canonical,
                "raceNumber": race_num,
                "viewCategory": cat,
                "viewCategoryLabel": CATEGORY_LABELS.get(cat, cat.title()),
                "priorRaceCount": int(prior_count),
                "seasonRaceCount": int(season_count),
                "priorRaceEvents": prior_names,
                "seasonRaceEvents": season_names,
                "priorRaces": prior_details,
                "seasonRaces": season_details,
                "qualificationNote": qual or None,
                "checks": {
                    "rookieExperience": {
                        "met": rookie_experience,
                        "pending": False,
                        "label": f"At most {MAX_PRIOR_RACES} EOL race(s) before 2026 (any category)",
                        "detail": (
                            f"{prior_count} prior race(s) league-wide"
                            + (f": {', '.join(prior_names)}" if prior_names else "")
                        ),
                    },
                    "minSeasonRaces": {
                        "met": min_season_races,
                        "pending": season_count > 0 and season_count < MIN_RACES_IN_SEASON,
                        "label": f"At least {MIN_RACES_IN_SEASON} EOL races in 2026 (any category)",
                        "detail": (
                            f"{season_count} in 2026 so far"
                            + (f": {', '.join(season_names)}" if season_names else "")
                        ),
                    },
                    "finalsEligible": {
                        "met": finals_eligible,
                        "pending": False,
                        "label": "No prior EOL finals or 2026 wildcard",
                        "detail": (
                            "Raced EOL Finals before 2026"
                            if has_prior_finals
                            else ("2026 wildcard entry" if is_wildcard else "Clear")
                        ),
                    },
                },
                "eligible": eligible,
            })

        rows_out.sort(
            key=lambda r: (
                not r["eligible"],
                -r["seasonRaceCount"],
                -r["priorRaceCount"],
                r["name"].lower(),
            ),
        )
        contenders_by_category[cat] = rows_out

    eligible_total = sum(
        1 for rows in contenders_by_category.values() for r in rows if r["eligible"]
    )
    pool_total = sum(len(rows) for rows in contenders_by_category.values())

    return {
        "targetSeason": TARGET_SEASON,
        "targetSeasonLabel": "2026",
        "minRacesInSeason": MIN_RACES_IN_SEASON,
        "maxPriorRaces": MAX_PRIOR_RACES,
        "summary": {
            "poolCount": pool_total,
            "eligibleCount": eligible_total,
        },
        "rules": [
            "First EOL season league-wide, or at most one EOL race in any category before 2026.",
            f"At least {MIN_RACES_IN_SEASON} EOL races in 2026 across any category (EOL Finals not counted).",
            "Not eligible if you raced EOL Finals before 2026, or receive a 2026 finals wildcard.",
            "Watch list shows riders with 2026 results in that category; prior races count league-wide across all categories and name variants.",
        ],
        "contendersByCategory": contenders_by_category,
    }


def main() -> None:
    er = pd.read_csv(DATA / "event_results.csv")
    riders = pd.read_csv(DATA / "riders.csv")
    events = pd.read_csv(DATA / "events.csv")
    payload = build_rookie_payload(er, riders, events)
    out = PUBLIC / "rookie-of-year.json"
    import json
    out.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Wrote {out} — pool {payload['summary']['poolCount']}, eligible {payload['summary']['eligibleCount']}")


if __name__ == "__main__":
    main()
