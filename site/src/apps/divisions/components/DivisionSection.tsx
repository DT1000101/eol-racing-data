import type { CSSProperties } from "react";
import type { Division, ReferencePosition, RiderWithDivision } from "../types";
import { buildDivisionBracket } from "../utils/eolBracket";
import { divisionColor } from "../utils/divisions";
import { formatPct, refPositionLabel } from "../utils/timeFormat";
import { DivisionBracketFlow } from "./DivisionBracketFlow";

interface Props {
  division: Division;
  riders: RiderWithDivision[];
  referencePosition: ReferencePosition;
  div1RefRank: number;
}

export function DivisionSection({
  division,
  riders,
  referencePosition,
  div1RefRank,
}: Props) {
  const accent = divisionColor(division.number - 1);
  const bracket = buildDivisionBracket(division.number, riders);

  return (
    <section
      className="division-section"
      style={{ "--division-accent": accent } as CSSProperties}
    >
      <header className="division-section__header">
        <span
          className="division-section__badge"
          style={{ borderColor: accent }}
        >
          Division {division.number}
          {division.isRemainder && (
            <span className="division-section__remainder">remainder</span>
          )}
        </span>
        <span className="division-section__meta">
          Overall ranks {division.startRank}–{division.endRank} · {division.size}{" "}
          riders · reference rider ({refPositionLabel(referencePosition)}) #
          {division.referenceRank}
        </span>
      </header>

      <div className="division-section__body">
        <div className="division-section__list">
          <table className="rider-list rider-list--division">
            <thead>
              <tr className="col-group-labels">
                <th colSpan={4} className="col-group-label col-group-label--info">
                  Rider
                </th>
                <th colSpan={2} className="col-group-label col-group-label--div">
                  Division
                </th>
                <th colSpan={1} className="col-group-label col-group-label--gap">
                  Gap
                </th>
                <th colSpan={1} className="col-group-label col-group-label--d1">
                  Vs Division 1
                </th>
                <th colSpan={1} className="col-group-label col-group-label--own">
                  vs own division
                </th>
              </tr>
              <tr>
                <th className="col-group col-group--info col-rank">#</th>
                <th className="col-group col-group--info col-name">Rider</th>
                <th className="col-group col-group--info col-cat">Cat</th>
                <th className="col-group col-group--info col-time">Best lap</th>
                <th className="col-group col-group--div col-div col-group--start">
                  Div
                </th>
                <th className="col-group col-group--div col-div-rank"># in Div</th>
                <th className="col-group col-group--gap col-pct col-group--start col-header-stacked">
                  vs next
                  <br />
                  rider
                </th>
                <th className="col-group col-group--d1 col-pct col-group--start col-header-stacked">
                  vs ref
                  <br />
                  rider
                  <br />
                  <span className="col-header-sub">
                    ({refPositionLabel(referencePosition)})
                  </span>
                </th>
                <th className="col-group col-group--own col-pct col-group--start col-header-stacked">
                  vs ref
                  <br />
                  rider
                  <br />
                  <span className="col-header-sub">
                    ({refPositionLabel(referencePosition)})
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {riders.map((rider) => (
                <tr
                  key={rider.rank}
                  className="rider-row"
                  style={{ background: accent }}
                >
                  <td className="col-group col-group--info col-rank">
                    {rider.rank}
                  </td>
                    <td className="col-group col-group--info col-name" title={rider.name}>
                      {rider.name}
                    </td>
                  <td className="col-group col-group--info col-cat">
                    {rider.category}
                  </td>
                  <td className="col-group col-group--info col-time mono">
                    {rider.fastest_time}
                  </td>
                  <td className="col-group col-group--div col-div col-group--start">
                    <span
                      className="div-badge"
                      style={{ background: accent }}
                    >
                      {rider.divisionNumber}
                    </span>
                  </td>
                  <td className="col-group col-group--div col-div-rank">
                    {rider.divisionRank}
                  </td>
                  <td className="col-group col-group--gap col-pct mono col-group--start">
                    {rider.rank === 1 ? "—" : formatPct(rider.pctVsRiderAhead)}
                  </td>
                  <td className="col-group col-group--d1 col-pct mono col-group--start">
                    {rider.rank === div1RefRank
                      ? "—"
                      : formatPct(rider.pctVsDiv1Ref)}
                  </td>
                  <td className="col-group col-group--own col-pct mono col-group--start">
                    {rider.rank === division.referenceRank
                      ? "—"
                      : formatPct(rider.pctVsOwnRef)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bracket && (
          <aside className="division-section__bracket">
            <DivisionBracketFlow
              bracket={bracket}
              accentColor={accent}
              divisionRefRank={division.referenceRank}
            />
          </aside>
        )}
      </div>
    </section>
  );
}
