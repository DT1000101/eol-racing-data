import type {
  QualRider,
  SeedingBracket,
  SeedingBracketHeat,
  SeedingBracketSlot,
} from "./seedingTypes";

type AdvanceRole = "W" | "RU" | "3rd" | "4th";

const ROLE_INDEX: Record<AdvanceRole, number> = {
  W: 0,
  RU: 1,
  "3rd": 2,
  "4th": 3,
};

const HEAT_SIM_ORDER = [
  ...Array.from({ length: 8 }, (_, i) => `ef${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `qf${i + 1}`),
  "sf1",
  "sf2",
  "final",
];

/** Typical race-day lap swing (seconds) on a ~5 min track. */
const BASE_NOISE_SEC = 1.1;
/** Extra swing when the heat is tight on paper. */
const TIGHT_HEAT_NOISE_BONUS = 0.9;
/** Gate 1 vs 4 — front of line advantage (seconds). */
const GATE_PENALTY_PER_SLOT = 0.18;
/** Rare great/ bad heat outliers. */
const OUTLIER_CHANCE = 0.07;
const OUTLIER_SEC = 1.4;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function riderPaceSec(rider: QualRider): number {
  return rider.round2BestSec ?? rider.round1BestSec;
}

/** Triangular noise — mostly small swings, occasional bigger ones. */
function raceNoise(rng: () => number, cap: number): number {
  const u = (rng() + rng() + rng()) / 3;
  let noise = (u - 0.5) * 2 * cap;
  if (rng() < OUTLIER_CHANCE) noise -= OUTLIER_SEC;
  else if (rng() < OUTLIER_CHANCE) noise += OUTLIER_SEC;
  return noise;
}

function resolveSlotRider(
  slot: SeedingBracketSlot,
  results: Map<string, QualRider[]>,
): QualRider | undefined {
  if (slot.rider) return slot.rider;
  if (!slot.source) return undefined;
  const order = results.get(slot.source.heatId);
  if (!order) return undefined;
  return order[ROLE_INDEX[slot.source.role]];
}

interface HeatEntry {
  rider: QualRider;
  gridPosition: number;
}

function heatParticipants(
  heat: SeedingBracketHeat,
  results: Map<string, QualRider[]>,
): HeatEntry[] {
  const entries: HeatEntry[] = [];
  for (const slot of heat.slots) {
    const rider = resolveSlotRider(slot, results);
    if (rider) {
      entries.push({ rider, gridPosition: slot.gridPosition });
    }
  }
  return entries;
}

/**
 * Simulate a 4-rider heat from qualifying pace.
 * Faster qual times win most of the time; tight heats stay volatile.
 */
function simulateHeat(entries: HeatEntry[], rng: () => number): QualRider[] {
  const paces = entries.map((e) => riderPaceSec(e.rider));
  const spread = Math.max(...paces) - Math.min(...paces);
  const noiseCap =
    BASE_NOISE_SEC +
    (spread < 3 ? TIGHT_HEAT_NOISE_BONUS : spread < 6 ? 0.45 : 0);

  const scored = entries.map(({ rider, gridPosition }) => {
    const pace = riderPaceSec(rider);
    const gatePenalty = (gridPosition - 1) * GATE_PENALTY_PER_SLOT;
    const time = pace + gatePenalty + raceNoise(rng, noiseCap);
    return { rider, time };
  });

  scored.sort((a, b) => a.time - b.time);
  return scored.map((s) => s.rider);
}

export interface BracketSimulation {
  finishOrder: Map<string, QualRider[]>;
  bracket: SeedingBracket;
}

export function simulateBracketKnockout(
  base: SeedingBracket,
  simSeed: number,
): BracketSimulation {
  const rng = mulberry32(simSeed);
  const finishOrder = new Map<string, QualRider[]>();
  const heatById = new Map(base.heats.map((h) => [h.id, h]));

  for (const heatId of HEAT_SIM_ORDER) {
    const heat = heatById.get(heatId);
    if (!heat) continue;
    const participants = heatParticipants(heat, finishOrder);
    if (participants.length === 4) {
      finishOrder.set(heatId, simulateHeat(participants, rng));
    }
  }

  const heats = base.heats.map((heat) => ({
    ...heat,
    slots: heat.slots.map((slot) => ({
      ...slot,
      rider: resolveSlotRider(slot, finishOrder) ?? slot.rider,
    })),
  }));

  return {
    finishOrder,
    bracket: { ...base, heats },
  };
}

/** How many finishers advance from this heat. */
export function advanceCount(stage: SeedingBracketHeat["stage"]): number {
  if (stage === "final") return 0;
  return 2;
}
