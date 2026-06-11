import type { QualLap, QualRider, QualifyingOutcome } from "./seedingTypes";

function bestLap(laps: QualLap[]): number {
  return Math.min(...laps.map((l) => l.timeSec));
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

/**
 * Round 1: 32 riders, bottom 12 → seeds 21–32 (not disqualified).
 * Round 2: top 20, bottom 12 → seeds 9–20. Top 8 → seeds 1–8.
 */
export function runQualifying(
  riders: QualRider[],
  rng: () => number = Math.random,
): QualifyingOutcome {
  const sortedR1 = [...riders].sort((a, b) => a.round1BestSec - b.round1BestSec);
  sortedR1.forEach((r, i) => {
    r.round1Pos = i + 1;
  });

  const advancingR2 = sortedR1.slice(0, 20);
  const droppingR1 = sortedR1.slice(20);
  droppingR1.forEach((r) => {
    r.finalSeed = r.round1Pos!;
  });

  for (const r of advancingR2) {
    const pace = r.round1BestSec + (rng() - 0.5) * 3;
    const round2Laps = randomLaps(rng, pace, 7, 3);
    r.round2Laps = round2Laps;
    r.round2BestSec = bestLap(round2Laps);
  }

  const sortedR2 = [...advancingR2].sort(
    (a, b) => (a.round2BestSec ?? 999) - (b.round2BestSec ?? 999),
  );
  sortedR2.forEach((r, i) => {
    r.round2Pos = i + 1;
  });

  const advancingFinal = sortedR2.slice(0, 8);
  const droppingR2 = sortedR2.slice(8);

  advancingFinal.forEach((r, i) => {
    r.finalSeed = i + 1;
  });
  droppingR2.forEach((r) => {
    r.finalSeed = r.round2Pos!;
  });

  return {
    riders: [...riders],
    round1: { advancing: advancingR2, dropping: droppingR1 },
    round2: { advancing: advancingFinal, dropping: droppingR2 },
  };
}
