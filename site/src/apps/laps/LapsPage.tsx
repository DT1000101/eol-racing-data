import { useEffect, useMemo, useState } from "react";
import { DATA } from "../../hub/dataPaths";
import { PageHeader } from "../../hub/PageHeader";
import { pageMeta } from "../../hub/navConfig";
import {
  buildLapRows,
  foldName,
  signedPercent,
  signedSeconds,
  sortLapRows,
  type LapRider,
  type LapRow,
  type SortKey,
} from "./compare";
import "./laps.css";

const PAGE = pageMeta("/owa-laps")!;

function tone(delta: number): string {
  if (delta < -0.0005) return "laps-faster";
  if (delta > 0.0005) return "laps-slower";
  return "";
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  if (ordered.length % 2) return ordered[mid]!;
  return ((ordered[mid - 1] ?? 0) + (ordered[mid] ?? 0)) / 2;
}

export function LapsPage() {
  const [rows, setRows] = useState<LapRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("best");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(DATA.divisions.event("owa-2025")),
      fetch(DATA.divisions.event("owa-2026")),
    ])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) throw new Error("Could not load OWA lap data");
        const [year2025, year2026] = (await Promise.all([
          a.json(),
          b.json(),
        ])) as [{ riders: LapRider[] }, { riders: LapRider[] }];
        if (!cancelled) setRows(buildLapRows(year2025.riders, year2026.riders));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Load failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const paired = (rows ?? []).filter((row) => row.delta != null);
    const deltas = paired.map((row) => row.delta!);
    return {
      total: rows?.length ?? 0,
      paired: paired.length,
      faster: paired.filter((row) => row.delta! < -0.0005).length,
      slower: paired.filter((row) => row.delta! > 0.0005).length,
      median: deltas.length ? median(deltas) : 0,
      average: deltas.length
        ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length
        : 0,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const sorted = sortLapRows(rows ?? [], sortKey, sortDir);
    const needle = foldName(query);
    if (!needle) return sorted;
    return sorted.filter((row) => foldName(row.name).includes(needle));
  }, [rows, query, sortKey, sortDir]);

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortDir((dir) => (dir === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  if (error) {
    return (
      <div className="laps-page laps-page--error">
        <p>{error}</p>
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="laps-page laps-page--loading">
        <p>Loading lap comparison…</p>
      </div>
    );
  }

  return (
    <div className="laps-page">
      <div className="laps-page__toolbar">
        <PageHeader title={PAGE.pageTitle} subtitle={PAGE.pageSubtitle} />
        <p className="laps-page__intro">{PAGE.description}</p>
      </div>
      <div className="laps-page__body">
        <div className="laps-kpis">
          <div className="laps-kpi">
            <b>{stats.total}</b>
            <span>riders</span>
          </div>
          <div className="laps-kpi">
            <b>{stats.paired}</b>
            <span>rode both years</span>
          </div>
          <div className="laps-kpi">
            <b className="laps-faster">{stats.faster}</b>
            <span>faster in 2026</span>
          </div>
          <div className="laps-kpi">
            <b className="laps-slower">{stats.slower}</b>
            <span>slower in 2026</span>
          </div>
          <div className="laps-kpi">
            <b className={tone(stats.median)}>{signedSeconds(stats.median)}</b>
            <span>median change</span>
          </div>
          <div className="laps-kpi">
            <b className={tone(stats.average)}>{signedSeconds(stats.average)}</b>
            <span>average change</span>
          </div>
        </div>

        <input
          className="laps-search"
          type="search"
          placeholder="Find a rider"
          aria-label="Find a rider"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="laps-table-wrap">
          <table className="laps-table">
            <thead>
              <tr>
                <SortHeader label="Rider" sort="name" active={sortKey} onSort={sortBy} />
                <SortHeader label="Best time" sort="best" active={sortKey} onSort={sortBy} />
                <SortHeader label="2026" sort="y2026" active={sortKey} onSort={sortBy} />
                <SortHeader label="2025" sort="y2025" active={sortKey} onSort={sortBy} />
                <SortHeader
                  label="Change"
                  sort="delta"
                  active={sortKey}
                  onSort={sortBy}
                  className="progress"
                />
                <SortHeader label="%" sort="pct" active={sortKey} onSort={sortBy} />
                <SortHeader label="Rank" sort="rank" active={sortKey} onSort={sortBy} />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <LapTableRow key={row.name} row={row} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="laps-note">{PAGE.help}</p>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sort,
  active,
  onSort,
  className,
}: {
  label: string;
  sort: SortKey;
  active: SortKey;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th className={className}>
      <button
        type="button"
        aria-pressed={active === sort}
        onClick={() => onSort(sort)}
      >
        {label}
      </button>
    </th>
  );
}

function LapTableRow({ row }: { row: LapRow }) {
  const changeClass = row.delta == null ? "laps-na" : tone(row.delta);
  const rankClass =
    row.rank2025 == null || row.rank2026 == null
      ? "laps-na"
      : row.rank2025 > row.rank2026
        ? "laps-faster"
        : row.rank2025 < row.rank2026
          ? "laps-slower"
          : "";
  const rankLabel =
    row.rank2025 == null && row.rank2026 == null
      ? "n/a"
      : `${row.rank2025 ?? "n/a"} → ${row.rank2026 ?? "n/a"}`;

  return (
    <tr>
      <td>{row.name}</td>
      <td className="num">{row.bestTime}</td>
      <td className={row.time2026 ? "num" : "num laps-na"}>
        {row.time2026 ?? "n/a"}
      </td>
      <td className={row.time2025 ? "num" : "num laps-na"}>
        {row.time2025 ?? "n/a"}
      </td>
      <td className={`num progress ${changeClass}`}>
        {row.delta == null ? "n/a" : signedSeconds(row.delta)}
      </td>
      <td className={`num ${changeClass}`}>
        {row.pct == null ? "n/a" : signedPercent(row.pct)}
      </td>
      <td className={`num ${rankClass}`}>{rankLabel}</td>
    </tr>
  );
}
