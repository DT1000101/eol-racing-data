import type { CSSProperties } from "react";
import { advanceCount } from "../utils/bracketSimulation";
import type { QualRider, SeedingBracketHeat } from "../utils/seedingTypes";
import { SeedingSlot } from "./SeedingSlot";

interface Props {
  heat: SeedingBracketHeat;
  finishOrder?: QualRider[];
  useNames: boolean;
  simActive: boolean;
  highlightedRiderId: string | null;
  onHoverRider: (riderId: string | null) => void;
  accentColor?: string;
  large?: boolean;
}

export function SeedingHeatBlock({
  heat,
  finishOrder,
  useNames,
  simActive,
  highlightedRiderId,
  onHoverRider,
  accentColor,
  large,
}: Props) {
  const finishRank = new Map(
    finishOrder?.map((r, i) => [r.id, i + 1] as const) ?? [],
  );
  const advancers = advanceCount(heat.stage);
  const hasResult = simActive && finishOrder != null;

  return (
    <div
      className={["heat-block", "seeding-heat", large && "seeding-heat--large"]
        .filter(Boolean)
        .join(" ")}
      style={
        accentColor
          ? ({ "--grid-accent": accentColor } as CSSProperties)
          : undefined
      }
    >
      <span className="heat-block__title">{heat.title}</span>
      {hasResult && (
        <span className="seeding-heat__hint">Gate → finish</span>
      )}
      <div className="starting-grid starting-grid--stack starting-grid--mini">
        {heat.slots.map((slot) => {
          const finishPlace =
            slot.rider != null ? finishRank.get(slot.rider.id) : undefined;
          return (
            <SeedingSlot
              key={slot.gridPosition}
              slot={slot}
              useNames={useNames}
              highlightedRiderId={highlightedRiderId}
              onHoverRider={onHoverRider}
              finishPlace={finishPlace}
              advances={
                finishPlace != null && finishPlace <= advancers && advancers > 0
              }
              mini
            />
          );
        })}
      </div>
    </div>
  );
}
