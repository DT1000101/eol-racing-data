import type { QualLap, QualRider, QualifyingOutcome } from "./seedingTypes";
import { runQualifying } from "./qualifyingLogic";

const FIRST = [
  "Alex", "Sam", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Jamie",
  "Chris", "Pat", "Quinn", "Avery", "Blake", "Drew", "Ellis", "Finley",
  "Harper", "Jesse", "Kai", "Logan", "Max", "Noah", "Owen", "Parker",
  "Reese", "Sage", "Skyler", "Toby", "Val", "Wren", "Yuki", "Zoe",
];

const LAST = [
  "Baker", "Clark", "Diaz", "Evans", "Foster", "Garcia", "Hayes", "Ivanov",
  "Jones", "Klein", "Lopez", "Miller", "Nguyen", "Olsen", "Price", "Reed",
  "Stone", "Torres", "Upton", "Vega", "Walsh", "Xu", "Young", "Zimmerman",
  "Adams", "Brooks", "Cole", "Dean", "Edwards", "Ford", "Grant", "Hill",
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomLaps(
  rng: () => number,
  baseSec: number,
  spreadSec: number,
  maxAttempts: number,
): QualLap[] {
  const count = 1 + Math.floor(rng() * maxAttempts);
  const laps: QualLap[] = [];
  for (let i = 0; i < count; i++) {
    const variance = (rng() - 0.35) * spreadSec;
    laps.push({ timeSec: Math.max(260, baseSec + variance) });
  }
  return laps;
}

function bestLap(laps: QualLap[]): number {
  return Math.min(...laps.map((l) => l.timeSec));
}

/** ~5 min track; riders spaced by underlying pace with random lap counts. */
export function generateQualifyingOutcome(seed = Date.now()): QualifyingOutcome {
  const rng = mulberry32(seed);
  const used = new Set<string>();

  const riders: QualRider[] = [];
  for (let i = 0; i < 32; i++) {
    let name: string;
    do {
      name = `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
    } while (used.has(name));
    used.add(name);

    const pace = 278 + i * 1.8 + (rng() - 0.5) * 4;
    const round1Laps = randomLaps(rng, pace, 8, 4);
    riders.push({
      id: `r${i + 1}`,
      name,
      colorIndex: i,
      round1Laps,
      round1BestSec: bestLap(round1Laps),
    });
  }

  return runQualifying(riders, rng);
}

export function riderLabel(rider: QualRider, useNames: boolean): string {
  return useNames ? rider.name : `#${rider.finalSeed ?? "?"}`;
}

export function formatLap(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}
