# Season source files

Copy season folders here to rebuild rankings data (xlsx/pdf from each event).

Example layout (match names used by `scripts/rankings/build_master_data.py`):

```
seasons/
├── Season 1 - 2023/
├── season 2 - 2024/
├── Season 3 - 2025/
└── Season 4 - 2026/
```

These files are large and may stay local only — the built JSON in `site/public/data/rankings/` is what the live site uses.
