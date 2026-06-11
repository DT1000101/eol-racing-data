#!/usr/bin/env python3
"""Audit multi-source event data: PDF parse vs CSV vs overrides vs standings."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd
from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_master_data as b
from hub_paths import DATA, SEASONS

FINALS = "s2-owar-finals-2024"


def _owar_pdf_lines() -> list[tuple[str, int, str]]:
    """(category, trial_position, name) from OWAR trial PDF — all lines matching current regex."""
    if not b.OWAR_FINALS_PDF.exists():
        return []
    reader = PdfReader(str(b.OWAR_FINALS_PDF))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    out: list[tuple[str, int, str]] = []
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
        name = b._title_name(m.group(2).strip())
        if "n.n." in name.lower() or not b.is_name(name):
            continue
        out.append((category, pos, name))
    return out


def _owar_pdf_lines_loose() -> list[tuple[str, int, str, str]]:
    """Same PDF but also capture lines that look like results but fail strict regex."""
    if not b.OWAR_FINALS_PDF.exists():
        return []
    reader = PdfReader(str(b.OWAR_FINALS_PDF))
    text = "\n".join(p.extract_text() or "" for p in reader.pages)
    strict = {(c, p, n) for c, p, n in _owar_pdf_lines()}
    loose: list[tuple[str, int, str, str]] = []
    category = "open"
    for line in text.splitlines():
        low = line.strip().lower()
        if low == "male":
            category = "open"
            continue
        if low == "female":
            category = "female"
            continue
        if not re.match(r"^\s*\d+\.\s+\d+\s+", line):
            continue
        m = re.match(
            r"^\s*(\d+)\.\s+\d+\s+(.+?)\s+(?:[A-Z]{3}|\d{2,4})\s+\d{2}:\d{2}",
            line,
        )
        if m:
            pos = int(m.group(1))
            name = b._title_name(m.group(2).strip())
            if (category, pos, name) not in strict:
                loose.append((category, pos, name, "strict-parse-mismatch"))
        else:
            loose.append((category, 0, line.strip()[:80], "regex-fail"))
    return loose


def audit_owar_finals(er: pd.DataFrame) -> list[str]:
    issues: list[str] = []
    pdf_rows = _owar_pdf_lines()
    finals = er[er["event_id"] == FINALS].copy()
    approved = b.load_approved()
    reg = b.Registry(approved)
    pdf_open_by_rid: dict[str, int] = {}
    for cat, pos, name in pdf_rows:
        if cat != "open":
            continue
        rid = reg.resolve(name)
        b.apply_rider_id_aliases([{"rider_id": rid}])
        rid = b.normalize_rider_id(rid)
        pdf_open_by_rid[rid] = pos

    csv_open = finals[finals["category"] == "open"]
    csv_open_ids = set(csv_open["rider_id"])
    for rid, trial_pos in pdf_open_by_rid.items():
        if rid not in csv_open_ids:
            issues.append(
                f"OWAR finals open: PDF trial P{trial_pos} "
                f"{reg.canonical.get(rid, rid)!r} missing from event_results.csv"
            )

    race = pd.read_csv(DATA / "finals_race_results.csv") if (DATA / "finals_race_results.csv").exists() else pd.DataFrame()
    ovr = pd.read_csv(DATA / "podium_overrides.csv")

    # Female: trial PDF rows should be replaced by finals_race_results.csv
    race_female = race[(race["event_id"] == FINALS) & (race["category"] == "female")] if len(race) else pd.DataFrame()
    if len(race_female):
        race_ids_f = set(race_female["rider_id"])
        csv_female = finals[finals["category"] == "female"]
        csv_ids_f = set(csv_female["rider_id"])
        missing = race_ids_f - csv_ids_f
        extra_pdf = [
            str(r["source_file"])
            for _, r in csv_female.iterrows()
            if b.OWAR_FINALS_PDF_MARKER in str(r.get("source_file") or "")
        ]
        if missing:
            issues.append(f"OWAR finals female: race CSV riders missing from event_results: {sorted(missing)}")
        if extra_pdf:
            issues.append(
                f"OWAR finals female: {len(extra_pdf)} rows still sourced from trial PDF "
                "(should all be finals_race_results.csv)"
            )

    # Podium overrides must exist in event_results
    for _, o in ovr[ovr["event_id"] == FINALS].iterrows():
        sub = finals[
            (finals["rider_id"] == o["rider_id"]) & (finals["category"] == o["category"])
        ]
        if sub.empty:
            issues.append(
                f"OWAR finals: podium override {o['rider_id']} {o['category']} P{o['position']} "
                "missing from event_results"
            )
        elif int(sub.iloc[0]["position"]) != int(o["position"]):
            issues.append(
                f"OWAR finals: {o['rider_id']} {o['category']} override P{o['position']} "
                f"but CSV has P{int(sub.iloc[0]['position'])}"
            )

    loose = _owar_pdf_lines_loose()
    real_loose = [
        (cat, pos, txt, reason)
        for cat, pos, txt, reason in loose
        if reason == "regex-fail" and "N.N." not in txt.upper()
    ]
    if real_loose:
        for cat, pos, txt, reason in real_loose[:10]:
            issues.append(f"OWAR PDF unparsed line ({cat}): {txt!r}")
        if len(real_loose) > 10:
            issues.append(f"OWAR PDF: {len(real_loose) - 10} more unparsed non-N.N. lines…")

    return issues


def audit_workbook_vs_csv(er: pd.DataFrame) -> list[str]:
    """Re-parse workbooks/PDFs and compare keys to committed event_results.csv."""
    issues: list[str] = []
    approved = b.load_approved()
    reg = b.Registry(approved)
    all_events: list[dict] = []
    all_standings: list[dict] = []
    _, s1e = b.parse_season1()
    all_events.extend(s1e)
    for path, season in [
        (b.SOURCE / "season 2 - 2024/Rankings/EOL 2023_2024 Overall Rankings.xlsx", 2),
        (b.SOURCE / "Season 3 - 2025/EOL 2025 Overall Rankings.xlsx", 3),
        (b.SOURCE / "Season 4 - 2026/EOL 2026 Overall Rankings.xlsx", 4),
    ]:
        if path.exists():
            st, ev = b.parse_overall_xlsx(path, season)
            all_events.extend(ev)
            all_standings.extend(st)
    all_events.extend(b.parse_s2_owar_finals())
    all_events = [
        e for e in all_events
        if e["category"] != "groms" or e["season"] >= b.GROMS_FIRST_SEASON
    ]

    event_rows: list[dict] = []
    for ev in all_events:
        rid = reg.resolve(ev["name_raw"])
        event_rows.append({
            "event_id": ev["event_id"],
            "rider_id": rid,
            "category": ev["category"],
            "position": ev.get("position"),
            "points": ev.get("points"),
            "source_file": ev.get("source_file"),
            "canonical_name": reg.canonical[rid],
        })
    b.apply_rider_id_aliases(event_rows)
    b.collapse_suffix_duplicate_rider_ids(reg, event_rows)
    best: dict[tuple, dict] = {}
    for row in event_rows:
        key = (row["event_id"], row["rider_id"], row["category"])
        prev = best.get(key)
        pos = row["position"] or 9999
        if not prev or pos < (prev["position"] or 9999):
            best[key] = row
    event_rows = list(best.values())
    b.apply_finals_race_results(event_rows, reg)
    b.apply_podium_overrides(event_rows, reg)
    fresh_keys = {(r["event_id"], r["rider_id"], r["category"]) for r in event_rows}
    csv_keys = set(zip(er["event_id"], er["rider_id"], er["category"]))
    missing = fresh_keys - csv_keys
    extra = csv_keys - fresh_keys
    if missing:
        issues.append(f"Fresh parse missing from CSV ({len(missing)}): {sorted(missing)[:5]}…")
    if extra:
        issues.append(f"CSV has extra rows vs fresh parse ({len(extra)}): {sorted(extra)[:5]}…")

    finals = "s2-owar-finals-2024"
    for st in all_standings:
        if st["season"] != 2:
            continue
        evpts = st.get("events", {})
        if finals not in evpts:
            continue
        rid = b.normalize_rider_id(reg.resolve(st["name_raw"]))
        cat = st["category"]
        if (finals, rid, cat) not in csv_keys:
            issues.append(
                f"S2 workbook has {finals} for {st['name_raw']} ({cat}) but no event_results row"
            )
    return issues


def audit_duplicate_sources(er: pd.DataFrame) -> list[str]:
    issues: list[str] = []
    for (eid, rid, cat), grp in er.groupby(["event_id", "rider_id", "category"]):
        if len(grp) > 1:
            issues.append(
                f"Duplicate event_results: {eid} / {rid} / {cat} ({len(grp)} rows)"
            )
    return issues


def audit_points_only_groms(er: pd.DataFrame) -> list[str]:
    """2025 groms: points without position should still appear on profiles."""
    issues: list[str] = []
    groms = er[(er["season"] == 3) & (er["category"] == "groms")]
    pts_only = groms[groms["position"].isna() & groms["points"].notna() & (groms["points"] > 0)]
    no_pos_no_pts = groms[groms["position"].isna() & (groms["points"].isna() | (groms["points"] <= 0))]
    if len(no_pos_no_pts):
        issues.append(f"2025 groms: {len(no_pos_no_pts)} rows with neither position nor points")
    # Henry Bisping check
    hb = groms[groms["rider_id"] == "henry-bisping"]
    if len(hb) == 0:
        issues.append("2025 groms: henry-bisping missing entirely")
    elif hb["points"].isna().all():
        issues.append("2025 groms: henry-bisping has no points")
    return issues


def audit_duplicate_positions(er: pd.DataFrame) -> list[str]:
    issues: list[str] = []
    for (eid, cat, pos), grp in er.groupby(["event_id", "category", "position"]):
        if pd.isna(pos) or pos <= 0:
            continue
        if len(grp) > 1:
            names = list(grp["canonical_name"])
            issues.append(
                f"Duplicate position {eid} / {cat} P{int(pos)}: {names}"
            )
    return issues


def audit_podium_vs_race_overlap() -> list[str]:
    issues: list[str] = []
    race = pd.read_csv(DATA / "finals_race_results.csv")
    ovr = pd.read_csv(DATA / "podium_overrides.csv")
    for cat in ("open", "female"):
        rsub = race[(race["event_id"] == FINALS) & (race["category"] == cat)]
        osub = ovr[(ovr["event_id"] == FINALS) & (ovr["category"] == cat)]
        for pos in (1, 2, 3):
            rr = rsub[rsub["position"] == pos]
            oo = osub[osub["position"] == pos]
            if len(rr) and len(oo):
                if rr.iloc[0]["rider_id"] != oo.iloc[0]["rider_id"]:
                    issues.append(
                        f"Podium vs race mismatch {cat} P{pos}: "
                        f"race={rr.iloc[0]['rider_id']} override={oo.iloc[0]['rider_id']}"
                    )
            elif len(oo) and not len(rsub) and cat == "open":
                pass  # open race results CSV not populated yet — expected
            elif len(oo) and cat == "female" and len(rr) == 0:
                issues.append(f"Female P{pos} in podium_overrides but not in finals_race_results")
    return issues


def main() -> int:
    er = pd.read_csv(DATA / "event_results.csv")
    standings = pd.read_csv(DATA / "season_standings.csv")
    events = pd.read_csv(DATA / "events.csv")

    all_issues: list[str] = []
    all_issues.extend(audit_workbook_vs_csv(er))
    all_issues.extend(audit_owar_finals(er))
    all_issues.extend(audit_duplicate_sources(er))
    all_issues.extend(audit_duplicate_positions(er))
    all_issues.extend(audit_points_only_groms(er))
    all_issues.extend(audit_podium_vs_race_overlap())

    # Per-event: count PDF-sourced vs workbook-sourced
    print("=== Source mix by event (event_results.csv) ===\n")
    by_event: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for _, r in er.iterrows():
        src = str(r.get("source_file") or "unknown")
        if "pdf" in src.lower() or "OneWheel Final" in src:
            bucket = "pdf"
        elif "podium_overrides" in src:
            bucket = "podium_override"
        elif "finals_race_results" in src:
            bucket = "finals_race"
        elif "xlsx" in src.lower() or "Rankings" in src:
            bucket = "workbook"
        else:
            bucket = "other"
        by_event[r["event_id"]][bucket] += 1

    for eid in sorted(by_event, key=lambda x: events[events["event_id"] == x]["sort_key"].iloc[0] if len(events[events["event_id"] == x]) else 0):
        ev_name = events[events["event_id"] == eid]["name"].iloc[0] if len(events[events["event_id"] == eid]) else eid
        mix = dict(by_event[eid])
        print(f"  {eid}: {mix}  ({ev_name})")

    print("\n=== OWAR finals row counts ===")
    f = er[er["event_id"] == FINALS]
    for cat in ("open", "female"):
        sub = f[f["category"] == cat]
        print(f"  {cat}: {len(sub)} riders")
        src_counts = sub["source_file"].value_counts().to_dict()
        for s, n in src_counts.items():
            print(f"    {n} from {s}")

    print("\n=== Audit findings ===\n")
    if not all_issues:
        print("No issues found.")
        return 0
    for i in all_issues:
        print(f"  - {i}")
    print(f"\nTotal: {len(all_issues)} issue(s)")
    return 1 if all_issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
