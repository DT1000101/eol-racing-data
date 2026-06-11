import type {
  Division,
  DivisionResult,
  DivisionSettings,
  MinDivisionSize,
  ReferencePosition,
  Rider,
  RiderWithDivision,
} from "../types";
import { pctSlower } from "./timeFormat";

/** Valid bracket sizes for main divisions (heats / knockout structure) */
const BRACKET_SIZES = [4, 8, 16, 32] as const;

function validTiers(minDivisionSize: MinDivisionSize): number[] {
  return BRACKET_SIZES.filter((s) => s >= minDivisionSize);
}

function isBracketSize(size: number, minDivisionSize: MinDivisionSize): boolean {
  return validTiers(minDivisionSize).includes(size);
}

function getTimeAtPosition(
  riders: Rider[],
  startIdx: number,
  position: number,
): number {
  const idx = startIdx + position - 1;
  return riders[idx]?.fastest_seconds ?? 0;
}

function batchWithinThreshold(
  riders: Rider[],
  batchStart: number,
  batchEnd: number,
  refTime: number,
  pctThreshold: number,
): boolean {
  for (let i = batchStart; i < batchEnd; i++) {
    const rider = riders[i];
    if (!rider) return false;
    if (pctSlower(rider.fastest_seconds, refTime) > pctThreshold) {
      return false;
    }
  }
  return batchEnd > batchStart;
}

/**
 * Largest bracket tier (4 / 8 / 16 / 32) reachable from minDivisionSize via
 * stepwise doubling, where each new batch must fully fit and pass the threshold.
 */
function computeBracketSize(
  riders: Rider[],
  startIdx: number,
  available: number,
  minDivisionSize: MinDivisionSize,
  pctThreshold: number,
  referencePosition: ReferencePosition,
): number {
  const tiers = validTiers(minDivisionSize).filter((t) => t <= available);
  if (tiers.length === 0) return available;

  const refTime = getTimeAtPosition(riders, startIdx, referencePosition);
  let size: number = minDivisionSize;

  for (const tier of tiers) {
    if (tier === minDivisionSize) {
      size = tier;
      continue;
    }

    let canReach = true;
    for (let step = minDivisionSize; step < tier; step *= 2) {
      const nextStep = step * 2;
      const batchStart = startIdx + step;
      const batchEnd = startIdx + nextStep;
      if (
        batchEnd > riders.length ||
        !batchWithinThreshold(
          riders,
          batchStart,
          batchEnd,
          refTime,
          pctThreshold,
        )
      ) {
        canReach = false;
        break;
      }
    }

    if (canReach) size = tier;
  }

  return size;
}

/**
 * Build divisions from sorted riders (fastest first).
 *
 * Main divisions must be bracket sizes: 4, 8, 16, or 32 (based on min setting).
 * Expansion doubles through those tiers when the next batch passes the threshold.
 * Only the final division may be an arbitrary remainder count.
 */
export function computeDivisions(
  riders: Rider[],
  settings: DivisionSettings,
): DivisionResult {
  const { minDivisionSize, pctThreshold, referencePosition, maxDivisions } =
    settings;

  const divisions: Division[] = [];
  let cursor = 0;
  let divNum = 0;

  while (cursor < riders.length) {
    const available = riders.length - cursor;
    divNum += 1;

    // Forced last / remainder division
    const forcedLast =
      available < minDivisionSize ||
      (maxDivisions !== null && divNum >= maxDivisions);

    let size: number;
    let isRemainder: boolean;

    if (forcedLast) {
      size = available;
      isRemainder = true;
    } else {
      size = computeBracketSize(
        riders,
        cursor,
        available,
        minDivisionSize,
        pctThreshold,
        referencePosition,
      );
      isRemainder = false;
    }

    const startIdx = cursor;
    const endIdx = startIdx + size - 1;
    const refTime = getTimeAtPosition(riders, startIdx, referencePosition);

    divisions.push({
      number: divNum,
      startRank: riders[startIdx]!.rank,
      endRank: riders[endIdx]!.rank,
      size,
      referenceRank:
        riders[startIdx + referencePosition - 1]?.rank ?? riders[startIdx]!.rank,
      referenceTime: refTime,
      firstTime: riders[startIdx]!.fastest_seconds,
      thirdTime: getTimeAtPosition(riders, startIdx, 3),
      isRemainder,
    });

    cursor = endIdx + 1;
  }

  // Mark the final division as remainder if it isn't a bracket size
  const lastDiv = divisions[divisions.length - 1];
  if (lastDiv && !isBracketSize(lastDiv.size, minDivisionSize)) {
    lastDiv.isRemainder = true;
  }

  const div1 = divisions[0];
  const div1RefTime = div1?.referenceTime ?? 0;

  const ridersWithDivision: RiderWithDivision[] = riders.map((rider, idx) => {
    const div = divisions.find(
      (d) => rider.rank >= d.startRank && rider.rank <= d.endRank,
    );
    const divNumber = div?.number ?? divisions.length;
    const ownRefTime = div?.referenceTime ?? rider.fastest_seconds;
    const aheadTime = idx > 0 ? riders[idx - 1]!.fastest_seconds : null;

    return {
      ...rider,
      divisionNumber: divNumber,
      divisionRank: div ? rider.rank - div.startRank + 1 : 1,
      pctVsRiderAhead:
        aheadTime != null ? pctSlower(rider.fastest_seconds, aheadTime) : 0,
      pctVsDiv1Ref: pctSlower(rider.fastest_seconds, div1RefTime),
      pctVsOwnRef: pctSlower(rider.fastest_seconds, ownRefTime),
    };
  });

  return { divisions, riders: ridersWithDivision };
}

/** Distinct colours per division for row backgrounds and divider lines */
export const DIVISION_COLORS = [
  "#1a2a3d",
  "#1f2d1a",
  "#2d1f2a",
  "#2a2a1a",
  "#1a2d2d",
  "#2d1a1a",
  "#1f1f2d",
  "#2d2a1a",
];

export function divisionColor(index: number): string {
  return DIVISION_COLORS[index % DIVISION_COLORS.length]!;
}
