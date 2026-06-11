#!/usr/bin/env python3
"""Build EOL master data: riders, events, results, race numbers, review lists."""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

import pandas as pd
from difflib import SequenceMatcher
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent
OUT = ROOT / "data"
APPROVED_MERGES = ROOT / "approved_merges.csv"

EVENTS = [
    {"event_id": "s1-gattinara-2023", "season": 1, "season_label": "2023", "name": "Gattinara Wine & Trails", "sort_key": 100,
     "match": ["Gattinara"]},
    {"event_id": "s1-swiss-2023", "season": 1, "season_label": "2023", "name": "Swiss Onewheel Race", "sort_key": 101,
     "match": ["Swiss OneWheel Race", "Swiss Onewheel Race"]},
    {"event_id": "s1-fth-2023", "season": 1, "season_label": "2023", "name": "Float The Highlands", "sort_key": 102,
     "match": ["Float The Highlands", "Float the Highlands"]},
    {"event_id": "s2-wow-2023", "season": 2, "season_label": "2023/24", "name": "Wanyi Onewheel Weekend", "sort_key": 200,
     "match": ["Wanyi Onewheel Weekend"]},
    {"event_id": "s2-owar-2023", "season": 2, "season_label": "2023/24",
     "name": "Onewheel Algarve Race (2023/24)", "sort_key": 201,
     "match": ["Onewheel Algarve Race"]},
    {"event_id": "s2-owar-finals-2024", "season": 2, "season_label": "2023/24",
     "name": "EOL Finals 2023/24 (OWAR)", "sort_key": 299,
     "match": []},
    {"event_id": "s2-sts-2024", "season": 2, "season_label": "2023/24", "name": "Shred The Shires", "sort_key": 203,
     "match": ["Shred The Shires", "Shred the Shires"]},
    {"event_id": "s2-swiss-2024", "season": 2, "season_label": "2023/24", "name": "Swiss OneWheel Race", "sort_key": 204,
     "match": ["Swiss OneWheel Race"]},
    {"event_id": "s2-fth-2024", "season": 2, "season_label": "2023/24", "name": "Float The Highlands", "sort_key": 205,
     "match": ["Float The Highlands"]},
    {"event_id": "s2-wow-2024", "season": 2, "season_label": "2023/24",
     "name": "Wanyi Onewheel Weekend (2024)", "sort_key": 206,
     "match": ["Wanyi Onewheel Weekend"]},
    {"event_id": "s2-balaton-2024", "season": 2, "season_label": "2023/24", "name": "Balaton Karika", "sort_key": 207,
     "match": ["Balaton Karika"]},
    {"event_id": "s2-dog-2024", "season": 2, "season_label": "2023/24", "name": "Danish Onewheel Games", "sort_key": 208,
     "match": ["Danish Onewheel Games"]},
    {"event_id": "s2-mayrau-2024", "season": 2, "season_label": "2023/24", "name": "Mayrau Shred Fest", "sort_key": 209,
     "match": ["Mayrau Shred Fest", "Mayrau Shred fest"]},
    {"event_id": "s3-wacky-2025", "season": 3, "season_label": "2025", "name": "Wacky Wheels", "sort_key": 300,
     "match": ["Wacky Wheels"]},
    {"event_id": "s3-sts-2025", "season": 3, "season_label": "2025", "name": "Shred The Shires", "sort_key": 301,
     "match": ["Shred The Shires"]},
    {"event_id": "s3-tfc-2025", "season": 3, "season_label": "2025", "name": "The Float Connection", "sort_key": 302,
     "match": ["The Float Connection"]},
    {"event_id": "s3-swiss-2025", "season": 3, "season_label": "2025", "name": "Swiss Race Tournament", "sort_key": 303,
     "match": ["Swiss Race Tournament"]},
    {"event_id": "s3-mayrau-2025", "season": 3, "season_label": "2025", "name": "Mayrau Shred Fest", "sort_key": 304,
     "match": ["Mayrau Shred Fest"]},
    {"event_id": "s3-dog-2025", "season": 3, "season_label": "2025", "name": "Danish Onewheel Games", "sort_key": 305,
     "match": ["Danish Onewheel Games"]},
    {"event_id": "s3-sis-2025", "season": 3, "season_label": "2025", "name": "Send it Surrey", "sort_key": 306,
     "match": ["Send it Surrey"]},
    {"event_id": "s3-finals-2025", "season": 3, "season_label": "2025", "name": "EOL Finals 2025", "sort_key": 307,
     "match": ["EOL Finals"]},
    {"event_id": "s4-wacky-2026", "season": 4, "season_label": "2026", "name": "Wacky Wheels", "sort_key": 400,
     "match": ["Wacky Wheels"]},
    {"event_id": "s4-sts-2026", "season": 4, "season_label": "2026", "name": "Shred The Shires", "sort_key": 401,
     "match": ["Shred The Shires"]},
    {"event_id": "s4-tfc-2026", "season": 4, "season_label": "2026", "name": "The Float Connection", "sort_key": 402,
     "match": ["The Float Connection"]},
    {"event_id": "s4-mayrau-2026", "season": 4, "season_label": "2026", "name": "Mayrau Shred Fest", "sort_key": 403,
     "match": ["Mayrau Shred Fest"]},
    {"event_id": "s4-fth-2026", "season": 4, "season_label": "2026", "name": "Float The Highlands", "sort_key": 404,
     "match": ["Float The Highlands"]},
    {"event_id": "s4-dog-2026", "season": 4, "season_label": "2026", "name": "Danish Onewheel Games", "sort_key": 405,
     "match": ["Danish Onewheel Games"]},
    {"event_id": "s4-finals-2026", "season": 4, "season_label": "2026", "name": "EOL Finals 2026", "sort_key": 406,
     "match": ["EOL Finals", "EOL Finals*"]},
]

SHEET_CATEGORY = {
    "male overall league points": "open",
    "female overall league points": "female",
    "groms overall league points": "groms",
    "open overall league points": "open",
}

CATEGORY_ORDER = {"groms": 0, "female": 1, "open": 2}
# Groms category only exists from 2025 season (id 3) onward
GROMS_FIRST_SEASON = 3
SKIP_LABELS = {"nan", "rider name", "team / crew", "total points", "qualification", "position", "points",
               "⬅️ go back to web site", "fill the team form here"}

FINALS_EVENT_IDS = frozenset(
    e["event_id"] for e in EVENTS if "finals" in e["event_id"]
)


def normalize_finals_finish(
    event_id: str,
    position: int | None,
    points: float | None,
) -> tuple[int | None, float | None]:
    """League spreadsheets often put race finish (1..N) in the points column for finals cells."""
    if event_id not in FINALS_EVENT_IDS:
        return position, points
    if position and position > 0:
        return position, points
    if points is None:
        return position, points
    finish = int(points)
    if finish <= 0:
        return position, points
    # League points are typically 34+; finish order is a small integer.
    if finish <= 80:
        return finish, None
    return position, points


PODIUM_OVERRIDES_PATH = OUT / "podium_overrides.csv"
FINALS_RACE_RESULTS_PATH = OUT / "finals_race_results.csv"
TRIAL_FINALS_EVENT_ID = "s2-owar-finals-2024"
TRIAL_FINALS_PODIUM_CATEGORIES = frozenset({"open", "female"})
OWAR_FINALS_PDF_MARKER = "OneWheel Final Results"


def load_finals_race_results() -> list[dict]:
    if not FINALS_RACE_RESULTS_PATH.exists():
        return []
    df = pd.read_csv(FINALS_RACE_RESULTS_PATH)
    rows: list[dict] = []
    for _, row in df.iterrows():
        rows.append({
            "event_id": str(row["event_id"]),
            "rider_id": str(row["rider_id"]),
            "category": str(row["category"]),
            "position": int(row["position"]),
        })
    return rows


def finals_race_result_keys(
    results: list[dict] | None = None,
) -> frozenset[tuple[str, str]]:
    """(event_id, category) pairs where finals_race_results.csv replaces trial PDF rows."""
    res = results if results is not None else load_finals_race_results()
    return frozenset((r["event_id"], r["category"]) for r in res)


def apply_finals_race_results(event_rows: list[dict], reg: "RiderRegistry") -> None:
    """Replace OWAR trial-sheet rows with confirmed EOL Finals race finishes."""
    results = load_finals_race_results()
    if not results:
        return
    replace_keys = finals_race_result_keys(results)
    rel = str(FINALS_RACE_RESULTS_PATH.relative_to(ROOT))
    ev_meta = {e["event_id"]: e for e in EVENTS}
    kept = [
        r for r in event_rows
        if not (
            (str(r["event_id"]), str(r["category"])) in replace_keys
            and OWAR_FINALS_PDF_MARKER in str(r.get("source_file") or "")
        )
    ]
    indexed = {(r["event_id"], r["rider_id"], r["category"]): r for r in kept}
    for o in results:
        tri = (o["event_id"], o["rider_id"], o["category"])
        rid = o["rider_id"]
        if tri in indexed:
            indexed[tri]["position"] = o["position"]
            indexed[tri]["source_file"] = rel
            continue
        meta = ev_meta[o["event_id"]]
        indexed[tri] = {
            "event_id": o["event_id"],
            "rider_id": rid,
            "canonical_name": reg.canonical.get(rid, rid),
            "season": meta["season"],
            "category": o["category"],
            "position": o["position"],
            "points": None,
            "source_file": rel,
        }
    event_rows.clear()
    event_rows.extend(indexed.values())


def load_podium_overrides() -> list[dict]:
    if not PODIUM_OVERRIDES_PATH.exists():
        return []
    df = pd.read_csv(PODIUM_OVERRIDES_PATH)
    rows: list[dict] = []
    for _, row in df.iterrows():
        rows.append({
            "event_id": str(row["event_id"]),
            "rider_id": str(row["rider_id"]),
            "category": str(row["category"]),
            "position": int(row["position"]),
        })
    return rows


def podium_override_replace_keys(
    overrides: list[dict] | None = None,
) -> frozenset[tuple[str, str]]:
    """(event_id, category) pairs where podium_overrides.csv replaces auto podiums."""
    ovs = overrides if overrides is not None else load_podium_overrides()
    return frozenset((o["event_id"], o["category"]) for o in ovs)


def apply_podium_overrides(event_rows: list[dict], reg: "RiderRegistry") -> None:
    """Apply confirmed race podiums (e.g. EOL Finals 2023/24 vs OWAR trial sheet)."""
    overrides = load_podium_overrides()
    if not overrides:
        return
    ev_meta = {e["event_id"]: e for e in EVENTS}
    replace_keys = podium_override_replace_keys(overrides)
    override_pos = {
        (o["event_id"], o["rider_id"], o["category"]): o["position"] for o in overrides
    }
    race_result_keys = finals_race_result_keys()
    for row in event_rows:
        ec = (row["event_id"], row["category"])
        if ec not in replace_keys:
            continue
        tri = (row["event_id"], row["rider_id"], row["category"])
        if tri in override_pos:
            row["position"] = override_pos[tri]
        elif ec not in race_result_keys and row.get("position") in (1, 2, 3):
            # Open: trial top 3 → 4–6 after race podium overrides. Female trial rows are dropped.
            row["position"] = int(row["position"]) + 3
    indexed = {(r["event_id"], r["rider_id"], r["category"]): r for r in event_rows}
    for o in overrides:
        tri = (o["event_id"], o["rider_id"], o["category"])
        if tri in indexed:
            continue
        meta = ev_meta[o["event_id"]]
        rid = o["rider_id"]
        event_rows.append({
            "event_id": o["event_id"],
            "rider_id": rid,
            "canonical_name": reg.canonical.get(rid, rid),
            "season": meta["season"],
            "category": o["category"],
            "position": o["position"],
            "points": None,
            "source_file": str(PODIUM_OVERRIDES_PATH.relative_to(ROOT)),
        })


def extract_trial_pdf_podiums(event_rows: list[dict]) -> dict[tuple[str, str], dict[int, str]]:
    """Trial-sheet top 3 per (event_id, category) before podium_overrides are applied."""
    out: dict[tuple[str, str], dict[int, str]] = defaultdict(dict)
    for row in event_rows:
        src = str(row.get("source_file") or "")
        if OWAR_FINALS_PDF_MARKER not in src:
            continue
        pos = row.get("position")
        if pos not in (1, 2, 3):
            continue
        key = (str(row["event_id"]), str(row["category"]))
        out[key][int(pos)] = str(row["rider_id"])
    return dict(out)


def validate_podium_overrides(
    trial_pdf_podiums: dict[tuple[str, str], dict[int, str]] | None = None,
) -> None:
    """Fail the build if finals race podiums are missing or look copied from the trial PDF."""
    overrides = load_podium_overrides()
    by_ec: dict[tuple[str, str], dict[int, str]] = defaultdict(dict)
    for o in overrides:
        key = (o["event_id"], o["category"])
        pos = o["position"]
        if pos in by_ec[key]:
            raise SystemExit(
                f"podium_overrides.csv: duplicate position {pos} for {key[0]} / {key[1]}"
            )
        by_ec[key][pos] = o["rider_id"]

    for cat in TRIAL_FINALS_PODIUM_CATEGORIES:
        key = (TRIAL_FINALS_EVENT_ID, cat)
        got = set(by_ec.get(key, {}))
        if got != {1, 2, 3}:
            raise SystemExit(
                f"podium_overrides.csv: {TRIAL_FINALS_EVENT_ID} / {cat} needs exactly "
                f"race podium positions 1, 2, 3 (got {sorted(got) or 'none'}). "
                "The OWAR trial PDF is field order for league scoring only — not race results. "
                "Do not infer missing places from the trial sheet."
            )

    for key in podium_override_replace_keys(overrides):
        got = set(by_ec.get(key, {}))
        if got != {1, 2, 3}:
            missing = sorted({1, 2, 3} - got)
            raise SystemExit(
                f"podium_overrides.csv: {key[0]} / {key[1]} has overrides but is missing "
                f"position(s) {missing}. Specify all three confirmed race places."
            )

    race = load_finals_race_results()
    for cat in TRIAL_FINALS_PODIUM_CATEGORIES:
        key = (TRIAL_FINALS_EVENT_ID, cat)
        if key in finals_race_result_keys(race):
            got = {o["position"] for o in race if (o["event_id"], o["category"]) == key}
            if {1, 2, 3} - got:
                raise SystemExit(
                    f"finals_race_results.csv: {key[0]} / {key[1]} must include race "
                    f"positions 1, 2, 3 (missing {sorted({1, 2, 3} - got)})."
                )

    if not trial_pdf_podiums:
        return
    for cat in TRIAL_FINALS_PODIUM_CATEGORIES:
        if (TRIAL_FINALS_EVENT_ID, cat) in finals_race_result_keys(race):
            continue
        key = (TRIAL_FINALS_EVENT_ID, cat)
        trial = trial_pdf_podiums.get(key, {})
        override_by_pos = by_ec.get(key, {})
        if not trial or not override_by_pos:
            continue
        matches = [p for p in (1, 2, 3) if trial.get(p) == override_by_pos.get(p)]
        mismatches = [
            p for p in (1, 2, 3)
            if p in trial and p in override_by_pos and trial[p] != override_by_pos[p]
        ]
        if matches and mismatches:
            raise SystemExit(
                f"podium_overrides.csv: {key[0]} / {key[1]} mixes trial-sheet riders with "
                f"confirmed race podium (position(s) {matches} match trial, {mismatches} do not). "
                "Likely copied 1st from the trial PDF while fixing 2nd/3rd — set all three from "
                "the actual race results."
            )


# Pairs that must stay separate (user-confirmed)
KEEP_SEPARATE_NORMS = {
    frozenset({"gary bucci", "jay bucci"}),
    frozenset({"mio wunderlin", "maiko wunderlin"}),
    frozenset({"james grant", "jamel grant"}),
}

# Legacy rider_id slugs → canonical id (from before approved merges)
RIDER_ID_ALIASES = {
    "gerard-rincon-23": "gerard-rincon",
    "christofer-filla-75": "christofer-filla",
    "rachel-schatzmann-359": "rachel-schatzmann",
    "remigiusz-nowak": "remigius-nowak",
    "daithi-o-brandain": "daithi-o-brandon",
    "leylazi-henderson-jaye": "leyla-zi",
}

CANONICAL_OVERRIDES = {
    "matty-darka": "Matty Darka",
    "clint-lashley": "Clint Lashley",
    "daniel-parker": "Daniel Parker",
    "florent-kaddisch": "Florent Kaddisch",
    "jaccopo-lavezzi": "Jacopo Lavezzi",
    "james-anthony": "James Anthony",
    "marco-rund": "Marco Rund",
    "martin-dunnage": "Martin Dunnage",
    "rachel-schatzmann": "Rachel Schatzmann",
    "leyla-zi": "Leyla Zi",
}

LEAGUE_RULES = {
    "1": {
        "season_label": "2023",
        "events_counted": "all",
        "max_counted": 3,
        "tier_system": False,
        "notes": "Three EOL events; all count toward season total.",
    },
    "2": {
        "season_label": "2023/24",
        "events_counted": "best",
        "max_counted": 4,
        "max_tier1_counted": 3,
        "tier_system": True,
        "tier1_event_ids": [
            "s2-wow-2023", "s2-wow-2024", "s2-owar-2023", "s2-owar-finals-2024",
            "s2-swiss-2024", "s2-fth-2024",
        ],
        "tier2_event_ids": [
            "s2-sts-2024", "s2-balaton-2024", "s2-dog-2024", "s2-mayrau-2024",
        ],
        "notes": "Best 4 results count; no more than 3 may come from Tier 1 events. "
        "2023/24 had two Wanyi weekends (both normal races) and OWAR race + finals.",
    },
    "3": {
        "season_label": "2025",
        "events_counted": "best",
        "max_counted": 3,
        "tier_system": False,
        "notes": "Season total = best 3 event results.",
    },
    "4": {
        "season_label": "2026",
        "events_counted": "best",
        "max_counted": 3,
        "tier_system": False,
        "notes": "Season total = best 3 event results (season in progress).",
    },
}


def season_counted_points(
    event_scores: list[tuple[str, float]],
    season: int,
) -> float | None:
    """event_scores: [(event_id, points), ...]"""
    items = [(eid, float(p)) for eid, p in event_scores if p and p > 0]
    if not items:
        return None
    rule = LEAGUE_RULES.get(str(season), {})
    items.sort(key=lambda x: x[1], reverse=True)

    if rule.get("tier_system"):
        tier1 = set(rule.get("tier1_event_ids", []))
        max_total = int(rule.get("max_counted", 4))
        max_t1 = int(rule.get("max_tier1_counted", 3))
        selected: list[float] = []
        t1_used = 0
        for eid, p in items:
            if len(selected) >= max_total:
                break
            if eid in tier1:
                if t1_used < max_t1:
                    selected.append(p)
                    t1_used += 1
            else:
                selected.append(p)
        return sum(selected)

    scores = [p for _, p in items]
    if rule.get("events_counted") == "all" and rule.get("max_counted") is None:
        return sum(scores)
    n = int(rule.get("max_counted", len(scores)))
    return sum(scores[:n])


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def clean_name_raw(s: str) -> str:
    """Strip PDF-glued points/rank digits appended to names (e.g. 'Tom Chester 38 25')."""
    s = re.sub(r"\s+", " ", str(s).strip())
    while True:
        m = re.search(r"^(.*)\s+(\d{1,3})\s+(\d{1,2})$", s)
        if not m:
            break
        if int(m.group(2)) <= 400 and int(m.group(3)) <= 99:
            s = m.group(1).strip()
        else:
            break
    return s


def norm_name(s: str) -> str:
    s = strip_accents(clean_name_raw(s).lower())
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", s)).strip()


def name_key(s: str) -> str:
    parts = norm_name(s).split()
    return " ".join(parts[-1:] + parts[:-1]) if len(parts) >= 2 else norm_name(s)


def slugify(s: str) -> str:
    return re.sub(r"\s+", "-", norm_name(s)) or "unknown"


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, name_key(a), name_key(b)).ratio()


def parse_num(v: Any) -> float | None:
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        f = float(v)
        return None if f != f else f
    except (TypeError, ValueError):
        return None


def is_name(v: Any) -> bool:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return False
    s = str(v).strip()
    if len(s) < 3 or s.lower() in SKIP_LABELS:
        return False
    if re.match(r"^\d+\.?\d*$", s):
        return False
    if "results" in s.lower() and len(s) < 30:
        return False
    if s.lower().startswith("special thanks"):
        return False
    return any(c.isalpha() for c in s)


def match_event(
    label: str,
    season: int,
    label_occurrence: dict[tuple[int, str], int] | None = None,
) -> str | None:
    """Map spreadsheet header to event_id; duplicate labels use sort_key order."""
    label = re.sub(r"\*$", "", str(label).strip()).strip()
    if not label or label.lower() in SKIP_LABELS:
        return None
    key_label = label.lower()
    candidates = []
    for ev in EVENTS:
        if ev["season"] != season:
            continue
        for m in ev["match"]:
            if key_label == m.lower():
                candidates.append(ev)
                break
    if not candidates:
        return None
    candidates.sort(key=lambda e: e["sort_key"])
    if label_occurrence is None:
        return candidates[0]["event_id"]
    occ_key = (season, key_label)
    idx = label_occurrence.get(occ_key, 0)
    label_occurrence[occ_key] = idx + 1
    if idx >= len(candidates):
        return None
    return candidates[idx]["event_id"]


def _column_values_look_like_points_only(
    df: pd.DataFrame, col: int, data_start: int, sample_rows: int = 25,
) -> bool:
    """True when a column only contains league point values (2025 groms sheet), not finish order."""
    samples: list[float] = []
    for r in range(data_start, min(data_start + sample_rows, len(df))):
        if not is_name(df.iloc[r, 3]):
            continue
        v = parse_num(df.iloc[r, col])
        if v and v > 0:
            samples.append(v)
    return bool(samples) and all(v > 50 for v in samples)


def find_event_columns(df: pd.DataFrame, season: int) -> tuple[int, dict[str, dict[str, int]]]:
    """Event name row + Position/Points columns; 2025 groms uses points-only columns."""
    for r in range(min(12, len(df))):
        label_occurrence: dict[tuple[int, str], int] = {}
        hits: list[tuple[int, str]] = []
        for c in range(df.shape[1]):
            raw = df.iloc[r, c]
            if pd.isna(raw):
                continue
            eid = match_event(str(raw), season, label_occurrence)
            if eid:
                hits.append((c, eid))
        if len(hits) < 2:
            continue
        data_start = r + (3 if season == 4 else 2)
        uses_points_only_sheet = False
        for col_idx, eid in hits:
            if season == 4 and col_idx < 8:
                continue
            if "finals" in eid:
                continue
            if _column_values_look_like_points_only(df, col_idx, data_start):
                uses_points_only_sheet = True
                break
        col_map: dict[str, dict[str, int | bool | None]] = {}
        for col_idx, eid in hits:
            if season == 4 and col_idx < 8:
                continue  # S4: cols 5-7 are finals qual / season pos / total
            if "finals" in eid:
                if col_idx + 1 >= df.shape[1]:
                    continue
                col_map[eid] = {"position": col_idx, "points": col_idx + 1, "points_only": False}
            elif uses_points_only_sheet:
                col_map[eid] = {"position": None, "points": col_idx, "points_only": True}
            elif col_idx + 1 >= df.shape[1]:
                continue
            else:
                col_map[eid] = {"position": col_idx, "points": col_idx + 1, "points_only": False}
        return r, col_map
    return -1, {}


def parse_overall_xlsx(path: Path, season: int) -> tuple[list[dict], list[dict]]:
    standings, events = [], []
    rel = str(path.relative_to(SOURCE))
    is_s4 = season == 4
    for sheet in pd.ExcelFile(path).sheet_names:
        cat = SHEET_CATEGORY.get(sheet.strip().lower())
        if not cat:
            continue
        if cat == "groms" and season < GROMS_FIRST_SEASON:
            continue
        df = pd.read_excel(path, sheet_name=sheet, header=None)
        hdr_row, col_map = find_event_columns(df, season)
        if hdr_row < 0:
            continue
        total_col = 7 if is_s4 else 6
        pos_col = 6 if is_s4 else 5
        data_start = hdr_row + 3 if is_s4 else hdr_row + 2
        for r in range(data_start, len(df)):
            if not is_name(df.iloc[r, 3]):
                continue
            name = clean_name_raw(str(df.iloc[r, 3]).strip())
            team = None
            if is_s4 and df.shape[1] > 4:
                tv = df.iloc[r, 4]
                if pd.notna(tv) and str(tv).strip().lower() not in SKIP_LABELS:
                    team = str(tv).strip()
            rank = parse_num(df.iloc[r, 2])
            total = parse_num(df.iloc[r, total_col])
            season_pos = parse_num(df.iloc[r, pos_col])
            ev_pts = {}
            point_values: list[float] = []
            for eid, cm in col_map.items():
                points_only = bool(cm.get("points_only"))
                if points_only:
                    ptsc = int(cm["points"])
                    if ptsc >= df.shape[1]:
                        continue
                    pts = parse_num(df.iloc[r, ptsc])
                    pos_i = None
                    pts_i = float(pts) if pts is not None else None
                else:
                    pc, ptsc = int(cm["position"]), int(cm["points"])
                    if pc >= df.shape[1]:
                        continue
                    pos = parse_num(df.iloc[r, pc])
                    pts = parse_num(df.iloc[r, ptsc]) if ptsc < df.shape[1] else None
                    pos_i = int(pos) if pos else None
                    pts_i = float(pts) if pts is not None else None
                pos_i, pts_i = normalize_finals_finish(eid, pos_i, pts_i)
                if is_s4 and not pos_i:
                    continue  # S4 paired Position/Points cols — ignore orphan points
                if pts_i and pts_i > 0:
                    point_values.append(pts_i)
                if not pos_i and not (pts_i and pts_i > 0):
                    continue
                ev_pts[eid] = {"position": pos_i, "points": pts_i or 0}
            for eid, ed in ev_pts.items():
                if ed["position"] or ed["points"]:
                    events.append({
                        "event_id": eid, "season": season, "category": cat,
                        "name_raw": name, "position": ed["position"],
                        "points": ed["points"], "source_file": rel,
                    })
            event_scores = [
                (eid, ed["points"])
                for eid, ed in ev_pts.items()
                if ed.get("points")
            ]
            if total is not None or ev_pts:
                standings.append({
                    "season": season, "category": cat, "name_raw": name,
                    "season_rank": int(rank) if rank else None,
                    "season_position": int(season_pos) if season_pos else None,
                    "total_points": total, "events": ev_pts,
                    "event_scores": event_scores,
                    "team": team,
                    "source_file": rel,
                })
    return standings, events


def _title_name(s: str) -> str:
    s = clean_name_raw(s)
    return s.title() if s.isupper() else s


OWAR_FINALS_PDF = (
    SOURCE / "season 2 - 2024/Tier 1/2 - Onewheel Algarve Race"
    / "OneWheel Final Results_231128_173038.pdf"
)


def parse_s2_owar_finals() -> list[dict]:
    """OWAR trial times PDF — field order for league data; open race podium → podium_overrides.csv."""
    if not OWAR_FINALS_PDF.exists():
        return []
    rel = str(OWAR_FINALS_PDF.relative_to(SOURCE))
    reader = PdfReader(str(OWAR_FINALS_PDF))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    events: list[dict] = []
    category = "open"
    for line in text.splitlines():
        low = line.strip().lower()
        if low == "male":
            category = "open"
            continue
        if low == "female":
            category = "female"
            continue
        m = re.match(
            r"^\s*(\d+)\.\s+\d+\s+(.+?)\s+(?:[A-Z]{3}|\d{2,4})\s+\d{2}:\d{2}",
            line,
        )
        if not m:
            continue
        pos = int(m.group(1))
        name = _title_name(m.group(2).strip())
        if "n.n." in name.lower() or not is_name(name):
            continue
        events.append({
            "event_id": "s2-owar-finals-2024",
            "season": 2,
            "category": category,
            "name_raw": name,
            "position": pos,
            "points": None,
            "source_file": rel,
        })
    return events


def _valid_person_name(name: str) -> bool:
    """Reject PDF junk lines where 'name' is only digits (corrupted Swiss page 3, etc.)."""
    name = name.strip()
    letters = sum(1 for c in name if c.isalpha())
    return letters >= 3


def _is_results_continuation_page(text: str) -> bool:
    """True for PDF pages that continue a results table (ranks 30–50, no header)."""
    if not text or not text.strip():
        return False
    upper = text.upper()
    if "RESULTS" in upper or "RUNNING TOTAL" in upper or "GO BACK" in upper:
        return False
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        return False
    ranked = [ln for ln in lines if re.match(r"^\d+\s+\S", ln)]
    return len(ranked) >= max(2, int(len(lines) * 0.4))


def _collect_event_pdf_pages(pages: list[str], results_page_idx: int) -> str:
    """Results header page plus any following continuation pages."""
    parts = [pages[results_page_idx]]
    for i in range(results_page_idx + 1, len(pages)):
        if _is_results_continuation_page(pages[i]):
            parts.append(pages[i])
        else:
            break
    return "\n".join(parts)


def _parse_dual_results_page(text: str, eid: str, rel: str) -> list[dict]:
    """Parse EOL PDF pages with MALE | FEMALE side-by-side result lines."""
    out = []
    seen_open_names: set[str] = set()
    for line in text.splitlines():
        line = line.strip()
        if not line or "RANK" in line.upper() or "RESULTS" in line.upper():
            continue
        # Glued female name+points: 6 Fábio Costa 115 6 Chantelle Warner-Wells115
        m = re.match(
            r"^(\d+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(.+[A-Za-zÀ-ÿ'\-])(\d+)\s*$",
            line,
        )
        if m and _valid_person_name(m.group(2)) and _valid_person_name(m.group(5)):
            mr, mn, mp, fr, fn, fp = m.groups()
            open_row = {"event_id": eid, "season": 1, "category": "open",
                        "name_raw": _title_name(mn), "position": int(mr), "points": float(mp), "source_file": rel}
            out.append(open_row)
            seen_open_names.add(norm_name(open_row["name_raw"]))
            out.append({"event_id": eid, "season": 1, "category": "female",
                        "name_raw": _title_name(fn), "position": int(fr), "points": float(fp), "source_file": rel})
            continue
        # Both sides with female name: 1 NAME pts 1 NAME pts
        m = re.match(
            r"^(\d+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(.+?)\s+(\d+)\s*$",
            line,
        )
        if m and _valid_person_name(m.group(2)) and _valid_person_name(m.group(5)):
            mr, mn, mp, fr, fn, fp = m.groups()
            open_row = {"event_id": eid, "season": 1, "category": "open",
                        "name_raw": _title_name(mn), "position": int(mr), "points": float(mp), "source_file": rel}
            out.append(open_row)
            seen_open_names.add(norm_name(open_row["name_raw"]))
            out.append({"event_id": eid, "season": 1, "category": "female",
                        "name_raw": _title_name(fn), "position": int(fr), "points": float(fp), "source_file": rel})
            continue
        # Male + female rank/points without female name (FTH continuation page)
        m = re.match(r"^(\d+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s*$", line)
        if m and _valid_person_name(m.group(2)):
            mr, mn, mp, fr = int(m.group(1)), m.group(2), float(m.group(3)), int(m.group(4))
            nk = norm_name(_title_name(mn))
            # e.g. "35 Darren Attew 28 35 28" — male rank 22 already has Darren; female col is rank-only
            if nk in seen_open_names and mr == fr:
                continue
            open_row = {"event_id": eid, "season": 1, "category": "open",
                        "name_raw": _title_name(mn), "position": mr, "points": mp, "source_file": rel}
            out.append(open_row)
            seen_open_names.add(nk)
            continue
        # Male-only continuation row (Gattinara page 2: 30 NAME pts)
        m = re.match(r"^(\d+)\s+(.+?)\s+(\d+)\s*$", line)
        if m and _valid_person_name(m.group(2)):
            open_row = {"event_id": eid, "season": 1, "category": "open",
                        "name_raw": _title_name(m.group(2)), "position": int(m.group(1)),
                        "points": float(m.group(3)), "source_file": rel}
            out.append(open_row)
            seen_open_names.add(norm_name(open_row["name_raw"]))
    return out


def _aggregate_standings_from_events(
    events: list[dict], season: int, category: str
) -> list[dict]:
    """Build season totals from per-event results (reliable for S1 PDF)."""
    buckets: dict[str, dict] = {}
    for e in events:
        if e["season"] != season or e["category"] != category:
            continue
        key = norm_name(e["name_raw"])
        if key not in buckets:
            buckets[key] = {
                "name_raw": e["name_raw"],
                "events": {},
                "source_file": e["source_file"],
            }
        b = buckets[key]
        eid = e["event_id"]
        pts = e.get("points")
        pos = e.get("position")
        prev = b["events"].get(eid, {})
        if pts and pts > 0:
            b["events"][eid] = {
                "position": int(pos) if pos else prev.get("position"),
                "points": float(pts),
            }
        elif pos and (eid not in b["events"] or not b["events"][eid].get("position")):
            b["events"][eid] = {
                "position": int(pos),
                "points": prev.get("points"),
            }

    ranked: list[dict] = []
    for b in buckets.values():
        total = sum((ev.get("points") or 0) for ev in b["events"].values())
        if total <= 0:
            continue
        ranked.append({**b, "total_points": total})
    ranked.sort(key=lambda x: x["total_points"], reverse=True)

    standings = []
    for i, b in enumerate(ranked, start=1):
        event_scores = [(eid, ev["points"]) for eid, ev in b["events"].items() if ev.get("points")]
        standings.append({
            "season": season,
            "category": category,
            "name_raw": b["name_raw"],
            "season_rank": i,
            "season_position": i,
            "total_points": b["total_points"],
            "events": b["events"],
            "event_scores": event_scores,
            "source_file": b["source_file"],
        })
    return standings


def parse_season1() -> tuple[list[dict], list[dict]]:
    rel_pdf = "Season 1 - 2023/EOL Rankings 2023.pdf"
    pdf_path = SOURCE / rel_pdf
    reader = PdfReader(str(pdf_path))
    pages = [p.extract_text() or "" for p in reader.pages]
    full = "\n".join(pages)

    events: list[dict] = []
    # Per-event PDF blocks (header page + automatic continuation pages)
    for eid, page_idx in (
        ("s1-gattinara-2023", 0),
        ("s1-swiss-2023", 2),
        ("s1-fth-2023", 4),
    ):
        if page_idx < len(pages):
            block = _collect_event_pdf_pages(pages, page_idx)
            events.extend(_parse_dual_results_page(block, eid, rel_pdf))

    # Swiss xlsx — finishing order (no points in sheet)
    swiss_xlsx = SOURCE / "Season 1 - 2023/2 - Swiss Onewheel Race/Swiss Race Ranking.xlsx"
    if swiss_xlsx.exists():
        for sheet, cat in [("Ranking Men", "open"), ("Ranking Women", "female")]:
            df = pd.read_excel(swiss_xlsx, sheet_name=sheet, header=None)
            for i, row in df.iterrows():
                last, first = row.iloc[0], row.iloc[1]
                if pd.isna(last):
                    continue
                name = f"{first} {last}".strip()
                events.append({
                    "event_id": "s1-swiss-2023", "season": 1, "category": cat,
                    "name_raw": name, "position": i + 1, "points": None,
                    "source_file": str(swiss_xlsx.relative_to(SOURCE)),
                })

    standings: list[dict] = []
    standings.extend(_aggregate_standings_from_events(events, 1, "open"))
    standings.extend(_aggregate_standings_from_events(events, 1, "female"))
    return standings, events


class Registry:
    def __init__(self, approved: dict[str, str]):
        self.approved = approved  # norm_name -> rider_id
        self.canonical: dict[str, str] = {}
        self.variants: dict[str, set[str]] = defaultdict(set)
        self.id_for_norm: dict[str, str] = {}

    def resolve(self, name_raw: str) -> str:
        name_raw = clean_name_raw(name_raw)
        n, nk = norm_name(name_raw), name_key(name_raw)
        if n in self.id_for_norm:
            rid = self.id_for_norm[n]
            self.variants[rid].add(name_raw)
            return rid
        if nk in self.id_for_norm:
            rid = self.id_for_norm[nk]
            self.variants[rid].add(name_raw)
            return rid
        # Approved alias before creating a new slug (avoids PDF noise ids)
        for key in (n, nk):
            if key in self.approved:
                rid = self.approved[key]
                self._bind(rid, name_raw)
                return rid
        rid = slugify(name_raw)
        if rid in self.canonical:
            rid = f"{rid}-{len(self.canonical)}"
        self._bind(rid, name_raw)
        return rid

    def _bind(self, rid: str, name_raw: str):
        self.variants[rid].add(name_raw)
        for k in {norm_name(name_raw), name_key(name_raw)}:
            if k:
                self.id_for_norm[k] = rid
        cur = self.canonical.get(rid, "")
        noisy = bool(re.search(r"\d", name_raw))
        cur_noisy = bool(re.search(r"\d", cur))
        if not cur:
            self.canonical[rid] = name_raw
        elif cur_noisy and not noisy:
            self.canonical[rid] = name_raw
        elif not cur_noisy and not noisy and len(name_raw) > len(cur):
            self.canonical[rid] = name_raw
        elif name_raw != name_raw.upper() and cur == cur.upper():
            self.canonical[rid] = name_raw


def normalize_rider_id(rider_id: str) -> str:
    return RIDER_ID_ALIASES.get(rider_id, rider_id)


def apply_rider_id_aliases(rows: list[dict]) -> None:
    for row in rows:
        rid = row.get("rider_id")
        if rid in RIDER_ID_ALIASES:
            row["rider_id"] = RIDER_ID_ALIASES[rid]


def collapse_suffix_duplicate_rider_ids(reg: Registry, rows: list[dict]) -> int:
    """Merge rider_id slugs like `name-134` into `name` when both exist (2026 sheet re-imports)."""
    ids = set(reg.canonical)
    suffix_to_base: dict[str, str] = {}
    for rid in ids:
        m = re.match(r"^(.+)-(\d+)$", rid)
        if m and m.group(1) in ids:
            suffix_to_base[rid] = m.group(1)

    for suffix_rid, base_rid in suffix_to_base.items():
        reg.variants[base_rid] |= reg.variants.pop(suffix_rid, set())
        s_name = reg.canonical.get(suffix_rid, "")
        b_name = reg.canonical.get(base_rid, "")
        s_noisy = bool(re.search(r"\d", s_name))
        b_noisy = bool(re.search(r"\d", b_name))
        if not b_name or (b_noisy and not s_noisy):
            reg.canonical[base_rid] = s_name
        elif not s_noisy and len(s_name) > len(b_name):
            reg.canonical[base_rid] = s_name
        del reg.canonical[suffix_rid]

    for row in rows:
        rid = row.get("rider_id")
        if rid in suffix_to_base:
            base = suffix_to_base[rid]
            row["rider_id"] = base
            row["canonical_name"] = reg.canonical.get(base, row.get("canonical_name"))

    return len(suffix_to_base)


def load_approved() -> dict[str, str]:
    if not APPROVED_MERGES.exists():
        return {}
    df = pd.read_csv(APPROVED_MERGES)
    out: dict[str, str] = {}
    for _, row in df.iterrows():
        if str(row.get("approved", "")).lower() not in ("y", "yes", "true", "1"):
            continue
        alias = str(row["alias_name"]).strip()
        rid = str(row["rider_id"]).strip()
        if not alias or alias.startswith("#"):
            continue
        out[norm_name(alias)] = rid
        out[name_key(alias)] = rid
    return out


def collect_name_discrepancies(all_names: list[tuple[str, int, str]]) -> list[dict]:
    """all_names: (name_raw, season, category) — find fuzzy groups."""
    by_norm: dict[str, list[tuple[str, int, str]]] = defaultdict(list)
    for name, season, cat in all_names:
        by_norm[norm_name(name)].append((name, season, cat))

    rows = []
    norms = list(by_norm.keys())
    seen = set()
    for i, n1 in enumerate(norms):
        for n2 in norms[i + 1:]:
            if n1 == n2:
                continue
            pair = tuple(sorted([n1, n2]))
            if pair in seen:
                continue
            sc = SequenceMatcher(None, n1, n2).ratio()
            if sc < 0.82:
                continue
            names1 = {x[0] for x in by_norm[n1]}
            names2 = {x[0] for x in by_norm[n2]}
            if names1 == names2:
                continue
            if frozenset([n1, n2]) in KEEP_SEPARATE_NORMS:
                rows.append({
                    "normalized_a": n1,
                    "normalized_b": n2,
                    "similarity": round(sc, 3),
                    "variants_a": " | ".join(sorted(names1)),
                    "variants_b": " | ".join(sorted(names2)),
                    "recommendation": "keep_separate",
                    "approved": "no",
                    "merge_to_rider_id": "",
                })
                continue
            seen.add(pair)
            rows.append({
                "normalized_a": n1,
                "normalized_b": n2,
                "similarity": round(sc, 3),
                "variants_a": " | ".join(sorted(names1)),
                "variants_b": " | ".join(sorted(names2)),
                "recommendation": "likely_same" if sc >= 0.92 else "review",
                "approved": "",
                "merge_to_rider_id": "",
            })
    return sorted(rows, key=lambda r: -r["similarity"])


def assign_numbers(batches: list[dict]) -> dict[str, dict]:
    assigned: dict[str, dict] = {}
    n = 1
    for batch in batches:
        riders = [r for r in batch["riders"] if r["rider_id"] not in assigned]
        riders.sort(key=lambda r: (CATEGORY_ORDER.get(r["category"], 9), r.get("position") or 9999))
        for r in riders:
            assigned[r["rider_id"]] = {
                "race_number": n,
                "assigned_at_event": batch["event_id"],
                "assigned_at_event_name": batch["event_name"],
                "category_at_assignment": r["category"],
                "position_at_assignment": r.get("position"),
            }
            n += 1
    return assigned


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    approved = load_approved()
    reg = Registry(approved)

    all_standings: list[dict] = []
    all_events: list[dict] = []

    s1_st, s1_ev = parse_season1()
    all_standings.extend(s1_st)
    all_events.extend(s1_ev)

    for path, season in [
        (SOURCE / "season 2 - 2024/Rankings/EOL 2023_2024 Overall Rankings.xlsx", 2),
        (SOURCE / "Season 3 - 2025/EOL 2025 Overall Rankings.xlsx", 3),
        (SOURCE / "Season 4 - 2026/EOL 2026 Overall Rankings.xlsx", 4),
    ]:
        if path.exists():
            st, ev = parse_overall_xlsx(path, season)
            all_standings.extend(st)
            all_events.extend(ev)

    all_events.extend(parse_s2_owar_finals())

    all_standings = [
        s for s in all_standings
        if s["category"] != "groms" or s["season"] >= GROMS_FIRST_SEASON
    ]
    all_events = [
        e for e in all_events
        if e["category"] != "groms" or e["season"] >= GROMS_FIRST_SEASON
    ]

    # Resolve names
    name_occurrences: list[tuple[str, int, str]] = []
    season_rows = []
    event_rows = []
    alignment_issues = []
    alignment_ok = 0

    for st in all_standings:
        rid = reg.resolve(st["name_raw"])
        name_occurrences.append((st["name_raw"], st["season"], st["category"]))
        event_scores = st.get("event_scores") or [
            (eid, ev.get("points") or 0)
            for eid, ev in st.get("events", {}).items()
            if ev.get("points")
        ]
        counted = season_counted_points(event_scores, st["season"])
        season_rows.append({
            "rider_id": rid,
            "canonical_name": reg.canonical[rid],
            "season": st["season"],
            "category": st["category"],
            "season_rank": st["season_rank"],
            "season_position": st["season_position"],
            "total_points": st["total_points"],
            "counted_points_best_n": counted,
            "team": st.get("team") or "",
            "source_file": st["source_file"],
        })
        if st["total_points"] and counted is not None and counted > 0:
            diff = abs(counted - st["total_points"])
            if diff <= 10:
                alignment_ok += 1
            elif st["season"] >= 2 and diff > 15:
                rule = LEAGUE_RULES.get(str(st["season"]), {})
                n = rule.get("max_counted", "all")
                alignment_issues.append(
                    f"S{st['season']} {st['category']} {reg.canonical[rid]}: "
                    f"sheet={st['total_points']:.0f} best_{n}={counted:.0f} diff={st['total_points']-counted:.0f} "
                    f"(raw_scores={sorted((p for _, p in event_scores), reverse=True)[:6]})"
                )

    # Same rider can appear twice in a sheet (duplicate rows); keep highest total_points
    season_dedup: dict[tuple, dict] = {}
    for row in season_rows:
        key = (row["rider_id"], row["season"], row["category"])
        prev = season_dedup.get(key)
        tp = row["total_points"] or 0
        ptp = (prev["total_points"] or 0) if prev else -1
        if not prev or tp > ptp:
            season_dedup[key] = row
    season_rows = list(season_dedup.values())
    apply_rider_id_aliases(season_rows)

    for ev in all_events:
        rid = reg.resolve(ev["name_raw"])
        name_occurrences.append((ev["name_raw"], ev["season"], ev["category"]))
        event_rows.append({
            "event_id": ev["event_id"],
            "rider_id": rid,
            "canonical_name": reg.canonical[rid],
            "season": ev["season"],
            "category": ev["category"],
            "position": ev["position"],
            "points": ev["points"],
            "source_file": ev["source_file"],
        })

    apply_rider_id_aliases(event_rows)
    collapsed = collapse_suffix_duplicate_rider_ids(reg, season_rows + event_rows)
    if collapsed:
        print(f"Collapsed {collapsed} duplicate suffix rider profile(s) into base ids")
    for rid, name in CANONICAL_OVERRIDES.items():
        reg.canonical[rid] = name
    for row in event_rows + season_rows:
        rid = row["rider_id"]
        if rid in CANONICAL_OVERRIDES:
            row["canonical_name"] = CANONICAL_OVERRIDES[rid]

    # Dedupe event rows: best position per rider/event
    best: dict[tuple, dict] = {}
    for er in event_rows:
        key = (er["event_id"], er["rider_id"], er["category"])
        prev = best.get(key)
        pos = er["position"] or 9999
        if not prev or pos < (prev["position"] or 9999):
            best[key] = er
    event_rows = list(best.values())
    trial_pdf_podiums = extract_trial_pdf_podiums(event_rows)
    validate_podium_overrides(trial_pdf_podiums)
    apply_finals_race_results(event_rows, reg)
    apply_podium_overrides(event_rows, reg)

    # Number assignment batches (chronological)
    ev_index = {e["event_id"]: e for e in EVENTS}
    by_event: dict[str, list[dict]] = defaultdict(list)
    for er in event_rows:
        if er.get("position") and er["position"] > 0:
            by_event[er["event_id"]].append(er)

    batches = []
    for ev in sorted(EVENTS, key=lambda e: e["sort_key"]):
        eid = ev["event_id"]
        riders_raw = by_event.get(eid, [])
        if not riders_raw:
            continue
        # one entry per rider (best position across categories — rare overlap)
        per_rider: dict[str, dict] = {}
        for r in riders_raw:
            rid = r["rider_id"]
            if rid not in per_rider or (r["position"] or 999) < (per_rider[rid].get("position") or 999):
                per_rider[rid] = r
        batches.append({
            "event_id": eid,
            "event_name": ev["name"],
            "riders": [
                {"rider_id": rid, "category": d["category"], "position": d["position"],
                 "canonical_name": d["canonical_name"]}
                for rid, d in per_rider.items()
            ],
        })

    numbers = assign_numbers(batches)

    # Fallback: riders only in season standings (no event position found) — batch at end by S1 season rank
    unassigned = [rid for rid in reg.canonical if rid not in numbers]
    if unassigned:
        fallback_rows = [
            s for s in season_rows
            if s["rider_id"] in unassigned and s.get("season_rank")
        ]
        # earliest season first
        fallback_rows.sort(key=lambda s: (s["season"], CATEGORY_ORDER[s["category"]], s["season_rank"]))
        fb = assign_numbers([{
            "event_id": "s1-standings-fallback",
            "event_name": "Season standings fallback (no event position in source)",
            "riders": [
                {"rider_id": s["rider_id"], "category": s["category"],
                 "position": s["season_rank"], "canonical_name": s["canonical_name"]}
                for s in fallback_rows
            ],
        }])
        offset = max(numbers.values(), key=lambda x: x["race_number"])["race_number"] if numbers else 0
        for rid, info in fb.items():
            info["race_number"] += offset
            numbers[rid] = info

    # Mark is_new on first event result row per rider in event_results export
    for er in event_rows:
        er["display_name"] = f"{er['canonical_name']} #{numbers[er['rider_id']]['race_number']}" if er["rider_id"] in numbers else er["canonical_name"]
        er["race_number"] = numbers.get(er["rider_id"], {}).get("race_number")
        er["number_is_new_at_this_event"] = (
            er["rider_id"] in numbers
            and numbers[er["rider_id"]]["assigned_at_event"] == er["event_id"]
        )

    riders_csv = []
    for rid, name in sorted(reg.canonical.items(), key=lambda x: norm_name(x[1])):
        num = numbers.get(rid, {})
        riders_csv.append({
            "rider_id": rid,
            "canonical_name": name,
            "display_name": f"{name} #{num['race_number']}" if num else name,
            "race_number": num.get("race_number"),
            "number_assigned_at_event": num.get("assigned_at_event"),
            "number_assigned_at_event_name": num.get("assigned_at_event_name"),
            "category_at_number_assignment": num.get("category_at_assignment"),
            "all_name_variants": " | ".join(sorted(reg.variants[rid])),
        })

    discrepancies = collect_name_discrepancies(name_occurrences)

    # Variant report: same rider_id, multiple spellings
    variant_rows = []
    for rid, vars in reg.variants.items():
        if len(vars) > 1:
            variant_rows.append({
                "rider_id": rid,
                "canonical_name": reg.canonical[rid],
                "variants": " | ".join(sorted(vars)),
                "note": "auto_merged_exact_or_approved" if len(vars) > 1 else "",
            })

    pd.DataFrame(riders_csv).to_csv(OUT / "riders.csv", index=False)
    pd.DataFrame(EVENTS).to_csv(OUT / "events.csv", index=False)
    pd.DataFrame(season_rows).to_csv(OUT / "season_standings.csv", index=False)
    pd.DataFrame(event_rows).to_csv(OUT / "event_results.csv", index=False)
    pd.DataFrame(discrepancies).to_csv(OUT / "name_discrepancies_for_review.csv", index=False)
    pd.DataFrame(variant_rows).to_csv(OUT / "name_variants_within_rider.csv", index=False)

    xlsx_path = ROOT / "EOL_master.xlsx"
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as xw:
        pd.DataFrame(riders_csv).to_excel(xw, sheet_name="riders", index=False)
        pd.DataFrame(EVENTS).to_excel(xw, sheet_name="events", index=False)
        pd.DataFrame(season_rows).to_excel(xw, sheet_name="season_standings", index=False)
        pd.DataFrame(event_rows).to_excel(xw, sheet_name="event_results", index=False)
        pd.DataFrame(discrepancies).to_excel(xw, sheet_name="names_to_review", index=False)

    summary = {
        "riders": len(reg.canonical),
        "numbered": len(numbers),
        "unnumbered": len(reg.canonical) - len(numbers),
        "season_standings_rows": len(season_rows),
        "event_results_rows": len(event_rows),
        "name_pairs_for_review": len(discrepancies),
        "riders_with_multiple_spellings": len(variant_rows),
        "alignment_issues_over_10pts": len(alignment_issues),
    }
    league_path = OUT / "league_rules.json"
    league_path.write_text(json.dumps({"seasons": LEAGUE_RULES}, indent=2))

    summary["alignment_ok_within_10pts"] = alignment_ok
    summary["alignment_mismatches"] = len(alignment_issues)
    (OUT / "build_summary.json").write_text(json.dumps(summary, indent=2))
    (OUT / "alignment_report.md").write_text(
        "# Alignment report\n\n"
        f"Generated from overall ranking workbooks + Season 1 PDF.\n\n"
        f"## Summary\n\n```json\n{json.dumps(summary, indent=2)}\n```\n\n"
        f"## League counting rules\n\n"
        f"See `league_rules.json`. Season totals use **best N** event scores, not sum of all events.\n\n"
        f"- Season 1: all 3 events\n"
        f"- Season 2 (2023/24): best **4** (had Tier 1 / Tier 2 point scales)\n"
        f"- Season 3 (2025): best **3**\n"
        f"- Season 4 (2026+): all events so far (no cap yet)\n\n"
        f"**{alignment_ok}** rider-season rows match within 10 pts using these rules.\n\n"
        f"## Mismatches (diff > 15 pts)\n\n"
        + ("\n".join(f"- {x}" for x in alignment_issues[:60]) or "None — all within tolerance.")
        + "\n\n## Notes\n\n"
        "- `counted_points_best_n` in season_standings.csv shows the recomputed total.\n"
        "- Remaining gaps may be duplicate event columns in the 2023/24 sheet or parser edge cases.\n"
        "- Re-run after editing `approved_merges.csv`.\n"
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
