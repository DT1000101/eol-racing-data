export interface Rider {
  rank: number;
  race_number: number | null;
  name: string;
  category: string;
  tt_pos_in_category: number | null;
  fastest_seconds: number;
  fastest_time: string;
}

export interface EventData {
  id: string;
  name: string;
  description: string;
  defaultCategories?: string[];
  categories: string[];
  ridersByCategory: Record<string, Omit<Rider, "rank">[]>;
  riders: Rider[];
}

export interface EventsIndex {
  events: {
    id: string;
    name: string;
    riderCount: number;
    categories?: string[];
    defaultCategories?: string[];
    countsByCategory?: Record<string, number>;
  }[];
  defaultEventId: string;
}

export type MinDivisionSize = 4 | 8 | 16;
export type ReferencePosition = 1 | 2 | 3 | 4;

export interface DivisionSettings {
  minDivisionSize: MinDivisionSize;
  pctThreshold: number;
  referencePosition: ReferencePosition;
  maxDivisions: number | null;
}

export interface Division {
  number: number;
  startRank: number;
  endRank: number;
  size: number;
  referenceRank: number;
  referenceTime: number;
  firstTime: number;
  thirdTime: number;
  isRemainder: boolean;
}

export interface RiderWithDivision extends Rider {
  divisionNumber: number;
  divisionRank: number;
  pctVsRiderAhead: number;
  /** vs D1 reference rider (position from settings). */
  pctVsDiv1Ref: number;
  /** vs this rider's division reference rider. */
  pctVsOwnRef: number;
}

export interface DivisionResult {
  divisions: Division[];
  riders: RiderWithDivision[];
}

/** Re-rank a filtered rider list by fastest time */
export function rankRiders(riders: Omit<Rider, "rank">[]): Rider[] {
  const sorted = [...riders].sort(
    (a, b) => a.fastest_seconds - b.fastest_seconds,
  );
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}
