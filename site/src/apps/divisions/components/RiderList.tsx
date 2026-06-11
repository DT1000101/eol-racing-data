import { useMemo, type CSSProperties } from "react";
import type { Division, ReferencePosition, RiderWithDivision } from "../types";
import { DivisionSection } from "./DivisionSection";

interface Props {
  riders: RiderWithDivision[];
  divisions: Division[];
  referencePosition: ReferencePosition;
}

export function RiderList({
  riders,
  divisions,
  referencePosition,
}: Props) {
  const div1 = divisions[0];
  const div1RefRank = div1?.referenceRank ?? 1;

  const listStyle = useMemo((): CSSProperties => {
    const maxLen = riders.reduce(
      (longest, r) => Math.max(longest, r.name.length),
      4,
    );
    const capped = Math.min(maxLen, 22);
    return {
      "--rider-name-width": `calc(${capped}ch + 0.75rem)`,
    } as CSSProperties;
  }, [riders]);

  return (
    <div className="rider-list-wrap" style={listStyle}>
      {divisions.map((div) => {
        const divRiders = riders.filter(
          (r) => r.rank >= div.startRank && r.rank <= div.endRank,
        );
        return (
          <DivisionSection
            key={div.number}
            division={div}
            riders={divRiders}
            referencePosition={referencePosition}
            div1RefRank={div1RefRank}
          />
        );
      })}
    </div>
  );
}
