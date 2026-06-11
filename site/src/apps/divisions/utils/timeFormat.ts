/** Percentage slower than reference: ((time - ref) / ref) * 100 */
export function pctSlower(time: number, refTime: number): number {
  if (refTime <= 0) return 0;
  return ((time - refTime) / refTime) * 100;
}

export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Ordinal label for reference position in a division (1 → "1st"). */
export function refPositionLabel(position: 1 | 2 | 3 | 4): string {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return "4th";
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}
