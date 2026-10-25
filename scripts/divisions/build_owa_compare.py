#!/usr/bin/env python3
"""Side-by-side and year-on-year pages for OWA 2025 and 2026 best laps.

Also rewrites the 2026 ranked table (no class bands) from the saved JSON.
"""

from __future__ import annotations

import html
import json
import re
import unicodedata
from pathlib import Path

from extract_owa_2026 import render_html
from orl_common import format_time

HUB_ROOT = Path(__file__).resolve().parents[2]
DATA = HUB_ROOT / "data" / "divisions"
LOCAL = HUB_ROOT.parent / "ORL_tables" / "old_initial_analysis_stuff"
PUBLIC = HUB_ROOT / "site" / "public"

# Folded name -> canonical key. Only spelling variants of the same rider.
ALIASES = {
    "daniel turner": "dan turner",
    "dan turner": "dan turner",
    "henry ld": "henry livingstone dunn",
    "henry dunn": "henry livingstone dunn",
    "henry livingstone dunn": "henry livingstone dunn",
    "zack mcfarlane": "zack mcfarlane",
    "radim klaska": "radim klaska",
    "radom klaska": "radim klaska",
    "fabio costa": "fabio costa",
    "florent audit": "florent audrit",
    "florent audrit": "florent audrit",
    "chantelle warner wells": "chantelle warner wells",
    "qurine posno": "quirine posno",
    "quirine posno": "quirine posno",
    "jonas bukrinski andersen": "jonas andersen",
    "jonas andersen": "jonas andersen",
    "wickor sowinski": "wiktor sowinski",
    "wiktor sowinski": "wiktor sowinski",
    "si oppenheimer": "simon oppenheimer",
    "simon oppenheimer": "simon oppenheimer",
    "adrian kruger": "adrian krige",
    "adrian krige": "adrian krige",
    "lars lot trip": "lars lottrup",
    "lars lottrup": "lars lottrup",
}

DISPLAY = {
    "dan turner": "Dan Turner",
    "henry livingstone dunn": "Henry Livingstone Dunn",
    "zack mcfarlane": "Zack McFarlane",
    "radim klaska": "Radim Klaška",
    "fabio costa": "Fabio Costa",
    "florent audrit": "Florent Audrit",
    "chantelle warner wells": "Chantelle Warner-Wells",
    "quirine posno": "Quirine Posno",
    "jonas andersen": "Jonas Andersen",
    "wiktor sowinski": "Wiktor Sowinski",
    "simon oppenheimer": "Simon Oppenheimer",
    "adrian krige": "Adrian Krige",
    "lars lottrup": "Lars Lottrup",
    "sam o connell": "Sam O'Connell",
}


def fold(name: str) -> str:
    text = name.replace("’", "'").replace("‘", "'").replace("`", "'")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def canon(name: str) -> str:
    folded = fold(name)
    return ALIASES.get(folded, folded)


def load_riders(path: Path) -> list[dict]:
    return json.loads(path.read_text())["riders"]


def best_by_person(riders: list[dict]) -> dict[str, dict]:
    chosen: dict[str, dict] = {}
    for rider in riders:
        key = canon(rider["name"])
        current = chosen.get(key)
        if current is None or rider["fastest_seconds"] < current["fastest_seconds"]:
            chosen[key] = rider
    return chosen


def display_name(key: str, *riders: dict | None) -> str:
    if key in DISPLAY:
        return DISPLAY[key]
    for rider in riders:
        if rider:
            return rider["name"]
    return key


def signed_seconds(delta: float) -> str:
    sign = "−" if delta < 0 else "+" if delta > 0 else ""
    minutes = int(abs(delta) // 60)
    seconds = abs(delta) % 60
    if minutes:
        body = f"{minutes}:{seconds:06.3f}"
    else:
        body = f"{seconds:.3f}s"
    return f"{sign}{body}"


def signed_pct(pct: float) -> str:
    sign = "−" if pct < 0 else "+" if pct > 0 else ""
    return f"{sign}{abs(pct):.1f}%"


def tone(delta: float) -> str:
    if delta < -0.0005:
        return "faster"
    if delta > 0.0005:
        return "slower"
    return "same"


PAGE_CSS = """
:root {
  --bg: #101114;
  --card: #181b21;
  --line: #2c313a;
  --text: #f3f4f6;
  --muted: #9aa3af;
  --gold: #e0b84a;
  --gold-dim: #8d7430;
  --faster: #7dcea0;
  --slower: #e08b8b;
  --same: #9aa3af;
  --row: #14171c;
  --row-alt: #1b1f26;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "DM Sans", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.4;
}
a { color: var(--gold); text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 1.5rem 1.1rem 3rem; }
.wrap--wide { max-width: 1280px; }
header.top { margin-bottom: 1.25rem; }
.eyebrow {
  margin: 0 0 0.25rem;
  color: var(--gold);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 700;
}
h1 { margin: 0 0 0.35rem; font-size: 1.85rem; letter-spacing: -0.03em; }
.lede { margin: 0 0 0.8rem; color: var(--muted); max-width: 40rem; }
nav.pages { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0.2rem 0 0; }
nav.pages a {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  color: var(--text);
  font-size: 0.85rem;
}
nav.pages a[aria-current="page"] {
  background: var(--gold);
  border-color: var(--gold);
  color: #1a1404;
  font-weight: 700;
}
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  align-items: start;
}
@media (max-width: 860px) {
  .split { grid-template-columns: 1fr; }
}
.panel {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.year {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  background: #141820;
  border-bottom: 1px solid var(--line);
}
.year h2 { margin: 0; font-size: 1.15rem; }
.year p { margin: 0; color: var(--muted); font-size: 0.8rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.42rem 0.65rem; text-align: left; }
thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #20242c;
  color: var(--muted);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.split thead th { top: 49px; }
#progress { overflow: visible; }
#progress thead th { top: 0; background: #20242c; }
.year-best { font-weight: 700; color: #fff; }
.na { color: var(--muted); }
th.progress, td.progress {
  border-left: 3px solid var(--gold);
  padding-left: 0.85rem;
}
tbody tr:nth-child(odd) { background: var(--row); }
tbody tr:nth-child(even) { background: var(--row-alt); }
.rank { color: var(--gold); font-variant-numeric: tabular-nums; font-weight: 700; width: 2.4rem; }
.time, .num { font-variant-numeric: tabular-nums; font-family: "DM Sans", ui-monospace, monospace; }
.name { font-weight: 600; }
.gap { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 0.85rem; }
.cat {
  display: inline-block;
  margin-left: 0.35rem;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 500;
}
.kpis { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 0 0 1rem; }
.kpi {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.7rem 0.85rem;
  min-width: 8.5rem;
}
.kpi b { display: block; font-size: 1.25rem; letter-spacing: -0.03em; }
.kpi span { color: var(--muted); font-size: 0.75rem; }
.tools { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin-bottom: 0.7rem; }
input[type="search"] {
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
  font: inherit;
  min-width: 14rem;
}
th button {
  all: unset;
  cursor: pointer;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}
th button:hover { color: var(--text); }
.faster { color: var(--faster); font-weight: 700; }
.slower { color: var(--slower); font-weight: 700; }
.same { color: var(--same); }
.section { margin-top: 1.6rem; }
.section h2 { margin: 0 0 0.35rem; font-size: 1.05rem; }
.section .hint { margin: 0 0 0.6rem; color: var(--muted); font-size: 0.85rem; }
.note { margin-top: 1.2rem; color: var(--muted); font-size: 0.8rem; }
"""


def nav(current: str, links: dict[str, str]) -> str:
    items = [
        ("ranked", "2026 ranking"),
        ("compare", "2025 beside 2026"),
        ("progress", "Who got faster"),
    ]
    parts = []
    for key, label in items:
        current_attr = ' aria-current="page"' if key == current else ""
        parts.append(
            f'<a href="{html.escape(links[key])}"{current_attr}>{label}</a>'
        )
    return f'<nav class="pages">{"".join(parts)}</nav>'


def shell(title: str, body: str, wide: bool = False) -> str:
    width = " wrap--wide" if wide else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap" rel="stylesheet">
  <style>{PAGE_CSS}</style>
</head>
<body>
  <div class="wrap{width}">
    {body}
  </div>
</body>
</html>
"""


def year_table(riders: list[dict], year: str) -> str:
    fastest = riders[0]["fastest_seconds"] if riders else 0
    rows = []
    for rider in riders:
        gap = rider["fastest_seconds"] - fastest
        gap_text = "—" if gap < 0.0005 else "+" + (
            format_time(gap) if gap >= 60 else f"{gap:.3f}"
        )
        rows.append(
            f"""<tr>
              <td class="rank">{rider['rank']}</td>
              <td class="name">{html.escape(rider['name'])}<span class="cat">{html.escape(rider['category'])}</span></td>
              <td class="time">{html.escape(rider['fastest_time'])}</td>
              <td class="gap">{gap_text}</td>
            </tr>"""
        )
    fastest_label = riders[0]["fastest_time"] if riders else "—"
    return f"""
    <section class="panel" aria-label="{year}">
      <div class="year">
        <h2>{year}</h2>
        <p>{len(riders)} riders · fastest {html.escape(fastest_label)}</p>
      </div>
      <table>
        <thead>
          <tr><th>Rank</th><th>Rider</th><th>Best lap</th><th>Off leader</th></tr>
        </thead>
        <tbody>
          {''.join(rows)}
        </tbody>
      </table>
    </section>
    """


def compare_page(y2025: list[dict], y2026: list[dict], links: dict[str, str]) -> str:
    body = f"""
    <header class="top">
      <p class="eyebrow">Onewheel Algarve</p>
      <h1>2025 and 2026</h1>
      <p class="lede">Each rider’s best lap. 2025 is on the left, 2026 on the right. Off leader is the gap to that year’s fastest lap.</p>
      {nav("compare", links)}
    </header>
    <div class="split">
      {year_table(y2025, "2025")}
      {year_table(y2026, "2026")}
    </div>
    <p class="note">2026 uses the standard track only. Mass race, team race, and chair race are excluded. Legends in 2026 raced a shorter course, so those times are not in the right-hand list.</p>
    """
    return shell("OWA 2025 and 2026", body, wide=True)


def year_cell(time: str | None, is_best: bool) -> str:
    if time is None:
        return '<td class="num na">n/a</td>'
    kind = "num year-best" if is_best else "num"
    return f'<td class="{kind}">{html.escape(time)}</td>'


def progress_rows(riders: list[dict]) -> str:
    rows = []
    for item in riders:
        delta = item["delta"]
        if delta is None:
            change = '<td class="num na progress">n/a</td>'
            pct = '<td class="num na">n/a</td>'
            left_rank = "n/a" if item["rank_2025"] is None else str(item["rank_2025"])
            right_rank = "n/a" if item["rank_2026"] is None else str(item["rank_2026"])
            rank = f'<td class="num na">{left_rank} → {right_rank}</td>'
            delta_attr = ""
            pct_attr = ""
            rank_attr = ""
        else:
            kind = tone(delta)
            rank_2025 = item["rank_2025"]
            rank_2026 = item["rank_2026"]
            rank_delta = rank_2025 - rank_2026
            rank_kind = "faster" if rank_delta > 0 else "slower" if rank_delta < 0 else "same"
            change = f'<td class="num progress {kind}">{signed_seconds(delta)}</td>'
            pct = f'<td class="num {kind}">{signed_pct(item["pct"])}</td>'
            rank = f'<td class="num {rank_kind}">{rank_2025} → {rank_2026}</td>'
            delta_attr = str(delta)
            pct_attr = str(item["pct"])
            rank_attr = str(rank_2026)
        sec_2026 = "" if item["sec_2026"] is None else item["sec_2026"]
        sec_2025 = "" if item["sec_2025"] is None else item["sec_2025"]
        rows.append(
            f"""<tr data-name="{html.escape(fold(item['name']))}" data-best="{item['best']}" data-y2026="{sec_2026}" data-y2025="{sec_2025}" data-delta="{delta_attr}" data-pct="{pct_attr}" data-rank="{rank_attr}">
              <td class="name">{html.escape(item['name'])}</td>
              <td class="num year-best">{html.escape(item['best_time'])}</td>
              {year_cell(item['time_2026'], False)}
              {year_cell(item['time_2025'], False)}
              {change}
              {pct}
              {rank}
            </tr>"""
        )
    return "\n".join(rows)


def progress_page(riders: list[dict], links: dict[str, str]) -> str:
    paired = [item for item in riders if item["delta"] is not None]
    faster = sum(1 for item in paired if item["delta"] < -0.0005)
    slower = sum(1 for item in paired if item["delta"] > 0.0005)
    avg = sum(item["delta"] for item in paired) / len(paired) if paired else 0
    ordered = sorted(item["delta"] for item in paired)
    mid = len(ordered) // 2
    median = ordered[mid] if len(ordered) % 2 else (
        (ordered[mid - 1] + ordered[mid]) / 2 if ordered else 0
    )
    body = f"""
    <header class="top">
      <p class="eyebrow">Onewheel Algarve</p>
      <h1>How the lap changed</h1>
      <p class="lede">Sorted by each rider’s fastest lap from either year. To the right of the line, change is the 2026 lap minus the 2025 lap. A negative number is faster. n/a means they have no lap that year.</p>
      {nav("progress", links)}
    </header>
    <div class="kpis">
      <div class="kpi"><b>{len(riders)}</b><span>riders</span></div>
      <div class="kpi"><b>{len(paired)}</b><span>rode both years</span></div>
      <div class="kpi"><b class="faster">{faster}</b><span>faster in 2026</span></div>
      <div class="kpi"><b class="slower">{slower}</b><span>slower in 2026</span></div>
      <div class="kpi"><b class="{tone(median)}">{signed_seconds(median)}</b><span>median change</span></div>
      <div class="kpi"><b class="{tone(avg)}">{signed_seconds(avg)}</b><span>average change</span></div>
    </div>
    <div class="tools">
      <input id="find" type="search" placeholder="Find a rider" aria-label="Find a rider">
    </div>
    <div class="panel" id="progress">
      <table id="both">
        <thead>
          <tr>
            <th><button type="button" data-sort="name">Rider</button></th>
            <th><button type="button" data-sort="best">Best time</button></th>
            <th><button type="button" data-sort="y2026">2026</button></th>
            <th><button type="button" data-sort="y2025">2025</button></th>
            <th class="progress"><button type="button" data-sort="delta">Change</button></th>
            <th><button type="button" data-sort="pct">%</button></th>
            <th><button type="button" data-sort="rank">Rank</button></th>
          </tr>
        </thead>
        <tbody>
          {progress_rows(riders)}
        </tbody>
      </table>
    </div>
    <p class="note">Spelling differences are treated as the same rider, including Dan Turner / Daniel Turner, Henry Ld / Henry Livingstone Dunn, Florent Audrit / Florent Audit, and Quirine / Qurine Posno. 2026 legends short-track times are not used here. Rank is the place in that year’s full best-lap list. Green rank means a higher place in 2026.</p>
    <script>
      const table = document.querySelector("#both tbody");
      const find = document.querySelector("#find");
      let sortKey = "best";
      let sortDir = 1;
      function rows() {{ return [...table.querySelectorAll("tr")]; }}
      function valueOf(row) {{
        if (sortKey === "name") return row.dataset.name;
        const raw = row.dataset[sortKey];
        if (raw === undefined || raw === "") return null;
        const number = Number(raw);
        return Number.isFinite(number) ? number : null;
      }}
      function applySort() {{
        const sorted = rows().sort((a, b) => {{
          const av = valueOf(a);
          const bv = valueOf(b);
          if (av === null && bv === null) return a.dataset.name.localeCompare(b.dataset.name);
          if (av === null) return 1;
          if (bv === null) return -1;
          if (av < bv) return -sortDir;
          if (av > bv) return sortDir;
          return a.dataset.name.localeCompare(b.dataset.name);
        }});
        sorted.forEach((row) => table.appendChild(row));
      }}
      document.querySelectorAll("#both th button").forEach((button) => {{
        button.addEventListener("click", () => {{
          const key = button.dataset.sort;
          if (sortKey === key) sortDir = -sortDir;
          else sortDir = key === "name" ? 1 : 1;
          sortKey = key;
          applySort();
        }});
      }});
      function foldQuery(value) {{
        return value.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      }}
      find.addEventListener("input", () => {{
        const query = foldQuery(find.value);
        rows().forEach((row) => {{
          row.hidden = query && !row.dataset.name.includes(query);
        }});
      }});
    </script>
    """
    return shell("OWA lap change, 2025 to 2026", body, wide=True)


def build_pairs(y2025: list[dict], y2026: list[dict]) -> list[dict]:
    left = best_by_person(y2025)
    right = best_by_person(y2026)
    rows = []
    for key in set(left) | set(right):
        earlier = left.get(key)
        later = right.get(key)
        sec_2025 = earlier["fastest_seconds"] if earlier else None
        sec_2026 = later["fastest_seconds"] if later else None
        if sec_2025 is None:
            best = sec_2026
            best_year = "2026"
        elif sec_2026 is None:
            best = sec_2025
            best_year = "2025"
        elif sec_2026 < sec_2025 - 0.0005:
            best = sec_2026
            best_year = "2026"
        elif sec_2025 < sec_2026 - 0.0005:
            best = sec_2025
            best_year = "2025"
        else:
            best = sec_2026
            best_year = "both"
        delta = None if earlier is None or later is None else sec_2026 - sec_2025
        rows.append(
            {
                "name": display_name(key, later, earlier),
                "time_2025": earlier["fastest_time"] if earlier else None,
                "time_2026": later["fastest_time"] if later else None,
                "sec_2025": sec_2025,
                "sec_2026": sec_2026,
                "best": best,
                "best_time": format_time(best),
                "best_year": best_year,
                "delta": delta,
                "pct": (delta / sec_2025) * 100 if delta is not None and sec_2025 else None,
                "rank_2025": earlier["rank"] if earlier else None,
                "rank_2026": later["rank"] if later else None,
            }
        )
    rows.sort(key=lambda item: (item["best"], item["name"]))
    return rows


def write_pair(public_name: str, local_name: str, public_html: str, local_html: str) -> None:
    public_path = PUBLIC / public_name
    local_path = LOCAL / local_name
    public_path.write_text(public_html)
    local_path.write_text(local_html)
    print(f"HTML -> {public_path}")
    print(f"HTML -> {local_path}")


def main() -> None:
    y2025 = load_riders(DATA / "owa-2025.json")
    y2026 = load_riders(DATA / "owa-2026.json")
    legends = load_riders(DATA / "owa-2026-legends.json")
    riders = build_pairs(y2025, y2026)

    public_links = {
        "ranked": "owa-2026-best-times.html",
        "compare": "owa-2025-vs-2026.html",
        "progress": "owa-progression.html",
    }
    local_links = {
        "ranked": "owa_2026_best_times_ranked.html",
        "compare": "owa_2025_vs_2026.html",
        "progress": "owa_progression.html",
    }

    write_pair(
        "owa-2026-best-times.html",
        "owa_2026_best_times_ranked.html",
        render_html(y2026, legends, "2026-10-05", public_links),
        render_html(y2026, legends, "2026-10-05", local_links),
    )
    write_pair(
        "owa-2025-vs-2026.html",
        "owa_2025_vs_2026.html",
        compare_page(y2025, y2026, public_links),
        compare_page(y2025, y2026, local_links),
    )
    write_pair(
        "owa-progression.html",
        "owa_progression.html",
        progress_page(riders, public_links),
        progress_page(riders, local_links),
    )

    print(f"\nRiders: {len(riders)}")
    for item in riders[:8]:
        print(
            f"  {item['best_time']}  {item['best_year']:4}  {item['name']:28} "
            f"2026={item['time_2026']}  2025={item['time_2025']}"
        )


if __name__ == "__main__":
    main()
