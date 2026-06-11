export interface QualLap {
  timeSec: number;
}

export interface QualRider {
  id: string;
  name: string;
  /** Stable index 0–31 for per-rider colour jitter (hue follows final seed). */
  colorIndex: number;
  /** Best lap in qualifying round 1 (seconds). */
  round1Laps: QualLap[];
  round1BestSec: number;
  /** Present only for riders who advanced to round 2. */
  round2Laps?: QualLap[];
  round2BestSec?: number;
  /** Final bracket seed 1 = fastest overall incentive. */
  finalSeed?: number;
  round1Pos?: number;
  round2Pos?: number;
}

export interface QualRoundMeta {
  round: 1 | 2;
  durationMin: number;
  label: string;
}

export interface QualifyingOutcome {
  riders: QualRider[];
  round1: {
    advancing: QualRider[];
    dropping: QualRider[];
  };
  round2: {
    advancing: QualRider[];
    dropping: QualRider[];
  };
}

export type BracketStage = "ef" | "qf" | "sf" | "final";

export interface SeedingBracketSlot {
  gridPosition: 1 | 2 | 3 | 4;
  bracketSeed: number;
  label: string;
  rider?: QualRider;
  placeholder?: string;
  source?: { heatId: string; role: "W" | "RU" | "3rd" | "4th" };
}

export interface SeedingBracketHeat {
  id: string;
  stage: BracketStage;
  title: string;
  subtitle?: string;
  column: number;
  row: number;
  slots: SeedingBracketSlot[];
}

export interface SeedingBracket {
  heats: SeedingBracketHeat[];
  seedToHeatSlot: Map<number, { heatId: string; gridPosition: number }>;
}
