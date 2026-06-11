import type { CSSProperties } from "react";
import type { BracketSlot } from "../utils/eolBracket";
import { formatPct } from "../utils/timeFormat";

interface Props {
  slots: BracketSlot[];
  accentColor?: string;
  /** Vertical stack with diagonal stagger — narrow */
  layout?: "stack" | "inline";
  mini?: boolean;
  /** Division reference rank — show "—" for pct when rider is the ref. */
  divisionRefRank?: number;
}

/** F1-style C shapes — gate 1 staggered ahead (stack = narrow, inline = wider). */
export function StartingGrid({
  slots,
  accentColor,
  layout = "stack",
  mini,
  divisionRefRank,
}: Props) {
  const cls = [
    "starting-grid",
    layout === "inline" ? "starting-grid--inline" : "starting-grid--stack",
    mini && "starting-grid--mini",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={
        accentColor
          ? ({ "--grid-accent": accentColor } as CSSProperties)
          : undefined
      }
    >
      {slots.map((slot) => (
        <div
          key={slot.gridPosition}
          className="starting-grid__slot-wrap"
          style={
            layout === "stack"
              ? { marginLeft: (slot.gridPosition - 1) * (mini ? 7 : 9) }
              : {
                  marginTop: (slot.gridPosition - 1) * (mini ? 2 : 3),
                  marginLeft: slot.gridPosition > 1 ? 2 : 0,
                }
          }
        >
          <div className="starting-grid__slot">
            <span className="starting-grid__gate">{slot.gridPosition}</span>
            {slot.rider ? (
              <>
                <span className="starting-grid__name" title={slot.rider.name}>
                  {slot.rider.name}
                </span>
                <div className="starting-grid__meta-row">
                  <span className="starting-grid__rank">#{slot.rider.rank}</span>
                  <span className="starting-grid__pct">
                    {divisionRefRank != null &&
                    slot.rider.rank === divisionRefRank
                      ? "—"
                      : formatPct(slot.rider.pctVsOwnRef)}
                  </span>
                </div>
              </>
            ) : (
              <span className="starting-grid__placeholder">
                {slot.placeholder ?? slot.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
