import { StartingGrid } from "./StartingGrid";
import type { BracketSlot } from "../utils/eolBracket";

/** Standalone demo page for the starting grid component. */
export function StartingGridDemo() {
  const demoSlots: BracketSlot[] = [
    {
      gridPosition: 1,
      divisionSeed: 1,
      label: "Seed 1",
      rider: {
        rank: 1,
        race_number: 52,
        name: "Jay Kenward",
        category: "Open",
        tt_pos_in_category: 1,
        fastest_seconds: 126.9,
        fastest_time: "02:06.900",
        divisionNumber: 1,
        divisionRank: 1,
        pctVsRiderAhead: 0,
        pctVsDiv1Ref: 0,
        pctVsOwnRef: 0,
      },
    },
    {
      gridPosition: 2,
      divisionSeed: 4,
      label: "Seed 4",
      rider: {
        rank: 4,
        race_number: 123,
        name: "Alexis Matton",
        category: "Open",
        tt_pos_in_category: 4,
        fastest_seconds: 134.693,
        fastest_time: "02:14.693",
        divisionNumber: 1,
        divisionRank: 4,
        pctVsRiderAhead: 0.5,
        pctVsDiv1Ref: 6.1,
        pctVsOwnRef: 6.1,
      },
    },
    {
      gridPosition: 3,
      divisionSeed: 5,
      label: "Seed 5",
      rider: {
        rank: 5,
        race_number: 40,
        name: "Jeffrey Gamon",
        category: "Open",
        tt_pos_in_category: 5,
        fastest_seconds: 141.097,
        fastest_time: "02:21.097",
        divisionNumber: 1,
        divisionRank: 5,
        pctVsRiderAhead: 4.8,
        pctVsDiv1Ref: 11.2,
        pctVsOwnRef: 11.2,
      },
    },
    {
      gridPosition: 4,
      divisionSeed: 8,
      label: "Seed 8",
      rider: {
        rank: 8,
        race_number: 64,
        name: "Samuel OConnell",
        category: "Open",
        tt_pos_in_category: 8,
        fastest_seconds: 145.213,
        fastest_time: "02:25.213",
        divisionNumber: 1,
        divisionRank: 8,
        pctVsRiderAhead: 2.9,
        pctVsDiv1Ref: 14.4,
        pctVsOwnRef: 14.4,
      },
    },
  ];

  return (
    <div className="grid-demo">
      <h1>Starting grid</h1>
      <p className="grid-demo__hint">
        Gate 1 is staggered ahead (head start). Each slot is a downward-facing C —
        open at the bottom, like an F1 grid cell.
      </p>
      <StartingGrid
        slots={demoSlots}
        accentColor="#3d6a9e"
        layout="stack"
        divisionRefRank={3}
      />
    </div>
  );
}
