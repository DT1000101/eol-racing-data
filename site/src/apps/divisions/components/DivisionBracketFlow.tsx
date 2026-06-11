import type { CSSProperties } from "react";
import type { DivisionBracket } from "../utils/eolBracket";
import { HeatBlock } from "./HeatBlock";

interface Props {
  bracket: DivisionBracket;
  accentColor: string;
  divisionRefRank: number;
}

/** Quarter grid: Q1 TL, Q2 TR, Q4 BL, Q3 BR (matches EOL bracket corners). */
const QUARTER_GRID_ORDER = ["q1", "q2", "q4", "q3"] as const;

export function DivisionBracketFlow({
  bracket,
  accentColor,
  divisionRefRank,
}: Props) {
  const quartersById = Object.fromEntries(
    bracket.heats.filter((h) => h.id.startsWith("q")).map((h) => [h.id, h]),
  );
  const sf1 = bracket.heats.find((h) => h.id === "sf1");
  const sf2 = bracket.heats.find((h) => h.id === "sf2");
  const finalHeat = bracket.heats.find((h) => h.id === "final");
  const solo = bracket.heats.filter(
    (h) => !h.id.startsWith("q") && !h.id.startsWith("sf") && h.id !== "final",
  );

  const hasSemis = sf1 || sf2;

  return (
    <div
      className="division-bracket"
      style={{ "--bracket-accent": accentColor } as CSSProperties}
      title={bracketSizeHint(bracket.size)}
    >
      {QUARTER_GRID_ORDER.some((id) => quartersById[id]) && (
        <div className="division-bracket__quarters">
          {QUARTER_GRID_ORDER.map((id) => {
            const h = quartersById[id];
            if (!h) return null;
            return (
              <HeatBlock
                key={h.id}
                heat={h}
                accentColor={accentColor}
                mini
                shortTitle={h.id.toUpperCase()}
                divisionRefRank={divisionRefRank}
              />
            );
          })}
        </div>
      )}

      {hasSemis && (
        <div className="division-bracket__semi-row">
          {sf1 && (
            <HeatBlock
              heat={sf1}
              accentColor={accentColor}
              shortTitle="SF1"
              divisionRefRank={divisionRefRank}
            />
          )}
          {sf2 && (
            <HeatBlock
              heat={sf2}
              accentColor={accentColor}
              shortTitle="SF2"
              divisionRefRank={divisionRefRank}
            />
          )}
        </div>
      )}

      {hasSemis && finalHeat && (
        <div className="division-bracket__merge" aria-hidden>
          <span className="division-bracket__merge-line">↘</span>
          <span className="division-bracket__merge-line">↙</span>
        </div>
      )}

      {finalHeat && (
        <div className="division-bracket__final-row">
          <HeatBlock
            heat={finalHeat}
            accentColor={accentColor}
            shortTitle="Final"
            divisionRefRank={divisionRefRank}
          />
        </div>
      )}

      {solo.map((h) => (
        <HeatBlock
          key={h.id}
          heat={h}
          accentColor={accentColor}
          shortTitle={h.title}
          divisionRefRank={divisionRefRank}
        />
      ))}
    </div>
  );
}

function bracketSizeHint(size: number): string {
  if (size === 4) return "Final — gate 1 = head start";
  if (size === 8) return "SF1 (1·4·5·8) + SF2 (2·3·6·7) → Final; W/RU fill gates 1–4";
  if (size >= 16) return "EOL quarters → mixed semis → final";
  return "";
}
