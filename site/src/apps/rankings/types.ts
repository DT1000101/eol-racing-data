export type EventCell = {
  position: number | null;
  points: number | null;
  eolNumberAssignedHere?: boolean;
};

export type RiderRow = {
  riderId: string;
  name: string;
  raceNumber: number | null;
  numberAssignedAtEvent?: string | null;
  team?: string;
  seasonRank: number;
  totalPoints: number;
  events: Record<string, EventCell>;
};

export type SeasonEvent = {
  id: string;
  name: string;
  short: string;
  sortKey: number;
  isFinals?: boolean;
  tier?: "tier1" | "tier2" | null;
};

export type SeasonMeta = {
  id: number;
  label: string;
  categories: string[];
  categoryLabels: Record<string, string>;
  defaultCategory: string;
};

export type LeagueRuleSeason = {
  season_label?: string;
  events_counted?: string;
  max_counted?: number | null;
  max_tier1_counted?: number;
  tier_system?: boolean;
  tier1_event_ids?: string[];
  tier2_event_ids?: string[];
  notes?: string;
};

export type RookieCheck = {
  met: boolean;
  pending: boolean;
  label: string;
  detail: string;
};

export type RookieRaceDetail = {
  eventId: string;
  eventName: string;
  season: number;
  seasonLabel: string;
  category: string;
  categoryLabel: string;
  position: number | null;
  points: number | null;
  isFinals: boolean;
};

export type RookieContender = {
  riderId: string;
  name: string;
  raceNumber: number | null;
  viewCategory: string;
  viewCategoryLabel: string;
  priorRaceCount: number;
  seasonRaceCount: number;
  priorRaceEvents: string[];
  seasonRaceEvents: string[];
  priorRaces: RookieRaceDetail[];
  seasonRaces: RookieRaceDetail[];
  qualificationNote: string | null;
  checks: {
    rookieExperience: RookieCheck;
    minSeasonRaces: RookieCheck;
    finalsEligible: RookieCheck;
  };
  eligible: boolean;
};

export type PodiumFinish = {
  position: 1 | 2 | 3;
  eventId: string;
  eventName: string;
  season: number;
  seasonLabel: string;
  category: string;
  categoryLabel: string;
};

export type PodiumsHallRider = {
  riderId: string;
  name: string;
  raceNumber: number | null;
  podiumCount: number;
  gold: number;
  silver: number;
  bronze: number;
  firsts: PodiumFinish[];
  seconds: PodiumFinish[];
  thirds: PodiumFinish[];
};

export type PodiumsHallOfFameData = {
  summary: { riderCount: number; podiumCount: number };
  riders: PodiumsHallRider[];
};

export type RookieOfYearData = {
  targetSeason: number;
  targetSeasonLabel: string;
  minRacesInSeason: number;
  maxPriorRaces: number;
  summary: { poolCount: number; eligibleCount: number };
  rules: string[];
  contendersByCategory: Record<string, RookieContender[]>;
};

export type DirectoryEventResult = {
  eventId: string;
  eventName: string;
  sortKey: number;
  isFinals?: boolean;
  position: number;
  points: number | null;
};

export type DirectorySeasonCategory = {
  category: string;
  categoryLabel: string;
  seasonRank?: number;
  totalPoints?: number;
  events: DirectoryEventResult[];
};

export type DirectorySeasonBlock = {
  seasonId: number;
  seasonLabel: string;
  categories: DirectorySeasonCategory[];
};

export type DirectoryRider = {
  riderId: string;
  name: string;
  raceNumber: number | null;
  team: string;
  teams: string[];
  eventCount: number;
  podiumCount: number;
  gold: number;
  silver: number;
  bronze: number;
  latestSeasonRank: number | null;
  latestSeasonId: number | null;
  latestCategory: string | null;
  seasons: DirectorySeasonBlock[];
};

export type EventStandingEntry = {
  position: number;
  riderId: string;
  name: string;
  raceNumber: number | null;
};

export type RiderDirectoryData = {
  latestSeasonId: number;
  latestSeasonLabel: string;
  riders: DirectoryRider[];
  eventStandings: Record<string, EventStandingEntry[]>;
};

export type EventContextSelection = {
  eventId: string;
  eventName: string;
  category: string;
  categoryLabel: string;
  seasonLabel: string;
  riderId: string;
  riderName: string;
  position: number;
};

export type EolData = {
  meta: {
    generatedAt: string;
    riderCount: number;
    alignmentMismatches?: number;
    namesToReview?: number;
  };
  leagueRules: { seasons?: Record<string, LeagueRuleSeason> };
  seasons: SeasonMeta[];
  eventsBySeason: Record<string, SeasonEvent[]>;
  rowsBySeasonCategory: Record<string, Record<string, RiderRow[]>>;
  riderDirectory?: RiderDirectoryData;
  rookieOfYear?: RookieOfYearData;
  podiumsHallOfFame?: PodiumsHallOfFameData;
};

export type SortKey =
  | { type: "season" }
  | { type: "event"; eventId: string };
