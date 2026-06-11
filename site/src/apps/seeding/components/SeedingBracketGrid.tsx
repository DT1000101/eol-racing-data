import { useMemo } from "react";
import type { CSSProperties } from "react";
import { simulateBracketKnockout } from "../utils/bracketSimulation";
import type { SeedingBracket, SeedingBracketHeat } from "../utils/seedingTypes";
import { SeedingHeatBlock } from "./SeedingHeatBlock";

interface Props {
  bracket: SeedingBracket;
  useNames: boolean;
  simActive: boolean;
  simSeed: number;
  highlightedRiderId: string | null;
  onHoverRider: (riderId: string | null) => void;
}

const COLUMN_LABELS = [
  "8th-finals",
  "Quarter-finals",
  "Semi-finals",
  "Final",
  "Semi-finals",
  "Quarter-finals",
  "8th-finals",
];

/** Eighth-final columns use four rows; inner stages align to the middle pair. */
const EF_ROW_COUNT = 4;

function cellClass(heat: SeedingBracketHeat): string {
  const parts = ["seeding-bracket__cell"];
  if (heat.stage === "sf") parts.push("seeding-bracket__cell--vcenter");
  if (heat.stage === "final") {
    parts.push("seeding-bracket__cell--vcenter", "seeding-bracket__cell--final");
  }
  return parts.join(" ");
}

function cellStyle(heat: SeedingBracketHeat): CSSProperties {
  const col = heat.column + 1;
  if (heat.stage === "sf" || heat.stage === "final") {
    return {
      gridColumn: col,
      gridRow: `1 / ${EF_ROW_COUNT + 1}`,
    };
  }
  return {
    gridColumn: col,
    gridRow: heat.row + 1,
  };
}

export function SeedingBracketGrid({
  bracket,
  useNames,
  simActive,
  simSeed,
  highlightedRiderId,
  onHoverRider,
}: Props) {
  const simulation = useMemo(() => {
    if (!simActive) return null;
    return simulateBracketKnockout(bracket, simSeed);
  }, [bracket, simActive, simSeed]);

  const displayBracket = simulation?.bracket ?? bracket;
  const finishOrder = simulation?.finishOrder;

  return (
    <div className="seeding-bracket">
      <div className="seeding-bracket__col-labels">
        {COLUMN_LABELS.map((label, i) => (
          <span key={label + i} className="seeding-bracket__col-label">
            {label}
          </span>
        ))}
      </div>

      <div
        className="seeding-bracket__grid"
        style={{ gridTemplateRows: `repeat(${EF_ROW_COUNT}, auto)` }}
      >
        {displayBracket.heats.map((heat) => (
          <div
            key={heat.id}
            className={cellClass(heat)}
            style={cellStyle(heat)}
          >
            <SeedingHeatBlock
              heat={heat}
              finishOrder={finishOrder?.get(heat.id)}
              useNames={useNames}
              simActive={simActive}
              highlightedRiderId={highlightedRiderId}
              onHoverRider={onHoverRider}
              large={heat.stage === "final"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
