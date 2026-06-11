import type {
  QualRider,
  SeedingBracket,
  SeedingBracketHeat,
  SeedingBracketSlot,
} from "./seedingTypes";

/** EOL-style zigzag for 8 heats of four (32 riders). */
export const EOL_EIGHTH_FINALS_32: number[][] = [
  [1, 16, 17, 32],
  [2, 15, 18, 31],
  [3, 14, 19, 30],
  [4, 13, 20, 29],
  [5, 12, 21, 28],
  [6, 11, 22, 27],
  [7, 10, 23, 26],
  [8, 9, 24, 25],
];

/**
 * Which eighth-finals feed each quarter (top 2 from each EF).
 * Same-side pairing: top EFs → top QF, bottom EFs → bottom QF (EOL heats 1+3→Q1, 2+4→Q2, etc.).
 */
const QF_EF_PAIRS: [number, number][] = [
  [0, 2], // QF1 ← EF1 + EF3
  [1, 3], // QF2 ← EF2 + EF4
  [5, 7], // QF3 ← EF6 + EF8
  [4, 6], // QF4 ← EF5 + EF7
];

/** EOL mixed semi slots from quarters — same cross pattern as top 16. */
const SEMI_QF_SLOTS: [number, number][][] = [
  [
    [0, 0],
    [2, 1],
    [3, 0],
    [1, 1],
  ],
  [
    [1, 0],
    [3, 1],
    [2, 0],
    [0, 1],
  ],
];

function riderBySeed(
  riders: QualRider[],
  seed: number,
): QualRider | undefined {
  return riders.find((r) => r.finalSeed === seed);
}

function slotsFromSeeds(
  seeds: number[],
  riders: QualRider[],
  placeholders?: (string | undefined)[],
): SeedingBracketSlot[] {
  return seeds.map((seed, i) => {
    const rider = riderBySeed(riders, seed);
    return {
      gridPosition: (i + 1) as 1 | 2 | 3 | 4,
      bracketSeed: seed,
      label: `Seed ${seed}`,
      rider,
      placeholder: placeholders?.[i],
    };
  });
}

function efSlotLabel(efIdx: number, place: number): string {
  const roles = ["Winner", "2nd", "3rd", "4th"];
  return `${roles[place]} EF${efIdx + 1}`;
}

function qfSlotLabel(qIdx: number, place: number): string {
  return place === 0 ? `Winner QF${qIdx + 1}` : `Runner-up QF${qIdx + 1}`;
}

/**
 * 7-column horizontal bracket:
 * L-EF | QF1/QF4 | SF1 | Final | SF2 | QF2/QF3 | R-EF
 * Corner seeds: 1 TL, 2 TR, 3 BR, 4 BL (EOL corner order).
 */
export function buildTop32SeedingBracket(riders: QualRider[]): SeedingBracket {
  const heats: SeedingBracketHeat[] = [];
  const seedToHeatSlot = new Map<
    number,
    { heatId: string; gridPosition: number }
  >();

  const leftEfIndices = [0, 2, 4, 6];
  const rightEfIndices = [1, 3, 5, 7];

  leftEfIndices.forEach((efIdx, row) => {
    const id = `ef${efIdx + 1}`;
    const seeds = EOL_EIGHTH_FINALS_32[efIdx]!;
    heats.push({
      id,
      stage: "ef",
      title: `8th ${efIdx + 1}`,
      subtitle: seeds.join(" · "),
      column: 0,
      row,
      slots: slotsFromSeeds(seeds, riders),
    });
    seeds.forEach((seed, i) => {
      seedToHeatSlot.set(seed, { heatId: id, gridPosition: i + 1 });
    });
  });

  rightEfIndices.forEach((efIdx, row) => {
    const id = `ef${efIdx + 1}`;
    const seeds = EOL_EIGHTH_FINALS_32[efIdx]!;
    heats.push({
      id,
      stage: "ef",
      title: `8th ${efIdx + 1}`,
      subtitle: seeds.join(" · "),
      column: 6,
      row,
      slots: slotsFromSeeds(seeds, riders),
    });
  });

  const quarterHeats: SeedingBracketHeat[] = QF_EF_PAIRS.map(
    ([a, b], qi) => {
      const id = `qf${qi + 1}`;
      const slots: SeedingBracketSlot[] = [
        {
          gridPosition: 1,
          bracketSeed: qi * 4 + 1,
          label: efSlotLabel(a, 0),
          placeholder: efSlotLabel(a, 0),
          source: { heatId: `ef${a + 1}`, role: "W" },
        },
        {
          gridPosition: 2,
          bracketSeed: qi * 4 + 2,
          label: efSlotLabel(a, 1),
          placeholder: efSlotLabel(a, 1),
          source: { heatId: `ef${a + 1}`, role: "RU" },
        },
        {
          gridPosition: 3,
          bracketSeed: qi * 4 + 3,
          label: efSlotLabel(b, 0),
          placeholder: efSlotLabel(b, 0),
          source: { heatId: `ef${b + 1}`, role: "W" },
        },
        {
          gridPosition: 4,
          bracketSeed: qi * 4 + 4,
          label: efSlotLabel(b, 1),
          placeholder: efSlotLabel(b, 1),
          source: { heatId: `ef${b + 1}`, role: "RU" },
        },
      ];
      return {
        id,
        stage: "qf" as const,
        title: `Quarter ${qi + 1}`,
        subtitle: `EF${a + 1} + EF${b + 1}`,
        column: qi === 0 || qi === 3 ? 1 : 5,
        row: qi === 0 || qi === 1 ? 1 : 2,
        slots,
      };
    },
  );
  heats.push(...quarterHeats);

  const semiHeats: SeedingBracketHeat[] = SEMI_QF_SLOTS.map((spec, si) => {
    const id = si === 0 ? "sf1" : "sf2";
    return {
      id,
      stage: "sf",
      title: `Semi ${si + 1}`,
      subtitle:
        si === 0
          ? "W QF1 · RU QF3 · W QF4 · RU QF2"
          : "W QF2 · RU QF4 · W QF3 · RU QF1",
      column: si === 0 ? 2 : 4,
      row: 0,
      slots: spec.map(([qIdx, place], i) => ({
        gridPosition: (i + 1) as 1 | 2 | 3 | 4,
        bracketSeed: si * 4 + i + 1,
        label: qfSlotLabel(qIdx, place),
        placeholder: qfSlotLabel(qIdx, place),
        source: {
          heatId: `qf${qIdx + 1}`,
          role: place === 0 ? "W" : "RU",
        },
      })),
    };
  });
  heats.push(...semiHeats);

  heats.push({
    id: "final",
    stage: "final",
    title: "Final",
    subtitle: "Gates 1–4 by semi result",
    column: 3,
    row: 0,
    slots: [
      {
        gridPosition: 1,
        bracketSeed: 1,
        label: "Winner SF1",
        placeholder: "Winner SF1",
        source: { heatId: "sf1", role: "W" },
      },
      {
        gridPosition: 2,
        bracketSeed: 2,
        label: "Winner SF2",
        placeholder: "Winner SF2",
        source: { heatId: "sf2", role: "W" },
      },
      {
        gridPosition: 3,
        bracketSeed: 3,
        label: "Runner-up SF1",
        placeholder: "Runner-up SF1",
        source: { heatId: "sf1", role: "RU" },
      },
      {
        gridPosition: 4,
        bracketSeed: 4,
        label: "Runner-up SF2",
        placeholder: "Runner-up SF2",
        source: { heatId: "sf2", role: "RU" },
      },
    ],
  });

  return { heats, seedToHeatSlot };
}
