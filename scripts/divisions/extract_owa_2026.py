#!/usr/bin/env python3
"""Best laps from the OWAR 2026 public results feed.

Each rider keeps their fastest standard-track lap from seeding, heats,
quarters, semis, finals, and wild card. Mass-race totals, the team race,
and the chair race are different formats and are left out.

Legends raced a shorter track. Those times stay on the ranked HTML only
and are not added to the divisions visualizer.
"""

from __future__ import annotations

import html
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from extract_time_trials import write_event  # noqa: E402
from orl_common import build_event, format_time, parse_time, rider_record  # noqa: E402

HUB_ROOT = Path(__file__).resolve().parents[2]
API = "https://owar26.ad53app.com/api/public"
HTML_CAT = {
    "Open": "MALE",
    "Women": "FEMALE",
    "Groms": "GROM",
    "Legends": "LEGEND",
    "Wildcard": "WILDCARD",
}
CAT_PRIORITY = ("Women", "Groms", "Open", "Wildcard")


def fetch_json(path: str):
    with urllib.request.urlopen(API + path, timeout=60) as response:
        return json.load(response)


def session_kind(event: dict) -> str:
    blob = " ".join(
        str(event.get(key) or "")
        for key in ("tournament", "name", "stage", "level")
    ).lower()
    if "chair" in blob:
        return "chair"
    if "team" in blob:
        return "team"
    if "mass" in blob or "surfin" in blob:
        return "mass"
    if "legend" in blob:
        return "legend"
    if "women" in blob or "woman" in blob:
        return "women"
    if "grom" in blob:
        return "groms"
    if "wild" in blob:
        return "wildcard"
    return "open"


def kind_to_category(kind: str) -> str | None:
    return {
        "open": "Open",
        "women": "Women",
        "groms": "Groms",
        "wildcard": "Wildcard",
        "legend": "Legends",
    }.get(kind)


def parse_penalty(raw: str) -> float:
    text = (raw or "").strip()
    if not text.startswith("+"):
        return 0.0
    seconds = parse_time(text[1:])
    return seconds or 0.0


def rider_category(kinds: set[str]) -> str:
    present = {kind_to_category(kind) for kind in kinds}
    present.discard(None)
    for category in CAT_PRIORITY:
        if category in present:
            return category
    return "Open"


def format_delay(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.3f}"
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes}:{secs:06.3f}"


def collect_laps(events: list[dict], results: dict) -> list[dict]:
    laps: list[dict] = []
    for event in events:
        kind = session_kind(event)
        if kind in {"chair", "team", "mass"}:
            continue
        category = kind_to_category(kind)
        if category is None:
            continue
        for row in results.get(event["id"]) or []:
            name = (row.get("display_name") or row.get("name") or "").strip()
            if not name or name.lower().startswith(("winner", "runner")):
                continue
            athlete_id = row.get("athlete_id")
            bib = str(row.get("bib") or "").strip()
            penalty = parse_penalty(row.get("penalty") or "")
            raw_laps = row.get("laps") or []
            if raw_laps:
                for lap in raw_laps:
                    seconds = parse_time(lap.get("time"))
                    if seconds is None:
                        continue
                    laps.append(
                        {
                            "athlete_id": athlete_id,
                            "name": name,
                            "bib": bib,
                            "category": category,
                            "kind": kind,
                            "seconds": seconds,
                            "race": event["name"],
                            "lap_number": lap.get("lap_number"),
                            "penalty_seconds": 0.0,
                        }
                    )
            else:
                seconds = parse_time(row.get("time"))
                if seconds is None:
                    continue
                laps.append(
                    {
                        "athlete_id": athlete_id,
                        "name": name,
                        "bib": bib,
                        "category": category,
                        "kind": kind,
                        "seconds": seconds + penalty,
                        "race": event["name"],
                        "lap_number": None,
                        "penalty_seconds": penalty,
                    }
                )
    return laps


def best_by_rider(laps: list[dict], *, kinds: set[str] | None = None) -> list[dict]:
    chosen = [lap for lap in laps if kinds is None or lap["kind"] in kinds]
    grouped: dict[int, list[dict]] = {}
    for lap in chosen:
        grouped.setdefault(lap["athlete_id"], []).append(lap)

    best: list[dict] = []
    for athlete_id, rows in grouped.items():
        rows.sort(key=lambda lap: lap["seconds"])
        winner = rows[0]
        raced = {lap["kind"] for lap in rows}
        category = (
            "Legends" if kinds == {"legend"} else rider_category(raced)
        )
        bib = winner["bib"]
        race_number = int(bib) if bib.isdigit() else None
        record = rider_record(
            name=winner["name"],
            category=category,
            fastest_seconds=winner["seconds"],
            race_number=race_number,
        )
        record["best_race"] = winner["race"]
        record["penalty_seconds"] = winner["penalty_seconds"]
        record["athlete_id"] = athlete_id
        best.append(record)
    best.sort(key=lambda rider: rider["fastest_seconds"])
    return best


def html_table(riders: list[dict]) -> str:
    if not riders:
        return "<p>No times.</p>"
    fastest = riders[0]["fastest_seconds"]
    rows = [
        """
            <thead>
                <tr>
                    <th class="rank">Rank</th>
                    <th class="bib">Bib</th>
                    <th class="name">Name</th>
                    <th style="width: 10%;">Category</th>
                    <th class="time">Time</th>
                    <th class="percentage">% of Fastest</th>
                    <th style="width: 11%;">Gap from Above</th>
                    <th class="delay-from-fastest">Delay</th>
                    <th class="race">Set in</th>
                </tr>
            </thead>
            <tbody>
"""
    ]
    for rank, rider in enumerate(riders, start=1):
        percentage = (rider["fastest_seconds"] / fastest) * 100 if fastest else 0
        if rank == 1:
            gap = "—"
        else:
            gap = "+" + format_delay(
                rider["fastest_seconds"] - riders[rank - 2]["fastest_seconds"]
            )
        delay = rider["fastest_seconds"] - fastest
        badge = HTML_CAT.get(rider["category"], rider["category"])
        race = rider.get("best_race") or ""
        if rider.get("penalty_seconds"):
            race = f"{race} (includes +{format_delay(rider['penalty_seconds'])} penalty)"
        bib = rider["race_number"] if rider["race_number"] is not None else "—"
        rows.append(
            f"""
                <tr>
                    <td class="rank">{rank}</td>
                    <td class="bib">{bib}</td>
                    <td class="name">{html.escape(rider["name"])}</td>
                    <td><span class="category {html.escape(badge)}">{html.escape(badge)}</span></td>
                    <td class="time">{html.escape(rider["fastest_time"])}</td>
                    <td class="percentage">{percentage:.2f}%</td>
                    <td class="gap">{gap}</td>
                    <td class="delay-from-fastest">+{format_delay(delay)}</td>
                    <td class="race">{html.escape(race)}</td>
                </tr>
"""
        )
    rows.append("            </tbody>")
    return "<table>\n" + "".join(rows) + "\n        </table>"


def render_html(
    standard: list[dict],
    legends: list[dict],
    updated_at: str,
    links: dict | None = None,
) -> str:
    links = links or {
        "compare": "owa-2025-vs-2026.html",
        "progress": "owa-progression.html",
    }
    averages = []
    for label, category in (
        ("Overall", None),
        ("Male", "Open"),
        ("Grom", "Groms"),
        ("Wildcard", "Wildcard"),
        ("Female", "Women"),
    ):
        pool = (
            standard
            if category is None
            else [rider for rider in standard if rider["category"] == category]
        )
        if not pool:
            continue
        avg = sum(rider["fastest_seconds"] for rider in pool) / len(pool)
        averages.append(f"{label} {format_time(avg)} (n={len(pool)})")

    legend_note = ""
    if legends:
        legend_note = f"""
        <h2>Legends — short track</h2>
        <p class="note">These heats used a shorter course, so the times are not ranked against the standard-track list. {len(legends)} riders.</p>
        {html_table(legends)}
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OWA 2026 Best Times - Ranked</title>
    <style>
        @page {{
            size: A4 landscape;
            margin: 15mm;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            padding: 10px;
            width: 100%;
        }}
        .container {{
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            background: #1a1a1a;
            padding: 10px;
        }}
        h1 {{
            text-align: center;
            color: #D4AF37;
            margin-bottom: 10px;
            font-size: 1.5em;
        }}
        h2 {{
            text-align: center;
            color: #D4AF37;
            margin: 28px 0 8px;
            font-size: 1.2em;
        }}
        .stats, .note {{
            text-align: center;
            color: #D4AF37;
            margin-bottom: 10px;
            font-size: 0.9em;
        }}
        .note {{ color: #bbb; max-width: 52rem; margin-left: auto; margin-right: auto; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            font-size: 0.75em;
            table-layout: fixed;
        }}
        th {{
            background: #2a2a2a;
            color: #D4AF37;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            font-size: 0.85em;
            border-bottom: 2px solid #D4AF37;
            word-wrap: break-word;
        }}
        td {{
            padding: 5px 4px;
            border-bottom: 1px solid #333;
            color: #ddd;
            word-wrap: break-word;
            overflow: hidden;
        }}
        .rank {{
            font-weight: bold;
            color: #D4AF37;
            text-align: center;
            width: 5%;
            font-size: 0.85em;
        }}
        .bib {{ width: 5%; text-align: center; font-family: 'Courier New', monospace; }}
        .name {{ font-weight: 500; font-size: 0.85em; width: 16%; }}
        .time {{
            font-family: 'Courier New', monospace;
            font-weight: bold;
            font-size: 0.85em;
            color: #fff;
            width: 9%;
        }}
        .percentage {{
            font-family: 'Courier New', monospace;
            color: #D4AF37;
            font-size: 0.8em;
            font-weight: bold;
            text-align: right;
            width: 9%;
        }}
        .gap {{
            font-family: 'Courier New', monospace;
            color: #D4AF37;
            font-size: 0.8em;
            text-align: right;
            width: 9%;
        }}
        .delay-from-fastest {{
            font-family: 'Courier New', monospace;
            color: #888;
            font-size: 0.75em;
            width: 9%;
        }}
        .race {{ color: #aaa; font-size: 0.75em; width: 18%; }}
        .category {{
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 0.7em;
            font-weight: bold;
            display: inline-block;
        }}
        .category.MALE {{ background: #3a5a7a; color: #aaccee; }}
        .category.FEMALE {{ background: #7a3a5a; color: #eeaacc; }}
        .category.GROM {{ background: #5a7a3a; color: #cceeaa; }}
        .category.LEGEND {{ background: #7a5a3a; color: #eeddaa; }}
        .category.WILDCARD {{ background: #3a7a5a; color: #aaeedd; }}
        .nav {{
            text-align: center;
            margin-bottom: 14px;
        }}
        .nav a {{
            color: #D4AF37;
            margin: 0 0.6rem;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>OWA 2026 Best Times</h1>
        <p class="nav"><a href="{html.escape(links['compare'])}">2025 beside 2026</a><a href="{html.escape(links['progress'])}">Who got faster</a></p>
        <div class="stats">{len(standard)} riders ranked on the standard track</div>
        <p class="note">Best lap from seeding, heats, quarters, semis, finals, and wild card. Mass race, team race, and chair race are excluded. Source feed updated {html.escape(updated_at)}.</p>
        <p class="note">Average best lap — {html.escape(" · ".join(averages))}</p>
        {html_table(standard)}
        {legend_note}
    </div>
</body>
</html>
"""


def index_entry(event: dict) -> dict:
    return {
        "id": event["id"],
        "name": event["name"],
        "riderCount": len(event["riders"]),
        "categories": event["categories"],
        "defaultCategories": event["defaultCategories"],
        "countsByCategory": {
            cat: len(riders) for cat, riders in event["ridersByCategory"].items()
        },
    }


def upsert_events(index_path: Path, new_events: list[dict]) -> None:
    index = json.loads(index_path.read_text())
    new_ids = {event["id"] for event in new_events}
    kept = [event for event in index["events"] if event["id"] not in new_ids]
    index["events"] = [index_entry(event) for event in new_events] + kept
    index["defaultEventId"] = "owa-2026"
    index_path.write_text(json.dumps(index, indent=2) + "\n")


def main() -> None:
    events_payload = fetch_json("/events")
    events = events_payload["events"]
    ids = ",".join(event["id"] for event in events)
    results = fetch_json("/results?ids=" + urllib.parse.quote(ids))
    laps = collect_laps(events, results)

    standard_riders = best_by_rider(
        laps, kinds={"open", "women", "groms", "wildcard"}
    )
    legend_riders = best_by_rider(laps, kinds={"legend"})

    standard_event = build_event(
        event_id="owa-2026",
        event_name="Onewheel Algarve 2026",
        description=(
            "Best standard-track lap from OWAR 2026 seeding, heats, quarters, "
            "semis, finals, and wild card. Mass race, team race, and chair race excluded."
        ),
        riders=standard_riders,
        default_categories=["Open", "Women", "Groms", "Wildcard"],
    )
    out_dir = HUB_ROOT / "data" / "divisions"
    site_public = HUB_ROOT / "site" / "public" / "data" / "divisions"
    out_dir.mkdir(parents=True, exist_ok=True)
    site_public.mkdir(parents=True, exist_ok=True)
    write_event(standard_event, out_dir, site_public)

    for index_path in (out_dir / "events.json", site_public / "events.json"):
        upsert_events(index_path, [standard_event])

    updated = events_payload.get("updatedAt") or ""
    public_page = render_html(standard_riders, legend_riders, updated)
    local_page = render_html(
        standard_riders,
        legend_riders,
        updated,
        links={
            "compare": "owa_2025_vs_2026.html",
            "progress": "owa_progression.html",
        },
    )
    html_paths = [
        (HUB_ROOT / "site" / "public" / "owa-2026-best-times.html", public_page),
        (
            HUB_ROOT.parent
            / "ORL_tables"
            / "old_initial_analysis_stuff"
            / "owa_2026_best_times_ranked.html",
            local_page,
        ),
    ]
    for path, page in html_paths:
        path.write_text(page)
        print(f"HTML -> {path}")

    print(f"\nStandard riders: {len(standard_riders)}")
    for rider in standard_riders[:8]:
        print(
            f"  {rider['rank']:2} {rider['race_number']} {rider['name']:24} "
            f"{rider['fastest_time']}  {rider['category']:10} {rider['best_race']}"
        )
    print("…")
    for rider in standard_riders[-3:]:
        print(
            f"  {rider['rank']:2} {rider['race_number']} {rider['name']:24} "
            f"{rider['fastest_time']}  {rider['category']:10} {rider['best_race']}"
        )
    print(f"\nLegends riders: {len(legend_riders)}")
    for rider in legend_riders:
        print(f"  {rider['rank']:2} {rider['race_number']} {rider['name']:24} {rider['fastest_time']}")

    counts: dict[str, int] = {}
    for rider in standard_riders:
        counts[rider["category"]] = counts.get(rider["category"], 0) + 1
    print("Categories", counts)
    penalized = [r for r in standard_riders if r.get("penalty_seconds")]
    print("Best lap includes a penalty:", [(r["name"], r["best_race"]) for r in penalized] or "none")


if __name__ == "__main__":
    main()
