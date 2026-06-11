#!/usr/bin/env python3
"""Build all event JSON files for the Dynamic Divisions app."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass
from datetime import time, timedelta
from pathlib import Path

import pandas as pd

# Allow imports from scripts/ when run as module or script
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from extract_orl_events import DEFAULT_ORL_DIR, extract_all_orl_events  # noqa: E402
from orl_common import build_event, format_time, parse_time  # noqa: E402

HUB_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_XLSX = (
    HUB_ROOT / "data" / "divisions" / "sources" / "Copy of STS 2026 Race Results Spreadsheet.xlsx"
)


@dataclass(frozen=True)
class SectionColumns:
    category: str
    first_name: int
    surname: int
    fastest: int
    race_number: int | None = None
    tt_pos: int | None = None


TIME_TRIALS_SECTIONS = [
    SectionColumns("Open", first_name=10, surname=11, fastest=15, race_number=9, tt_pos=8),
    SectionColumns("Women", first_name=19, surname=20, fastest=24, race_number=18, tt_pos=17),
    SectionColumns("Groms", first_name=28, surname=29, fastest=33, race_number=27, tt_pos=26),
]


def process_section(df: pd.DataFrame, cols: SectionColumns) -> list[dict]:
    riders: list[dict] = []
    for row_idx in range(2, len(df)):
        first_raw = df.iloc[row_idx, cols.first_name]
        surname_raw = df.iloc[row_idx, cols.surname]
        if pd.isna(first_raw) and pd.isna(surname_raw):
            continue

        fastest = parse_time(df.iloc[row_idx, cols.fastest])
        if fastest is None:
            continue

        first = str(first_raw).strip() if pd.notna(first_raw) else ""
        surname = str(surname_raw).strip() if pd.notna(surname_raw) else ""
        name = f"{first} {surname}".strip()
        if not name:
            continue

        race_number: int | None = None
        if cols.race_number is not None:
            rn = df.iloc[row_idx, cols.race_number]
            if pd.notna(rn):
                try:
                    race_number = int(rn)
                except (ValueError, TypeError):
                    pass

        tt_pos: int | None = None
        if cols.tt_pos is not None:
            pos = df.iloc[row_idx, cols.tt_pos]
            if pd.notna(pos):
                try:
                    tt_pos = int(pos)
                except (ValueError, TypeError):
                    pass

        riders.append(
            {
                "race_number": race_number,
                "name": name,
                "category": cols.category,
                "tt_pos_in_category": tt_pos,
                "fastest_seconds": fastest,
                "fastest_time": format_time(fastest),
            }
        )
    return riders


def extract_sts_2026(xlsx_path: Path) -> dict:
    df = pd.read_excel(xlsx_path, sheet_name="Time Trials", header=None)
    riders_by_category: dict[str, list[dict]] = {}
    for section in TIME_TRIALS_SECTIONS:
        riders_by_category[section.category] = process_section(df, section)

    all_riders: list[dict] = []
    for cat_riders in riders_by_category.values():
        all_riders.extend(cat_riders)

    return build_event(
        event_id="sts-2026",
        event_name="Shred the Shires 2026",
        description="Time trials from Time Trials sheet (Open K/L/P, Women T/U/Y, Groms AC/AD/AH)",
        riders=all_riders,
        default_categories=["Open", "Women"],
    )


def write_event(event: dict, out_dir: Path, site_public: Path) -> None:
    event_path = out_dir / f"{event['id']}.json"
    with event_path.open("w") as f:
        json.dump(event, f, indent=2)

    csv_path = out_dir / f"{event['id']}.csv"
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "rank",
                "race_number",
                "name",
                "category",
                "tt_pos_in_category",
                "fastest_time",
                "fastest_seconds",
            ],
        )
        writer.writeheader()
        writer.writerows(event["riders"])

    site_event = site_public / f"{event['id']}.json"
    with site_event.open("w") as f:
        json.dump(event, f, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build all Dynamic Divisions event data")
    parser.add_argument("--xlsx", type=Path, default=DEFAULT_XLSX)
    parser.add_argument("--orl-dir", type=Path, default=DEFAULT_ORL_DIR)
    parser.add_argument("--out-dir", type=Path, default=HUB_ROOT / "data" / "divisions")
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    site_public = HUB_ROOT / "site" / "public" / "data" / "divisions"
    site_public.mkdir(parents=True, exist_ok=True)

    events: list[dict] = []

    if args.xlsx.is_file():
        events.append(extract_sts_2026(args.xlsx))
    else:
        print(f"Skipping STS 2026 — spreadsheet not found: {args.xlsx}")

    events.extend(extract_all_orl_events(args.orl_dir))

    for event in events:
        write_event(event, args.out_dir, site_public)
        counts = {cat: len(riders) for cat, riders in event["ridersByCategory"].items()}
        print(f"{event['id']}: {len(event['riders'])} riders -> {args.out_dir / event['id']}.json")
        for cat, n in sorted(counts.items()):
            print(f"  {cat}: {n}")

    events_index = {
        "events": [
            {
                "id": e["id"],
                "name": e["name"],
                "riderCount": len(e["riders"]),
                "categories": e["categories"],
                "defaultCategories": e["defaultCategories"],
                "countsByCategory": {
                    cat: len(riders) for cat, riders in e["ridersByCategory"].items()
                },
            }
            for e in events
        ],
        "defaultEventId": "sts-2026" if any(e["id"] == "sts-2026" for e in events) else events[0]["id"],
    }

    for target in (args.out_dir / "events.json", site_public / "events.json"):
        with target.open("w") as f:
            json.dump(events_index, f, indent=2)

    print(f"\nWrote {len(events)} events to {args.out_dir / 'events.json'}")


if __name__ == "__main__":
    main()
