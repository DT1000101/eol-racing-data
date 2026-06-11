import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DATA } from "../../hub/dataPaths";
import type {
  DirectoryRider,
  EolData,
  EventContextSelection,
  LeagueRuleSeason,
  RiderRow,
  SortKey,
} from "./types";
import { useFavourites } from "./hooks/useFavourites";
import { useIsMobile } from "./hooks/useIsMobile";
import { orderSeasonEvents } from "./utils/orderEvents";
import { parseTeams, riderHasTeam } from "./utils/teams";
import "./styles.css";

export interface RankingsDataContextValue {
  data: EolData | null;
  error: string | null;
  loading: boolean;
  isMobile: boolean;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  seasonId: number | null;
  setSeasonId: (id: number) => void;
  category: string | null;
  setCategory: (c: string) => void;
  season: EolData["seasons"][number] | undefined;
  events: ReturnType<typeof orderSeasonEvents>;
  sortedRows: RiderRow[];
  compactEvents: boolean;
  setCompactEvents: (v: boolean) => void;
  showPosition: boolean;
  setShowPosition: (v: boolean) => void;
  showPoints: boolean;
  setShowPoints: (v: boolean) => void;
  showTeams: boolean;
  setShowTeams: (v: boolean) => void;
  highlightPodiums: boolean;
  setHighlightPodiums: (v: boolean) => void;
  sort: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  teamFilter: string | null;
  onTeamClick: (team: string) => void;
  clearTeamFilter: () => void;
  directory: EolData["riderDirectory"] | undefined;
  teams2026Count: number;
  profileRider: DirectoryRider | null;
  openRiderProfile: (riderId: string) => void;
  closeRiderProfile: () => void;
  eventContext: EventContextSelection | null;
  setEventContext: (ctx: EventContextSelection | null) => void;
  favourites: Set<string>;
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
  rule: LeagueRuleSeason | undefined;
  rookie: EolData["rookieOfYear"] | undefined;
  podiums: EolData["podiumsHallOfFame"] | undefined;
}

const RankingsDataContext = createContext<RankingsDataContextValue | null>(null);

export function useRankingsData(): RankingsDataContextValue {
  const ctx = useContext(RankingsDataContext);
  if (!ctx) {
    throw new Error("useRankingsData must be used within RankingsDataProvider");
  }
  return ctx;
}

export function RankingsDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EolData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [compactEvents, setCompactEvents] = useState(true);
  const [showPosition, setShowPosition] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showTeams, setShowTeams] = useState(() => !isMobile);
  const [highlightPodiums, setHighlightPodiums] = useState(false);
  const [sort, setSort] = useState<SortKey>({ type: "season" });
  const [sortAsc, setSortAsc] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [profileRiderId, setProfileRiderId] = useState<string | null>(null);
  const [eventContext, setEventContext] = useState<EventContextSelection | null>(
    null,
  );
  const { favourites, isFavourite, toggleFavourite } = useFavourites();

  useEffect(() => {
    fetch(DATA.rankings.main)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`);
        return r.json();
      })
      .then((d: EolData) => {
        setData(d);
        const latest = Math.max(...d.seasons.map((s) => s.id));
        const season = d.seasons.find((s) => s.id === latest)!;
        setSeasonId(latest);
        setCategory(season.defaultCategory);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  const season = data?.seasons.find((s) => s.id === seasonId);
  const events = useMemo(() => {
    const raw =
      seasonId != null ? data?.eventsBySeason[String(seasonId)] ?? [] : [];
    return orderSeasonEvents(raw);
  }, [data, seasonId]);

  const rows: RiderRow[] =
    seasonId != null && category && data
      ? data.rowsBySeasonCategory[String(seasonId)]?.[category] ?? []
      : [];

  const sortedRows = useMemo(() => {
    const list = [...rows];
    const mult = sortAsc ? 1 : -1;
    list.sort((a, b) => {
      if (sort.type === "season") {
        return (a.seasonRank - b.seasonRank) * mult;
      }
      const ap = a.events[sort.eventId]?.position ?? 9999;
      const bp = b.events[sort.eventId]?.position ?? 9999;
      if (ap !== bp) return (ap - bp) * mult;
      return (a.seasonRank - b.seasonRank) * mult;
    });
    if (!teamFilter) return list;
    const onTeam = list
      .filter((r) => riderHasTeam(r.team, teamFilter))
      .sort((a, b) => a.seasonRank - b.seasonRank);
    const rest = list.filter((r) => !riderHasTeam(r.team, teamFilter));
    return [...onTeam, ...rest];
  }, [rows, sort, sortAsc, teamFilter]);

  const directory = data?.riderDirectory;
  const teams2026Count = useMemo(() => {
    const season2026 = data?.seasons.find((s) => s.label === "2026");
    if (!season2026 || !data) return 0;
    const byCategory = data.rowsBySeasonCategory[String(season2026.id)] ?? {};
    const teams = new Set<string>();
    for (const rows of Object.values(byCategory)) {
      for (const rider of rows) {
        for (const team of parseTeams(rider.team)) {
          teams.add(team);
        }
      }
    }
    return teams.size;
  }, [data]);

  const ridersById = useMemo(() => {
    const map = new Map<string, DirectoryRider>();
    for (const r of directory?.riders ?? []) {
      map.set(r.riderId, r);
    }
    return map;
  }, [directory]);

  const profileRider = profileRiderId
    ? (ridersById.get(profileRiderId) ?? null)
    : null;

  const openRiderProfile = useCallback(
    (riderId: string) => {
      if (ridersById.has(riderId)) {
        setEventContext(null);
        setProfileRiderId(riderId);
      }
    },
    [ridersById],
  );

  const onSort = useCallback(
    (key: SortKey) => {
      const sameCol =
        sort.type === key.type &&
        (key.type === "season" ||
          (sort.type === "event" &&
            key.type === "event" &&
            sort.eventId === key.eventId));
      if (sameCol) setSortAsc((v) => !v);
      else {
        setSort(key);
        setSortAsc(true);
      }
    },
    [sort],
  );

  const onTeamClick = useCallback((team: string) => {
    setTeamFilter((prev) => (prev === team ? null : team));
  }, []);

  const rule =
    seasonId != null
      ? data?.leagueRules?.seasons?.[String(seasonId)]
      : undefined;

  const value: RankingsDataContextValue = {
    data,
    error,
    loading: !data && !error,
    isMobile,
    settingsOpen,
    setSettingsOpen,
    seasonId,
    setSeasonId,
    category,
    setCategory,
    season,
    events,
    sortedRows,
    compactEvents,
    setCompactEvents,
    showPosition,
    setShowPosition,
    showPoints,
    setShowPoints,
    showTeams,
    setShowTeams,
    highlightPodiums,
    setHighlightPodiums,
    sort,
    sortAsc,
    onSort,
    teamFilter,
    onTeamClick,
    clearTeamFilter: () => setTeamFilter(null),
    directory,
    teams2026Count,
    profileRider,
    openRiderProfile,
    closeRiderProfile: () => setProfileRiderId(null),
    eventContext,
    setEventContext,
    favourites,
    isFavourite,
    toggleFavourite,
    rule,
    rookie: data?.rookieOfYear,
    podiums: data?.podiumsHallOfFame,
  };

  return (
    <RankingsDataContext.Provider value={value}>
      {children}
    </RankingsDataContext.Provider>
  );
}
