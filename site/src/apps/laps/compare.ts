export interface LapRider {
  rank: number;
  name: string;
  fastest_seconds: number;
  fastest_time: string;
}

export interface LapRow {
  name: string;
  time2025: string | null;
  time2026: string | null;
  sec2025: number | null;
  sec2026: number | null;
  best: number;
  bestTime: string;
  delta: number | null;
  pct: number | null;
  rank2025: number | null;
  rank2026: number | null;
}

const ALIASES: Record<string, string> = {
  "daniel turner": "dan turner",
  "dan turner": "dan turner",
  "henry ld": "henry livingstone dunn",
  "henry dunn": "henry livingstone dunn",
  "henry livingstone dunn": "henry livingstone dunn",
  "zack mcfarlane": "zack mcfarlane",
  "radim klaska": "radim klaska",
  "radom klaska": "radim klaska",
  "fabio costa": "fabio costa",
  "florent audit": "florent audrit",
  "florent audrit": "florent audrit",
  "chantelle warner wells": "chantelle warner wells",
  "qurine posno": "quirine posno",
  "quirine posno": "quirine posno",
  "jonas bukrinski andersen": "jonas andersen",
  "jonas andersen": "jonas andersen",
  "wickor sowinski": "wiktor sowinski",
  "wiktor sowinski": "wiktor sowinski",
  "si oppenheimer": "simon oppenheimer",
  "simon oppenheimer": "simon oppenheimer",
  "adrian kruger": "adrian krige",
  "adrian krige": "adrian krige",
  "lars lot trip": "lars lottrup",
  "lars lottrup": "lars lottrup",
  "jeffrey jaffa gaming": "jaffa gamon",
  "jeffrey gamon": "jaffa gamon",
  "jaffa gamon": "jaffa gamon",
};

const DISPLAY: Record<string, string> = {
  "dan turner": "Dan Turner",
  "henry livingstone dunn": "Henry Livingstone Dunn",
  "zack mcfarlane": "Zack McFarlane",
  "radim klaska": "Radim Klaška",
  "fabio costa": "Fabio Costa",
  "florent audrit": "Florent Audrit",
  "chantelle warner wells": "Chantelle Warner-Wells",
  "quirine posno": "Quirine Posno",
  "jonas andersen": "Jonas Andersen",
  "wiktor sowinski": "Wiktor Sowinski",
  "simon oppenheimer": "Simon Oppenheimer",
  "adrian krige": "Adrian Krige",
  "lars lottrup": "Lars Lottrup",
  "sam o connell": "Sam O'Connell",
  "jaffa gamon": "Jaffa Gamon",
};

export function foldName(name: string): string {
  const text = name
    .replace(/[’‘`]/g, "'")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return ALIASES[text] ?? text;
}

function displayName(key: string, ...riders: Array<LapRider | undefined>): string {
  if (DISPLAY[key]) return DISPLAY[key];
  for (const rider of riders) {
    if (rider) return rider.name;
  }
  return key;
}

function bestByPerson(riders: LapRider[]): Map<string, LapRider> {
  const chosen = new Map<string, LapRider>();
  for (const rider of riders) {
    const key = foldName(rider.name);
    const current = chosen.get(key);
    if (!current || rider.fastest_seconds < current.fastest_seconds) {
      chosen.set(key, rider);
    }
  }
  return chosen;
}

/** 2026 laps left out of the year-on-year comparison. */
const OMIT_2026 = new Set([
  // Seeding lap with three crashes, then a broken collarbone on the next lap.
  "dan turner",
]);

export function buildLapRows(y2025: LapRider[], y2026: LapRider[]): LapRow[] {
  const earlier = bestByPerson(y2025);
  const later = bestByPerson(
    y2026.filter((rider) => !OMIT_2026.has(foldName(rider.name))),
  );
  const keys = new Set([...earlier.keys(), ...later.keys()]);
  const rows: LapRow[] = [];

  for (const key of keys) {
    const a = earlier.get(key);
    const b = later.get(key);
    const sec2025 = a?.fastest_seconds ?? null;
    const sec2026 = b?.fastest_seconds ?? null;
    let best: number;
    if (sec2025 == null) best = sec2026!;
    else if (sec2026 == null) best = sec2025;
    else best = Math.min(sec2025, sec2026);
    const source = a && sec2025 === best ? a : b;
    const delta = a && b ? sec2026! - sec2025! : null;
    rows.push({
      name: displayName(key, b, a),
      time2025: a?.fastest_time ?? null,
      time2026: b?.fastest_time ?? null,
      sec2025,
      sec2026,
      best,
      bestTime: source?.fastest_time ?? "",
      delta,
      pct: delta != null && sec2025 ? (delta / sec2025) * 100 : null,
      rank2025: a?.rank ?? null,
      rank2026: b?.rank ?? null,
    });
  }

  rows.sort((a, b) => a.best - b.best || a.name.localeCompare(b.name));
  return rows;
}

export function signedSeconds(delta: number): string {
  const sign = delta < 0 ? "−" : delta > 0 ? "+" : "";
  const abs = Math.abs(delta);
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  const body =
    minutes > 0
      ? `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`
      : `${seconds.toFixed(3)}s`;
  return `${sign}${body}`;
}

export function signedPercent(pct: number): string {
  const sign = pct < 0 ? "−" : pct > 0 ? "+" : "";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export type SortKey = "name" | "best" | "y2026" | "y2025" | "delta" | "pct" | "rank";

function sortValue(row: LapRow, key: SortKey): number | string | null {
  switch (key) {
    case "name":
      return foldName(row.name);
    case "best":
      return row.best;
    case "y2026":
      return row.sec2026;
    case "y2025":
      return row.sec2025;
    case "delta":
      return row.delta;
    case "pct":
      return row.pct;
    case "rank":
      return row.rank2026;
  }
}

export function sortLapRows(rows: LapRow[], key: SortKey, dir: 1 | -1): LapRow[] {
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av == null && bv == null) return a.name.localeCompare(b.name);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return a.name.localeCompare(b.name);
  });
}
