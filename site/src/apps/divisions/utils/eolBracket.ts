import type { RiderWithDivision } from "../types";

/** EOL_CURRENT quarter seed lists (division-local ranks 1..16). */
export const EOL_QUARTERS_16: number[][] = [
  [1, 8, 9, 13],
  [2, 7, 10, 14],
  [3, 6, 11, 15],
  [4, 5, 12, 16],
];

/** EOL_CURRENT semi composition: (quarterIndex, place) place 0=W 1=RU */
export const EOL_SEMI_SLOTS_16: [number, number][][] = [
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

/** Two semis of four for an 8-rider division — 1 & 2 in separate heats. */
export const EOL_SEMIS_8: number[][] = [
  [1, 4, 5, 8],
  [2, 3, 6, 7],
];

export interface BracketSlot {
  gridPosition: 1 | 2 | 3 | 4;
  /** Division-local seed (1 = fastest in this division). */
  divisionSeed: number;
  label: string;
  rider?: RiderWithDivision;
  /** Placeholder when rider not yet known (e.g. final from semi winner). */
  placeholder?: string;
  /** Source heat + role for advancement arrows */
  source?: { heatId: string; role: "W" | "RU" | "3rd" | "4th" };
}

export interface BracketHeat {
  id: string;
  title: string;
  subtitle?: string;
  slots: BracketSlot[];
}

export interface BracketFlow {
  fromHeatId: string;
  toHeatId: string;
  role: "W" | "RU";
  toGridPosition: 1 | 2 | 3 | 4;
  label: string;
}

export interface DivisionBracket {
  divisionNumber: number;
  size: number;
  heats: BracketHeat[];
  flows: BracketFlow[];
}

function riderByDivisionSeed(
  riders: RiderWithDivision[],
  seed: number,
): RiderWithDivision | undefined {
  return riders.find((r) => r.divisionRank === seed);
}

function slotsFromSeeds(
  seeds: number[],
  riders: RiderWithDivision[],
  placeholders?: (string | undefined)[],
): BracketSlot[] {
  return seeds.map((seed, i) => {
    const rider = riderByDivisionSeed(riders, seed);
    const gridPosition = (i + 1) as 1 | 2 | 3 | 4;
    return {
      gridPosition,
      divisionSeed: seed,
      label: `Seed ${seed}`,
      rider,
      placeholder: placeholders?.[i],
    };
  });
}

function finalSlotsFromSemis(
  semiIds: [string, string],
): { slots: BracketSlot[]; flows: BracketFlow[] } {
  const specs: {
    gridPosition: 1 | 2 | 3 | 4;
    heatId: string;
    role: "W" | "RU";
    label: string;
  }[] = [
    { gridPosition: 1, heatId: semiIds[0], role: "W", label: "Winner SF1" },
    { gridPosition: 2, heatId: semiIds[1], role: "W", label: "Winner SF2" },
    { gridPosition: 3, heatId: semiIds[0], role: "RU", label: "Runner-up SF1" },
    { gridPosition: 4, heatId: semiIds[1], role: "RU", label: "Runner-up SF2" },
  ];

  const slots: BracketSlot[] = specs.map((s) => ({
    gridPosition: s.gridPosition,
    divisionSeed: s.gridPosition,
    label: s.label,
    placeholder: s.label,
    source: { heatId: s.heatId, role: s.role },
  }));

  const flows: BracketFlow[] = specs.map((s) => ({
    fromHeatId: s.heatId,
    toHeatId: "final",
    role: s.role,
    toGridPosition: s.gridPosition,
    label: s.role === "W" ? "Winner →" : "2nd →",
  }));

  return { slots, flows };
}

function semiSlotLabel(quarterIdx: number, place: number): string {
  const q = quarterIdx + 1;
  return place === 0 ? `Winner Q${q}` : `Runner-up Q${q}`;
}

/** Build EOL_CURRENT bracket for a division of 4, 8, or 16 riders. */
export function buildDivisionBracket(
  divisionNumber: number,
  riders: RiderWithDivision[],
): DivisionBracket | null {
  const size = riders.length;
  if (size < 4) return null;

  if (size === 4) {
    return {
      divisionNumber,
      size,
      heats: [
        {
          id: "final",
          title: "Final",
          subtitle: "Gate 1 = head start",
          slots: slotsFromSeeds([1, 2, 3, 4], riders),
        },
      ],
      flows: [],
    };
  }

  if (size === 8) {
    const semi1Id = "sf1";
    const semi2Id = "sf2";
    const { slots: finalSlots, flows } = finalSlotsFromSemis([semi1Id, semi2Id]);

    return {
      divisionNumber,
      size,
      heats: [
        {
          id: semi1Id,
          title: "Semi-final 1",
          subtitle: "Seeds 1 · 4 · 5 · 8",
          slots: slotsFromSeeds(EOL_SEMIS_8[0]!, riders),
        },
        {
          id: semi2Id,
          title: "Semi-final 2",
          subtitle: "Seeds 2 · 3 · 6 · 7",
          slots: slotsFromSeeds(EOL_SEMIS_8[1]!, riders),
        },
        {
          id: "final",
          title: "Final",
          subtitle: "Winners gate 1 & 2 · runners-up 3 & 4",
          slots: finalSlots,
        },
      ],
      flows,
    };
  }

  if (size >= 16) {
    const divRiders = riders.slice(0, 16);
    const semi1Id = "sf1";
    const semi2Id = "sf2";
    const quarterHeats: BracketHeat[] = EOL_QUARTERS_16.map((seeds, qi) => ({
      id: `q${qi + 1}`,
      title: `Quarter-final ${qi + 1}`,
      subtitle: seeds.map((s) => s).join(" · "),
      slots: slotsFromSeeds(seeds, divRiders),
    }));

    const semiHeats: BracketHeat[] = EOL_SEMI_SLOTS_16.map((slots, si) => ({
      id: si === 0 ? semi1Id : semi2Id,
      title: `Semi-final ${si + 1}`,
      subtitle:
        si === 0
          ? "W Q1 · RU Q3 · W Q4 · RU Q2"
          : "W Q2 · RU Q4 · W Q3 · RU Q1",
      slots: slots.map(([qIdx, place], i) => ({
        gridPosition: (i + 1) as 1 | 2 | 3 | 4,
        divisionSeed: i + 1,
        label: semiSlotLabel(qIdx, place),
        placeholder: semiSlotLabel(qIdx, place),
        source: { heatId: `q${qIdx + 1}`, role: place === 0 ? "W" : "RU" },
      })),
    }));

    const { slots: finalSlots, flows: finalFlows } = finalSlotsFromSemis([
      semi1Id,
      semi2Id,
    ]);

    const qFlows: BracketFlow[] = [];
    for (const semi of EOL_SEMI_SLOTS_16) {
      const semiId = semi === EOL_SEMI_SLOTS_16[0] ? semi1Id : semi2Id;
      for (let i = 0; i < semi.length; i++) {
        const [qIdx, place] = semi[i]!;
        qFlows.push({
          fromHeatId: `q${qIdx + 1}`,
          toHeatId: semiId,
          role: place === 0 ? "W" : "RU",
          toGridPosition: (i + 1) as 1 | 2 | 3 | 4,
          label: place === 0 ? "Winner →" : "2nd →",
        });
      }
    }

    return {
      divisionNumber,
      size: divRiders.length,
      heats: [...quarterHeats, ...semiHeats, {
        id: "final",
        title: "Final",
        subtitle: "Top 4 seeds target gates 1–4",
        slots: finalSlots,
      }],
      flows: [...qFlows, ...finalFlows],
    };
  }

  // 5–7, 9–15: show single heat of min(4, size) fastest as preview only
  if (size > 4 && size < 8) {
    const seeds = riders.slice(0, 4).map((r) => r.divisionRank);
    return {
      divisionNumber,
      size,
      heats: [
        {
          id: "heat1",
          title: "Heat (4 riders)",
          subtitle: `${size} in division — bracket needs 4, 8, or 16`,
          slots: slotsFromSeeds(seeds, riders),
        },
      ],
      flows: [],
    };
  }

  return null;
}

export function seedLegend(size: number): string {
  if (size === 4) return "Seed 1 = fastest in division (gate 1, head start)";
  if (size === 8)
    return "Seeds 1 & 2 in separate semis · final gates: W SF1, W SF2, RU SF1, RU SF2";
  if (size >= 16)
    return "EOL_CURRENT: zigzag quarters → mixed semis → final ordered by semi result";
  return "Seed N = Nth fastest in this division";
}
