import { useMemo, useState } from "react";
import "../../divisions/styles.css";
import { generateQualifyingOutcome } from "../utils/generateQualifyingData";
import { buildTop32SeedingBracket } from "../utils/top32Bracket";
import { QUAL_ROUND_META, RoundDuration } from "./RoundDuration";
import { QualifyingResultsTable } from "./QualifyingResultsTable";
import { SeedingBracketGrid } from "./SeedingBracketGrid";
import { SeedingControls } from "./SeedingControls";

export function SeedingVisualizer() {
  const [dataSeed, setDataSeed] = useState(() => Date.now());
  const [useNames, setUseNames] = useState(true);
  const [showLapAttempts, setShowLapAttempts] = useState(true);
  const [simActive, setSimActive] = useState(false);
  const [simSeed, setSimSeed] = useState(() => Date.now());
  const [highlightedRiderId, setHighlightedRiderId] = useState<string | null>(
    null,
  );

  const outcome = useMemo(
    () => generateQualifyingOutcome(dataSeed),
    [dataSeed],
  );

  const bracket = useMemo(
    () => buildTop32SeedingBracket(outcome.riders),
    [outcome.riders],
  );

  const handleRegenerate = () => {
    const next = Date.now();
    setDataSeed(next);
    if (simActive) setSimSeed(next + 1);
  };

  const handleSimToggle = (on: boolean) => {
    setSimActive(on);
    if (on) setSimSeed(Date.now());
  };

  return (
    <div className="seeding-viz">
      <SeedingControls
        useNames={useNames}
        showLapAttempts={showLapAttempts}
        onUseNamesChange={setUseNames}
        onShowLapAttemptsChange={setShowLapAttempts}
        onRegenerate={handleRegenerate}
      />

      <div className="seeding-viz__layout">
        <div className="seeding-viz__qual">
          <div className="seeding-viz__results-grid">
            <details className="seeding-viz__details" open>
              <summary className="seeding-viz__round-summary">
                <span className="seeding-viz__round-title">
                  {QUAL_ROUND_META[1].title}
                </span>
                <RoundDuration minutes={QUAL_ROUND_META[1].minutes} />
                <span className="seeding-viz__round-racers">
                  {QUAL_ROUND_META[1].racers}
                </span>
              </summary>
              <QualifyingResultsTable
                round={1}
                riders={outcome.riders}
                useNames={useNames}
                showLapAttempts={showLapAttempts}
                highlightedRiderId={highlightedRiderId}
                onHoverRider={setHighlightedRiderId}
              />
            </details>

            <details className="seeding-viz__details" open>
              <summary className="seeding-viz__round-summary">
                <span className="seeding-viz__round-title">
                  {QUAL_ROUND_META[2].title}
                </span>
                <RoundDuration minutes={QUAL_ROUND_META[2].minutes} />
                <span className="seeding-viz__round-racers">
                  {QUAL_ROUND_META[2].racers}
                </span>
              </summary>
              <QualifyingResultsTable
                round={2}
                riders={outcome.round1.advancing}
                useNames={useNames}
                showLapAttempts={showLapAttempts}
                highlightedRiderId={highlightedRiderId}
                onHoverRider={setHighlightedRiderId}
              />
            </details>
          </div>
        </div>

        <aside className="seeding-viz__bracket-panel">
          <div className="seeding-viz__bracket-head">
            <h3 className="seeding-viz__bracket-title">Knockout bracket</h3>
            <p className="seeding-viz__bracket-lead">
              Where qualifying seeds land. Toggle simulation to run sample
              head-to-head races through the bracket.
            </p>
            <label className="seeding-viz__sim-toggle">
              <input
                type="checkbox"
                checked={simActive}
                onChange={(e) => handleSimToggle(e.target.checked)}
              />
              Assign random head-to-head results
            </label>
          </div>
          <div className="seeding-viz__bracket-scroll">
            <SeedingBracketGrid
              bracket={bracket}
              useNames={useNames}
              simActive={simActive}
              simSeed={simSeed}
              highlightedRiderId={highlightedRiderId}
              onHoverRider={setHighlightedRiderId}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
