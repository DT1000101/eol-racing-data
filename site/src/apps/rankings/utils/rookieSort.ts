import type { RookieContender } from "../types";

export type RookieSortKey =
  | "category"
  | "name"
  | "priorRaces"
  | "seasonRaces"
  | "status"
  | "experience"
  | "minSeason"
  | "finals";

export type RookieStatus = "eligible" | "tracking" | "none";

export function getRookieStatus(row: RookieContender): RookieStatus {
  if (row.eligible) return "eligible";
  if (row.checks.minSeasonRaces.pending) return "tracking";
  return "none";
}

function statusRank(row: RookieContender): number {
  const s = getRookieStatus(row);
  if (s === "eligible") return 2;
  if (s === "tracking") return 1;
  return 0;
}

function checkRank(check: RookieContender["checks"]["rookieExperience"]): number {
  if (check.met) return 2;
  if (check.pending) return 1;
  return 0;
}

function compare(a: number | string, b: number | string, asc: boolean): number {
  const cmp =
    typeof a === "string" && typeof b === "string"
      ? a.localeCompare(b)
      : (a as number) - (b as number);
  return asc ? cmp : -cmp;
}

export function sortRookieContenders(
  rows: RookieContender[],
  key: RookieSortKey,
  asc: boolean,
): RookieContender[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let primary = 0;
    switch (key) {
      case "category":
        primary = compare(a.viewCategoryLabel, b.viewCategoryLabel, asc);
        break;
      case "name":
        primary = compare(a.name, b.name, asc);
        break;
      case "priorRaces":
        primary = compare(a.priorRaceCount, b.priorRaceCount, asc);
        break;
      case "seasonRaces":
        primary = compare(a.seasonRaceCount, b.seasonRaceCount, asc);
        break;
      case "status":
        primary = compare(statusRank(a), statusRank(b), asc);
        break;
      case "experience":
        primary = compare(
          checkRank(a.checks.rookieExperience),
          checkRank(b.checks.rookieExperience),
          asc,
        );
        break;
      case "minSeason":
        primary = compare(
          checkRank(a.checks.minSeasonRaces),
          checkRank(b.checks.minSeasonRaces),
          asc,
        );
        break;
      case "finals":
        primary = compare(
          checkRank(a.checks.finalsEligible),
          checkRank(b.checks.finalsEligible),
          asc,
        );
        break;
    }
    if (primary !== 0) return primary;
    if (statusRank(a) !== statusRank(b)) return statusRank(b) - statusRank(a);
    if (a.seasonRaceCount !== b.seasonRaceCount) {
      return b.seasonRaceCount - a.seasonRaceCount;
    }
    return a.name.localeCompare(b.name);
  });
  return sorted;
}

/** Default direction when first selecting a column */
export function defaultRookieSortAsc(key: RookieSortKey): boolean {
  switch (key) {
    case "category":
    case "name":
      return true;
    default:
      return false;
  }
}
