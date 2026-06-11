import { useMemo, useState } from "react";
import type { RookieContender, RookieOfYearData } from "../types";
import {
  defaultRookieSortAsc,
  getRookieStatus,
  sortRookieContenders,
  type RookieSortKey,
} from "../utils/rookieSort";
import { RookieDetailModal } from "./RookieDetailModal";
import { SortButton } from "./SortButton";

type Props = {
  data: RookieOfYearData;
  highlightPodiums?: boolean;
};

type TableSortKey = "category" | "name" | "priorRaces" | "seasonRaces" | "status";

function statusLabel(row: RookieContender): string {
  if (row.eligible) return "Eligible";
  if (row.checks.minSeasonRaces.pending) return "In progress";
  return "Not eligible";
}

function CheckMark({
  title,
  check,
}: {
  title: string;
  check: RookieContender["checks"]["rookieExperience"];
}) {
  const state = check.met ? "met" : check.pending ? "pending" : "failed";
  const icon = check.met ? "✓" : check.pending ? "…" : "✕";
  return (
    <span
      className={`rookie-check rookie-check--${state}`}
      title={`${title}: ${check.detail}`}
      aria-label={`${title}: ${check.detail}`}
    >
      {icon}
    </span>
  );
}

function RookieRow({
  row,
  minRaces,
  onMore,
}: {
  row: RookieContender;
  minRaces: number;
  onMore: () => void;
}) {
  const status = getRookieStatus(row);
  const checks = row.checks;

  return (
    <tr className={row.eligible ? "rookie__row--eligible" : undefined}>
      <td className="rookie__cat">{row.viewCategoryLabel}</td>
      <td className="rookie__name">
        {row.name}
        {row.raceNumber != null && (
          <span className="rookie__num"> #{row.raceNumber}</span>
        )}
      </td>
      <td className="rookie__prior">{row.priorRaceCount}</td>
      <td className="rookie__season">
        {row.seasonRaceCount}/{minRaces}
      </td>
      <td>
        <span className={`rookie__badge rookie__badge--${status}`}>
          {statusLabel(row)}
        </span>
      </td>
      <td className="rookie__checks">
        <CheckMark title="Rookie rule" check={checks.rookieExperience} />
        <CheckMark title="Season races" check={checks.minSeasonRaces} />
        <CheckMark title="Finals ok" check={checks.finalsEligible} />
      </td>
      <td className="rookie__details">
        <button type="button" className="rookie__more" onClick={onMore}>
          More details
        </button>
      </td>
    </tr>
  );
}

export function RookieOfYearView({ data, highlightPodiums = false }: Props) {
  const [detail, setDetail] = useState<RookieContender | null>(null);
  const [sortKey, setSortKey] = useState<TableSortKey>("status");
  const [sortAsc, setSortAsc] = useState(false);

  const seasonLabel = data.targetSeasonLabel;

  const contenders = useMemo(() => {
    const all: RookieContender[] = [];
    const seen = new Set<string>();
    for (const list of Object.values(data.contendersByCategory)) {
      for (const c of list) {
        const key = `${c.riderId}:${c.viewCategory}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(c);
      }
    }
    return all;
  }, [data.contendersByCategory]);

  const sorted = useMemo(
    () => sortRookieContenders(contenders, sortKey as RookieSortKey, sortAsc),
    [contenders, sortKey, sortAsc],
  );

  const eligible = contenders.filter((c) => c.eligible);

  const onSort = (key: TableSortKey) => {
    if (key === sortKey) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(defaultRookieSortAsc(key));
    }
  };

  return (
    <div className="rookie-page">
      <section className="rookie-intro">
        <h2 className="rookie-intro__title">Rookie of the Year {seasonLabel}</h2>
        <p className="rookie-intro__summary">
          Watch list: riders with a {seasonLabel} result. Tap <strong>More details</strong> for
          race history and full qualification notes.
        </p>
        <ul className="rookie-intro__rules">
          <li>≤1 EOL race before {seasonLabel}</li>
          <li>At least {data.minRacesInSeason} EOL races in {seasonLabel}</li>
          <li>No EOL Finals before {seasonLabel}, and no {seasonLabel} wildcard</li>
        </ul>
        <p className="rookie-intro__stats">
          {contenders.length} on list
          {eligible.length > 0 && ` · ${eligible.length} eligible`}
        </p>
      </section>

      <div className="rookie-scroll">
        <table className="rookie">
          <thead>
            <tr>
              <th className="rookie__th-cat">
                <SortButton
                  label="Cat"
                  active={sortKey === "category"}
                  asc={sortAsc}
                  onClick={() => onSort("category")}
                  compact
                />
              </th>
              <th className="rookie__th-name">
                <SortButton
                  label="Rider"
                  active={sortKey === "name"}
                  asc={sortAsc}
                  onClick={() => onSort("name")}
                  compact
                />
              </th>
              <th className="rookie__th-prior">
                <SortButton
                  label="Prior"
                  active={sortKey === "priorRaces"}
                  asc={sortAsc}
                  onClick={() => onSort("priorRaces")}
                  compact
                />
              </th>
              <th className="rookie__th-season">
                <SortButton
                  label={seasonLabel}
                  active={sortKey === "seasonRaces"}
                  asc={sortAsc}
                  onClick={() => onSort("seasonRaces")}
                  compact
                />
              </th>
              <th className="rookie__th-status">
                <SortButton
                  label="Status"
                  active={sortKey === "status"}
                  asc={sortAsc}
                  onClick={() => onSort("status")}
                  compact
                />
              </th>
              <th className="rookie__th-checks" title="Rookie rule · Season races · Finals ok">
                Checks
              </th>
              <th className="rookie__th-details" aria-label="Details" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="rookie__empty">
                  No riders on the rookie watch list yet.
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <RookieRow
                  key={`${row.riderId}-${row.viewCategory}`}
                  row={row}
                  minRaces={data.minRacesInSeason}
                  onMore={() => setDetail(row)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <RookieDetailModal
          contender={detail}
          targetSeasonLabel={seasonLabel}
          highlightPodiums={highlightPodiums}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
