import { Fragment } from "react";
import type { CSSProperties } from "react";
import { formatLap, riderLabel } from "../utils/generateQualifyingData";
import { riderColor, riderGlow } from "../utils/seedColors";
import type { QualRider } from "../utils/seedingTypes";

interface Props {
  round: 1 | 2;
  riders: QualRider[];
  useNames: boolean;
  showLapAttempts: boolean;
  highlightedRiderId: string | null;
  onHoverRider: (riderId: string | null) => void;
}

const CUTOFF: Record<1 | 2, number> = { 1: 20, 2: 8 };
const MAX_ATTEMPTS: Record<1 | 2, number> = { 1: 4, 2: 3 };

export function QualifyingResultsTable({
  round,
  riders,
  useNames,
  showLapAttempts,
  highlightedRiderId,
  onHoverRider,
}: Props) {
  const cutoff = CUTOFF[round];
  const maxAttempts = MAX_ATTEMPTS[round];
  const lapsHidden = showLapAttempts ? "" : " qual-results__col--hidden";
  const bestHidden = showLapAttempts ? " qual-results__col--hidden" : "";

  const sorted = [...riders].sort((a, b) => {
    const posA = round === 1 ? a.round1Pos! : a.round2Pos!;
    const posB = round === 1 ? b.round1Pos! : b.round2Pos!;
    return posA - posB;
  });

  const cutoffLabel =
    round === 1
      ? "Bottom 12 — out of Round 2, seeds 21–32"
      : "Bottom 12 — seeds 9–20";

  return (
    <div
      className={
        showLapAttempts
          ? "qual-results qual-results--attempts"
          : "qual-results"
      }
    >
      <table className="qual-results__table">
        <thead>
          <tr>
            <th className="qual-results__th-pos">#</th>
            <th>Rider</th>
            <th className={`qual-results__th-laps${lapsHidden}`}>Laps</th>
            <th className={`qual-results__th-best${bestHidden}`}>Best</th>
            <th className="qual-results__th-seed">Seed</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const isLit = highlightedRiderId === r.id;
            const laps = (round === 1 ? r.round1Laps : r.round2Laps!).slice(
              0,
              maxAttempts,
            );
            const best =
              round === 1 ? r.round1BestSec : r.round2BestSec!;
            const pos = round === 1 ? r.round1Pos! : r.round2Pos!;
            const isDropped = pos > cutoff;
            const showCutoff = pos === cutoff + 1;
            const seedKnown = round === 1 ? pos > cutoff : true;

            return (
              <Fragment key={r.id}>
                {showCutoff && (
                  <tr className="qual-results__cutoff">
                    <td colSpan={5}>
                      <span>{cutoffLabel}</span>
                    </td>
                  </tr>
                )}
                <tr
                  className={[
                    "qual-results__row",
                    isLit && "qual-results__row--lit",
                    isDropped && "qual-results__row--dropped",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      "--row-accent": riderColor(r, isLit),
                      ...(isLit ? { boxShadow: riderGlow(r) } : {}),
                    } as CSSProperties
                  }
                  onMouseEnter={() => onHoverRider(r.id)}
                  onMouseLeave={() => onHoverRider(null)}
                >
                  <td>
                    <span
                      className="qual-results__pos"
                      style={{ borderColor: riderColor(r, isLit) }}
                    >
                      {pos}
                    </span>
                  </td>
                  <td className="qual-results__rider">{riderLabel(r, useNames)}</td>
                  <td className={lapsHidden.trim() || undefined}>
                    <div className="qual-results__laps">
                      {laps.map((lap, i) => (
                        <span
                          key={i}
                          className={
                            lap.timeSec === best
                              ? "qual-results__lap qual-results__lap--best"
                              : "qual-results__lap"
                          }
                        >
                          {formatLap(lap.timeSec)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`qual-results__best${bestHidden}`}>
                    {formatLap(best)}
                  </td>
                  <td>
                    <span
                      className={
                        seedKnown
                          ? "qual-results__seed"
                          : "qual-results__seed qual-results__seed--tbd"
                      }
                      style={
                        seedKnown
                          ? { color: riderColor(r, isLit) }
                          : undefined
                      }
                    >
                      {seedKnown ? r.finalSeed : "TBD"}
                    </span>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
