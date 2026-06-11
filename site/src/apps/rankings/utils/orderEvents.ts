import type { SeasonEvent } from "../types";

export function isFinalsEvent(ev: SeasonEvent): boolean {
  if (ev.isFinals) return true;
  if (/-finals-\d{4}$/.test(ev.id)) return true;
  if (/\(finals\)/i.test(ev.name)) return true;
  return false;
}

/** Chronological order with finals / OWAR finals always last. */
export function orderSeasonEvents(events: SeasonEvent[]): SeasonEvent[] {
  return [...events].sort((a, b) => {
    const af = isFinalsEvent(a) ? 1 : 0;
    const bf = isFinalsEvent(b) ? 1 : 0;
    if (af !== bf) return af - bf;
    return a.sortKey - b.sortKey;
  });
}
