import type { DirectoryRider } from "../types";

export type DirectorySortKey =
  | "rank"
  | "name"
  | "eol"
  | "team"
  | "events"
  | "podiums"
  | "favourites";

export function sortDirectoryRiders(
  riders: DirectoryRider[],
  sortKey: DirectorySortKey,
  asc: boolean,
  favouriteIds: Set<string>,
): DirectoryRider[] {
  const list = [...riders];
  const mult = asc ? 1 : -1;

  list.sort((a, b) => {
    if (sortKey === "favourites") {
      const af = favouriteIds.has(a.riderId) ? 0 : 1;
      const bf = favouriteIds.has(b.riderId) ? 0 : 1;
      if (af !== bf) return (af - bf) * mult;
      return a.name.localeCompare(b.name) * mult;
    }
    if (sortKey === "name") {
      return a.name.localeCompare(b.name) * mult;
    }
    if (sortKey === "eol") {
      const an = a.raceNumber ?? 99999;
      const bn = b.raceNumber ?? 99999;
      if (an !== bn) return (an - bn) * mult;
      return a.name.localeCompare(b.name);
    }
    if (sortKey === "team") {
      const at = (a.team || "zzz").toLowerCase();
      const bt = (b.team || "zzz").toLowerCase();
      const d = at.localeCompare(bt);
      if (d !== 0) return d * mult;
      return a.name.localeCompare(b.name);
    }
    if (sortKey === "events") {
      const d = a.eventCount - b.eventCount;
      if (d !== 0) return d * mult;
      return a.name.localeCompare(b.name);
    }
    if (sortKey === "podiums") {
      const d = a.podiumCount - b.podiumCount;
      if (d !== 0) return d * mult;
      return a.name.localeCompare(b.name);
    }
    // rank — latest season; unrated riders last
    const ar = a.latestSeasonRank ?? 99999;
    const br = b.latestSeasonRank ?? 99999;
    if (ar !== br) return (ar - br) * mult;
    return a.name.localeCompare(b.name);
  });

  return list;
}
