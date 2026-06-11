#!/usr/bin/env python3
"""Verify Season 1 PDF results parse all riders the parser can read from each event."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).parent))
import build_master_data as b

SOURCE = b.SOURCE
PDF = SOURCE / "Season 1 - 2023/EOL Rankings 2023.pdf"
SWISS_XLSX = SOURCE / "Season 1 - 2023/2 - Swiss Onewheel Race/Swiss Race Ranking.xlsx"

S1_PDF_EVENTS = (
    ("s1-gattinara-2023", 0, {"open": 50}),
    ("s1-swiss-2023", 2, {"open": 29}),  # PDF page 1; ranks 30+ on page 2 are corrupted
    ("s1-fth-2023", 4, {"open": 50}),
)


def _parsed_max_by_category(block: str) -> dict[str, int]:
    rows = b._parse_dual_results_page(block, "x", "")
    out: dict[str, int] = {}
    for cat in ("open", "female"):
        pos = [int(r["position"]) for r in rows if r["category"] == cat]
        out[cat] = max(pos) if pos else 0
    return out


def main() -> int:
    if not PDF.exists():
        print(f"Missing PDF: {PDF}")
        return 1

    reader = PdfReader(str(PDF))
    pages = [p.extract_text() or "" for p in reader.pages]
    errors: list[str] = []

    print("=== S1 PDF parse coverage ===\n")
    for eid, page_idx, expected in S1_PDF_EVENTS:
        block = b._collect_event_pdf_pages(pages, page_idx)
        parsed_max = _parsed_max_by_category(block)
        for cat, exp in expected.items():
            got = parsed_max.get(cat, 0)
            ok = got >= exp
            status = "OK" if ok else "FAIL"
            print(f"  {status} {eid} {cat}: expected max rank >={exp}, parsed max {got}")
            if not ok:
                errors.append(f"{eid} {cat}: parsed max {got} < expected {exp}")

    if SWISS_XLSX.exists():
        men = pd.read_excel(SWISS_XLSX, sheet_name="Ranking Men", header=None)
        women = pd.read_excel(SWISS_XLSX, sheet_name="Ranking Women", header=None)
        print(f"\n  Swiss xlsx: {len(men)} men, {len(women)} women (finishing order supplement)")
        if len(men) < 29:
            errors.append(f"Swiss xlsx men rows {len(men)} < 29")

    er_path = b.OUT / "event_results.csv"
    if er_path.exists():
        er = pd.read_csv(er_path)
        print("\n=== Built CSV vs fresh PDF parse ===\n")
        for eid, page_idx, expected in S1_PDF_EVENTS:
            block = b._collect_event_pdf_pages(pages, page_idx)
            fresh = _parsed_max_by_category(block)
            sub = er[(er["event_id"] == eid) & er["position"].notna()]
            for cat, exp in expected.items():
                csub = sub[sub["category"] == cat]
                csv_max = int(csub["position"].max()) if len(csub) else 0
                fresh_max = fresh.get(cat, 0)
                # CSV may dedupe same rider at two ranks; max position should still reach exp
                ok = csv_max >= exp
                status = "OK" if ok else "FAIL"
                print(
                    f"  {status} {eid} {cat}: CSV max pos {csv_max}, "
                    f"fresh parse max {fresh_max}, need >={exp}"
                )
                if not ok:
                    errors.append(f"{eid} {cat} CSV max {csv_max} < expected {exp}")

        # Swiss: xlsx should add men through ~31
        if SWISS_XLSX.exists():
            swiss_open = er[(er["event_id"] == "s1-swiss-2023") & (er["category"] == "open")]
            csv_max = int(swiss_open["position"].max()) if len(swiss_open) else 0
            men_n = len(pd.read_excel(SWISS_XLSX, sheet_name="Ranking Men", header=None))
            ok = csv_max >= men_n - 1
            status = "OK" if ok else "FAIL"
            print(f"  {status} s1-swiss-2023 open: CSV max {csv_max}, xlsx men {men_n}")
            if not ok:
                errors.append(f"Swiss CSV max {csv_max} < xlsx men {men_n}")

    er_path = b.OUT / "event_results.csv"
    if er_path.exists():
        er = pd.read_csv(er_path)
        s1_open = er[(er["season"] == 1) & (er["category"] == "open")]
        n = s1_open["rider_id"].nunique()
        print(f"\n=== S1 open rider count ===\n  unique riders: {n}")
        print("  PDF running-totals page lists 104 men (includes riders with season")
        print("  points but no per-event row in our extract, e.g. Darren Stevenson).")
        if n > 104:
            errors.append(f"S1 open rider count {n} > 104 (likely duplicate rider profiles)")
        legacy = {"gerard-rincon-23", "christofer-filla-75"}
        found = legacy & set(s1_open["rider_id"])
        if found:
            errors.append(f"S1 still has legacy duplicate rider_ids: {sorted(found)}")

    print()
    if errors:
        print("FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASSED — S1 PDF events include all parseable result rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
