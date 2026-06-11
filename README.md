# EOL Racing Data

Community data hub for the European Onewheel League: season rankings, rider directory, dynamic divisions, and finals seeding (in progress).

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
| `/rankings` | Season standings table |
| `/rider-directory` | Searchable rider profiles |
| `/teams` | 2026 teams directory |
| `/roty` | Rookie of the Year qualifier |
| `/podiums` | Podium hall of fame |
| `/attendance` | Attendance & league growth charts |
| `/divisions` | Divisions Visualizer |
| `/seeding` | Finals Seeding Visualizer |

## Data

Runtime JSON lives in `site/public/data/`:

- `rankings/` — `eol-data.json` (+ `stats.html`, `attendance-stats.json`)
- `divisions/` — `events.json` + per-event JSON

Source / rebuild pipelines:

```bash
# Divisions — extract time trials → data/divisions + site/public
python3 scripts/divisions/extract_time_trials.py

# Rankings — link seasons then rebuild
bash scripts/rankings/link_seasons.sh   # symlinks from ../rankings per season/
pip install -r scripts/rankings/requirements.txt
bash scripts/rankings/rebuild_all.sh
```

Season source files stay in the original `rankings per season` folder locally (symlinked, not committed).

## Deploy (Vercel)

1. Push to GitHub as `eol-racing-data`
2. Import in Vercel — root directory `.`, uses `vercel.json`
3. No env vars required; JSON must be committed under `site/public/data/`

## Repo layout

```
eol-racing-data/
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
