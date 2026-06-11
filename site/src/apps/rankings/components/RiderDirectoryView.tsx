import { useMemo, useState } from "react";
import type { DirectoryRider, RiderDirectoryData } from "../types";
import {
  sortDirectoryRiders,
  type DirectorySortKey,
} from "../utils/riderDirectorySort";
import { FavouriteButton } from "./FavouriteButton";
import { SortButton } from "./SortButton";

type Props = {
  directory: RiderDirectoryData;
  favourites: Set<string>;
  isFavourite: (riderId: string) => boolean;
  onToggleFavourite: (riderId: string) => void;
  onOpenRider: (riderId: string) => void;
};

export function RiderDirectoryView({
  directory,
  favourites,
  isFavourite,
  onToggleFavourite,
  onOpenRider,
}: Props) {
  const [query, setQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<DirectorySortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = directory.riders;
    if (favouritesOnly) {
      list = list.filter((r) => favourites.has(r.riderId));
    }
    if (q) {
      list = list.filter((r) => {
        if (r.name.toLowerCase().includes(q)) return true;
        if (r.team.toLowerCase().includes(q)) return true;
        if (r.raceNumber != null && String(r.raceNumber).includes(q)) return true;
        return false;
      });
    }
    return sortDirectoryRiders(list, sortKey, sortAsc, favourites);
  }, [directory.riders, query, favouritesOnly, favourites, sortKey, sortAsc]);

  const onSort = (key: DirectorySortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === "name" || key === "team" || key === "eol" || key === "rank");
    }
  };

  const seasonLabel = directory.latestSeasonLabel;

  return (
    <div className="directory-page">
      <div className="directory-intro">
        <h2 className="directory-intro__title">Rider Directory</h2>
        <p className="directory-intro__lead">
          Search every rider in the database. Open a profile for full season history,
          tap an event for nearby results, and star favourites — saved in this browser only.
        </p>
      </div>

      <div className="directory-toolbar">
        <label className="directory-search">
          <span className="visually-hidden">Search riders</span>
          <input
            type="search"
            className="directory-search__input"
            placeholder="Name, team, or EOL #…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="toggle directory-toolbar__fav">
          <input
            type="checkbox"
            checked={favouritesOnly}
            onChange={(e) => setFavouritesOnly(e.target.checked)}
          />
          Favourites only
        </label>
      </div>

      <div className="table-wrap directory-table-wrap">
        <table className="directory-table">
          <thead>
            <tr>
              <th className="directory-table__num">
                <SortButton
                  label="EOL#"
                  active={sortKey === "eol"}
                  asc={sortAsc}
                  onClick={() => onSort("eol")}
                />
              </th>
              <th className="directory-table__fav" aria-label="Favourite" />
              <th className="directory-table__name">
                <SortButton
                  label="Rider"
                  active={sortKey === "name"}
                  asc={sortAsc}
                  onClick={() => onSort("name")}
                />
              </th>
              <th className="directory-table__rank">
                <SortButton
                  label={seasonLabel ? `${seasonLabel} rank` : "Rank"}
                  active={sortKey === "rank"}
                  asc={sortAsc}
                  onClick={() => onSort("rank")}
                />
              </th>
              <th className="directory-table__stat directory-table__stat--events">
                <SortButton
                  label="Events"
                  active={sortKey === "events"}
                  asc={sortAsc}
                  onClick={() => onSort("events")}
                />
              </th>
              <th className="directory-table__stat directory-table__stat--podiums">
                <SortButton
                  label="Podiums"
                  active={sortKey === "podiums"}
                  asc={sortAsc}
                  onClick={() => onSort("podiums")}
                />
              </th>
              <th className="directory-table__team">
                <SortButton
                  label="Team"
                  active={sortKey === "team"}
                  asc={sortAsc}
                  onClick={() => onSort("team")}
                />
              </th>
              <th className="directory-table__action" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="directory-table__empty">
                  No riders match your search.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <DirectoryRow
                  key={r.riderId}
                  rider={r}
                  stripe={i % 2 === 0 ? "even" : "odd"}
                  favourite={isFavourite(r.riderId)}
                  onToggleFavourite={() => onToggleFavourite(r.riderId)}
                  onOpen={() => onOpenRider(r.riderId)}
                  seasonLabel={seasonLabel}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="directory-footer">
        {filtered.length} of {directory.riders.length} riders
        {favourites.size > 0 && ` · ${favourites.size} favourited`}
      </p>
    </div>
  );
}

function DirectoryRow({
  rider,
  stripe,
  favourite,
  onToggleFavourite,
  onOpen,
  seasonLabel,
}: {
  rider: DirectoryRider;
  stripe: "even" | "odd";
  favourite: boolean;
  onToggleFavourite: () => void;
  onOpen: () => void;
  seasonLabel: string;
}) {
  const rankLabel =
    rider.latestSeasonRank != null
      ? `#${rider.latestSeasonRank}`
      : "—";

  return (
    <tr
      className={`directory-table__row directory-table__row--${stripe} ${
        favourite ? "directory-table__row--fav" : ""
      }`}
    >
      <td className="directory-table__num rankings__num">
        {rider.raceNumber ?? "—"}
      </td>
      <td className="directory-table__fav">
        <FavouriteButton
          active={favourite}
          onToggle={onToggleFavourite}
          label={rider.name}
        />
      </td>
      <td className="directory-table__name">
        <button type="button" className="directory-name-btn" onClick={onOpen}>
          {rider.name}
        </button>
      </td>
      <td className="directory-table__rank rankings__num" title={seasonLabel}>
        {rankLabel}
      </td>
      <td className="directory-table__stat directory-table__stat--events rankings__num">
        {rider.eventCount}
      </td>
      <td className="directory-table__stat directory-table__stat--podiums rankings__num">
        <span className="directory-table__podiums-total">{rider.podiumCount}</span>
        {rider.podiumCount > 0 && (
          <span className="directory-table__medals" aria-label="Medal breakdown">
            <span className="directory-table__medals-sep" aria-hidden>
              |
            </span>
            {rider.gold > 0 && <span>{rider.gold}🥇</span>}
            {rider.silver > 0 && <span>{rider.silver}🥈</span>}
            {rider.bronze > 0 && <span>{rider.bronze}🥉</span>}
          </span>
        )}
      </td>
      <td className="directory-table__team">
        {rider.team || <span className="cell-empty">—</span>}
      </td>
      <td className="directory-table__action">
        <button type="button" className="directory-profile-btn" onClick={onOpen}>
          Profile
        </button>
      </td>
    </tr>
  );
}
