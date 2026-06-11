import type { BracketHeat } from "../utils/eolBracket";
import { StartingGrid } from "./StartingGrid";

interface Props {
  heat: BracketHeat;
  accentColor?: string;
  mini?: boolean;
  shortTitle?: string;
  divisionRefRank?: number;
}

export function HeatBlock({
  heat,
  accentColor,
  mini,
  shortTitle,
  divisionRefRank,
}: Props) {
  const title =
    shortTitle ??
    heat.title
      .replace(/^Semi-final (\d)/, "SF$1")
      .replace(/^Quarter-final (\d)/, "Q$1");

  return (
    <div className={`heat-block${mini ? " heat-block--mini" : ""}`}>
      <span className="heat-block__title">{title}</span>
      <StartingGrid
        slots={heat.slots}
        accentColor={accentColor}
        layout="stack"
        mini={mini}
        divisionRefRank={divisionRefRank}
      />
    </div>
  );
}
