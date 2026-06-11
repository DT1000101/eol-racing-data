"""Shared helpers for parsing ORL / EOL timing CSV exports."""

from __future__ import annotations

import csv
import re
from datetime import time, timedelta
from pathlib import Path

CATEGORY_MAP = {
    "MALE": "Open",
    "FEMALE": "Women",
    "GROM": "Groms",
    "LEGEND": "Legends",
    "WILDCARD": "Wildcard",
    "Male": "Open",
    "Female": "Women",
    "Grom": "Groms",
    "OPEN": "Open",
    "WOMEN": "Women",
    "WOMAN": "Women",
}


def normalize_category(raw: str) -> str:
    key = raw.strip()
    if not key:
        return "Open"
    upper = key.upper()
    if upper in CATEGORY_MAP:
        return CATEGORY_MAP[upper]
    if key in CATEGORY_MAP:
        return CATEGORY_MAP[key]
    return key


def parse_time(val) -> float | None:
    if val is None:
        return None
    if isinstance(val, time):
        return val.hour * 3600 + val.minute * 60 + val.second + val.microsecond / 1e6
    if isinstance(val, timedelta):
        return val.total_seconds()

    time_str = str(val).strip()
    if not time_str or time_str.upper() in {"DNF", "DNS", "NO CHIP", "-", "NAN"}:
        return None

    if " " in time_str:
        time_str = time_str.split(" ", 1)[-1]
    time_str = time_str.replace("*", "").strip()

    parts = time_str.split(":")
    try:
        if len(parts) == 2:
            minutes = int(parts[0])
            seconds_parts = parts[1].split(".")
            seconds = int(seconds_parts[0])
            ms = int(seconds_parts[1]) if len(seconds_parts) > 1 else 0
            frac = ms / (10 ** len(seconds_parts[1])) if len(seconds_parts) > 1 else 0
            return minutes * 60 + seconds + frac
        if len(parts) == 3:
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds_parts = parts[2].split(".")
            seconds = int(seconds_parts[0])
            ms = int(seconds_parts[1]) if len(seconds_parts) > 1 else 0
            frac = ms / (10 ** len(seconds_parts[1])) if len(seconds_parts) > 1 else 0
            return hours * 3600 + minutes * 60 + seconds + frac
    except (ValueError, IndexError):
        return None
    return None


def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes:02d}:{secs:06.3f}"


def latest_csv_groups(pattern: str, base_dir: Path) -> list[Path]:
    """Pick the newest CSV for each race-type basename in a folder."""
    files = list(base_dir.glob(pattern))
    if not files:
        return []

    groups: dict[str, list[Path]] = {}
    for path in files:
        base_name = re.sub(r"_\d{8}_\d{6}\.csv$", "", path.name)
        groups.setdefault(base_name, []).append(path)

    return [max(group, key=lambda p: p.stat().st_mtime) for group in groups.values()]


def rider_record(
    *,
    name: str,
    category: str,
    fastest_seconds: float,
    race_number: int | None = None,
) -> dict:
    return {
        "race_number": race_number,
        "name": name,
        "category": normalize_category(category),
        "tt_pos_in_category": None,
        "fastest_seconds": fastest_seconds,
        "fastest_time": format_time(fastest_seconds),
    }


def best_per_rider(entries: list[dict]) -> list[dict]:
    """Keep each rider's fastest time; prefer non-asterisk times when flagged."""
    by_name: dict[str, list[dict]] = {}
    for entry in entries:
        by_name.setdefault(entry["name"], []).append(entry)

    best: list[dict] = []
    for name, rows in by_name.items():
        rows.sort(key=lambda r: r["fastest_seconds"])
        clean = next((r for r in rows if not r.get("_asterisk")), rows[0])
        row = {k: v for k, v in clean.items() if not k.startswith("_")}
        best.append(row)
    return best


def build_event(
    *,
    event_id: str,
    event_name: str,
    description: str,
    riders: list[dict],
    default_categories: list[str],
) -> dict:
    by_category: dict[str, list[dict]] = {}
    for rider in riders:
        by_category.setdefault(rider["category"], []).append(rider)

    for cat_riders in by_category.values():
        cat_riders.sort(key=lambda r: r["fastest_seconds"])

    all_riders = [r for cat in sorted(by_category) for r in by_category[cat]]
    all_riders.sort(key=lambda r: r["fastest_seconds"])
    for i, rider in enumerate(all_riders):
        rider["rank"] = i + 1

    return {
        "id": event_id,
        "name": event_name,
        "description": description,
        "defaultCategories": default_categories,
        "categories": sorted(by_category.keys()),
        "ridersByCategory": by_category,
        "riders": all_riders,
    }


def read_csv_rows(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        first = f.readline()
        f.seek(0)
        lower = first.lower()
        is_header = (
            "name" in lower
            or "first name" in lower
            or "organsier" in lower
            or "time trial" in lower
        )
        if not is_header:
            next(f)
        return list(csv.DictReader(f))


def category_from_filename(filename: str) -> str:
    lower = filename.lower()
    if "women" in lower or "womens" in lower:
        return "Women"
    if "grom" in lower:
        return "Groms"
    if "legend" in lower:
        return "Legends"
    if "wildcard" in lower:
        return "Wildcard"
    return "Open"
