# EOL Hub

Community hub for European Onewheel League tools: season rankings, dynamic divisions, and finals seeding (in progress).

**Not the official EOL website** — maintained for organisers and riders.

## Quick start

```bash
cd site
npm install
npm run dev
```

Open http://localhost:5173

## What's included

| Route | Description |
|-------|-------------|
| `/` | Homepage with links to each tool |
| `/rankings` | Season standings, rider directory, teams, ROTY, podiums |
| `/divisions` | Time-trial division splitter with bracket grids |
| `/seeding` | Finals seeding explainer (OWA top 32 — coming soon) |

## Data

Runtime JSON lives in `site/public/data/`:

- `rankings/` — `eol-data.json` (+ `stats.html`, `attendance-stats.json`)
- `divisions/` — `events.json` + per-event JSON

Source / rebuild pipelines:

```bash
# Divisions — extract time trials → data/divisions + site/public
python3 scripts/divisions/extract_time_trials.py

# Rankings — requires season source folders (see below)
pip install -r scripts/rankings/requirements.txt
# Place season xlsx/pdf under seasons/ then:
python3 scripts/rankings/build_master_data.py
python3 scripts/rankings/build_site_data.py
# Copies output to site/public/data/rankings/
```

Season source spreadsheets are large and not all committed here yet. Copy from the existing `rankings per season` folder into `seasons/` when rebuilding rankings data locally.

## Deploy (Vercel)

1. Push to GitHub as `eol-hub`
2. Import in Vercel — root directory `.`, uses `vercel.json`
3. No env vars required; JSON must be committed under `site/public/data/`

## Repo layout

```
eol-hub/
├── vercel.json
├── data/                    # Generated CSV/JSON (divisions + rankings pipeline)
├── scripts/
│   ├── divisions/           # Time-trial extractors
│   └── rankings/            # Master data build scripts
├── seasons/                 # Season source files (add locally)
└── site/                    # Unified Vite + React app
    ├── public/data/         # Static JSON served at runtime
    └── src/
        ├── hub/             # Shell, home, nav
        └── apps/            # Rankings, divisions, seeding
```
