import type { CSSProperties } from "react";
import { formatLap, riderLabel } from "../utils/generateQualifyingData";
import {
  PLACEHOLDER_ACCENT,
  riderColor,
  riderGlow,
} from "../utils/seedColors";
import type { SeedingBracketSlot } from "../utils/seedingTypes";

const FINISH_LABELS = ["1st", "2nd", "3rd", "4th"] as const;

interface Props {
  slot: SeedingBracketSlot;
  useNames: boolean;
  highlightedRiderId: string | null;
  onHoverRider: (riderId: string | null) => void;
  /** 1–4 when this heat has been simulated */
  finishPlace?: number;
  advances?: boolean;
  mini?: boolean;
}

export function SeedingSlot({
  slot,
  useNames,
  highlightedRiderId,
  onHoverRider,
  finishPlace,
  advances,
  mini,
}: Props) {
  const rider = slot.rider;
  const isKnown = Boolean(rider);
  const isLit =
    isKnown &&
    highlightedRiderId != null &&
    highlightedRiderId === rider!.id;
  const color = isKnown ? riderColor(rider!, isLit) : PLACEHOLDER_ACCENT;
  const showResult = finishPlace != null;

  const qualBadges: string[] = [];
  if (!showResult && rider?.round1Pos) qualBadges.push(`R1:${rider.round1Pos}`);
  if (!showResult && rider?.round2Pos) qualBadges.push(`R2:${rider.round2Pos}`);

  return (
    <div
      className="starting-grid__slot-wrap"
      style={{ marginLeft: (slot.gridPosition - 1) * (mini ? 8 : 9) }}
      onMouseEnter={() => isKnown && onHoverRider(rider!.id)}
      onMouseLeave={() => onHoverRider(null)}
    >
      <div
        className={[
          "starting-grid__slot",
          "seeding-slot",
          isLit && "seeding-slot--lit",
          advances && "seeding-slot--advances",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--grid-accent": color,
            ...(isLit ? { boxShadow: riderGlow(rider!) } : {}),
          } as CSSProperties
        }
      >
        <span className="starting-grid__gate">{slot.gridPosition}</span>
        {showResult && finishPlace != null && (
          <span
            className={`seeding-slot__finish${advances ? " seeding-slot__finish--adv" : ""}`}
            title="Finishing position"
          >
            {FINISH_LABELS[finishPlace - 1]}
          </span>
        )}
        {rider ? (
          <>
            <span
              className="seeding-slot__seed-dot"
              style={{ background: color }}
              title={`Seed ${rider.finalSeed}`}
            />
            <span className="starting-grid__name" title={rider.name}>
              {riderLabel(rider, useNames)}
            </span>
            <div className="starting-grid__meta-row">
              <span className="starting-grid__rank">s{rider.finalSeed}</span>
              {!showResult && rider.round2BestSec != null && (
                <span className="starting-grid__pct">
                  {formatLap(rider.round2BestSec)}
                </span>
              )}
            </div>
            {qualBadges.length > 0 && (
              <div className="seeding-slot__quals">
                {qualBadges.map((b) => (
                  <span key={b} className="seeding-slot__qual-badge">
                    {b}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <span className="starting-grid__placeholder">
            {slot.placeholder ?? slot.label}
          </span>
        )}
      </div>
    </div>
  );
}
