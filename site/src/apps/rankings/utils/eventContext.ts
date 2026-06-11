import type { EventStandingEntry } from "../types";

export type ContextRow = {
  position: number;
  riderId: string;
  name: string;
  raceNumber: number | null;
  isFocus: boolean;
  isMuted: boolean;
  isPodium?: boolean;
};

export type EventContextView = {
  rows: ContextRow[];
  showTopGap: boolean;
  showBottomGap: boolean;
};

const WINDOW = 5;

export function buildEventContextView(
  standings: EventStandingEntry[],
  focusRiderId: string,
  focusPosition: number,
): EventContextView {
  if (standings.length === 0) {
    return { rows: [], showTopGap: false, showBottomGap: false };
  }

  const byPos = new Map(standings.map((e) => [e.position, e]));
  const maxPos = Math.max(...standings.map((e) => e.position));

  const windowStart = Math.max(1, focusPosition - WINDOW);
  const windowEnd = Math.min(maxPos, focusPosition + WINDOW);

  const topThree = [1, 2, 3].filter((p) => p <= maxPos && byPos.has(p));
  const windowPositions = new Set<number>();
  for (let p = windowStart; p <= windowEnd; p++) windowPositions.add(p);

  const needsTopBlock = topThree.some((p) => !windowPositions.has(p));
  const positions: number[] = [];

  if (needsTopBlock) {
    for (const p of topThree) {
      if (!positions.includes(p)) positions.push(p);
    }
  }

  const gapBeforeWindow =
    needsTopBlock && windowStart > (topThree[topThree.length - 1] ?? 0) + 1;

  if (gapBeforeWindow && windowStart > (positions[positions.length - 1] ?? 0) + 1) {
    // ellipsis handled in UI via showTopGap
  }

  for (let p = windowStart; p <= windowEnd; p++) {
    if (!positions.includes(p)) positions.push(p);
  }

  positions.sort((a, b) => a - b);

  const showTopGap =
    needsTopBlock &&
    positions.length > topThree.length &&
    windowStart > topThree[topThree.length - 1]! + 1;

  const showBottomGap = windowEnd < maxPos;

  const rows: ContextRow[] = positions.map((pos) => {
    const entry = byPos.get(pos)!;
    const isFocus = entry.riderId === focusRiderId;
    const inWindow = pos >= windowStart && pos <= windowEnd;
    const isPodium = pos <= 3;
    return {
      position: pos,
      riderId: entry.riderId,
      name: entry.name,
      raceNumber: entry.raceNumber,
      isFocus,
      isMuted: !isFocus && (needsTopBlock ? !inWindow && !isPodium : !inWindow),
      isPodium: isPodium && needsTopBlock && !inWindow,
    };
  });

  return { rows, showTopGap, showBottomGap };
}
