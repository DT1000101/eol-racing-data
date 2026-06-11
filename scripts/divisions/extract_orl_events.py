#!/usr/bin/env python3
"""Extract best lap times from ORL analysis CSV folders."""

from __future__ import annotations

import csv
from pathlib import Path

from orl_common import (
    best_per_rider,
    build_event,
    category_from_filename,
    latest_csv_groups,
    parse_time,
    read_csv_rows,
    rider_record,
)

DEFAULT_ORL_DIR = (
    Path(__file__).resolve().parents[2].parent
    / "ORL_tables"
    / "old_initial_analysis_stuff"
)


def extract_owa_2025(orl_dir: Path) -> dict:
    folder = orl_dir / "OWA_2025_alltimes"
    entries: list[dict] = []

    for csv_path in latest_csv_groups("*.csv", folder):
        category = category_from_filename(csv_path.name)
        reader = read_csv_rows(csv_path)
        for row in reader:
            first = row.get("Name", row.get("First name", "")).strip()
            last = row.get("Surname", row.get("Last name", "")).strip()
            if not first or not last:
                continue

            time_raw = row.get("Time", row.get("Finish Time", row.get("Fastest Lap", "")))
            seconds = parse_time(time_raw)
            if seconds is None:
                continue

            entries.append(
                {
                    **rider_record(
                        name=f"{first} {last}",
                        category=category,
                        fastest_seconds=seconds,
                    ),
                    "_asterisk": "*" in str(time_raw),
                }
            )

    riders = best_per_rider(entries)
    return build_event(
        event_id="owa-2025",
        event_name="Onewheel Algarve 2025",
        description="Best lap across all OWA/EOL races (finals, semis, quarters, etc.)",
        riders=riders,
        default_categories=["Open", "Women"],
    )


def extract_sts_2025(orl_dir: Path) -> dict:
    folder = orl_dir / "STS_2025" / "overall"
    files = list(folder.glob("overall_lap_times_*.csv"))
    if not files:
        raise FileNotFoundError(f"No STS 2025 overall files in {folder}")

    csv_path = max(files, key=lambda p: p.stat().st_mtime)
    entries: list[dict] = []

    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            first = row.get("First name", "").strip()
            last = row.get("Last name", "").strip()
            if not first or not last:
                continue

            category = row.get("Category", row.get("Gender", "Open")).strip() or "Open"
            seconds = parse_time(row.get("Finish Time", ""))
            if seconds is None:
                continue

            race_number: int | None = None
            rn = row.get("Race Number", "").strip()
            if rn.isdigit():
                race_number = int(rn)

            entries.append(
                rider_record(
                    name=f"{first} {last}",
                    category=category,
                    fastest_seconds=seconds,
                    race_number=race_number,
                )
            )

    riders = best_per_rider(entries)
    return build_event(
        event_id="sts-2025",
        event_name="Shred the Shires 2025",
        description="Best lap from STS 2025 overall timing (qualifying through finals)",
        riders=riders,
        default_categories=["Open", "Women"],
    )


def _name_key(first: str, last: str) -> tuple[str, str]:
    return first.strip().lower(), last.strip().lower()


def extract_sis_2025(orl_dir: Path) -> dict:
    folder = orl_dir / "SIS25_alltimes"
    women_names: set[tuple[str, str]] = set()

    # Collect women riders from womens_* files (times often missing in those CSVs)
    for csv_path in folder.glob("womens_*.csv"):
        for row in read_csv_rows(csv_path):
            first = row.get("Name", row.get("First name", "")).strip()
            last = row.get("Surname", row.get("Last name", "")).strip()
            if first and last and not (first.lower() == "alicia" and last.lower() == "hemmings"):
                women_names.add(_name_key(first, last))

    entries: list[dict] = []
    for csv_path in latest_csv_groups("*.csv", folder):
        for row in read_csv_rows(csv_path):
            first = row.get("Name", row.get("First name", "")).strip()
            last = row.get("Surname", row.get("Last name", "")).strip()
            if not first or not last:
                continue
            if first.lower() == "alicia" and last.lower() == "hemmings":
                continue

            time_raw = row.get(
                "Time",
                row.get("Finish Time", row.get("Fastest Lap", "")),
            )
            seconds = parse_time(time_raw)
            if seconds is None:
                continue

            category = "Women" if _name_key(first, last) in women_names else "Open"
            entries.append(
                {
                    **rider_record(
                        name=f"{first} {last}",
                        category=category,
                        fastest_seconds=seconds,
                    ),
                    "_asterisk": "*" in str(time_raw),
                }
            )

    riders = best_per_rider(entries)
    return build_event(
        event_id="sis-2025",
        event_name="Send It Surrey 2025",
        description="Best lap across all SIS 2025 races",
        riders=riders,
        default_categories=["Open", "Women"],
    )


def extract_all_orl_events(orl_dir: Path | None = None) -> list[dict]:
    orl_dir = orl_dir or DEFAULT_ORL_DIR
    if not orl_dir.is_dir():
        raise FileNotFoundError(f"ORL data folder not found: {orl_dir}")

    events: list[dict] = []
    for extractor in (extract_owa_2025, extract_sts_2025, extract_sis_2025):
        try:
            events.append(extractor(orl_dir))
        except FileNotFoundError as exc:
            print(f"Skipping {extractor.__name__}: {exc}")
    return events
