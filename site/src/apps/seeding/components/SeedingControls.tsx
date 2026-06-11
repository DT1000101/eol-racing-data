interface Props {
  useNames: boolean;
  showLapAttempts: boolean;
  onUseNamesChange: (v: boolean) => void;
  onShowLapAttemptsChange: (v: boolean) => void;
  onRegenerate: () => void;
}

export function SeedingControls({
  useNames,
  showLapAttempts,
  onUseNamesChange,
  onShowLapAttemptsChange,
  onRegenerate,
}: Props) {
  return (
    <div className="seeding-controls">
      <label className="seeding-controls__toggle">
        <input
          type="checkbox"
          checked={useNames}
          onChange={(e) => onUseNamesChange(e.target.checked)}
        />
        Show random names
      </label>
      <label className="seeding-controls__toggle">
        <input
          type="checkbox"
          checked={showLapAttempts}
          onChange={(e) => onShowLapAttemptsChange(e.target.checked)}
        />
        Show all lap attempts
      </label>
      <button type="button" className="seeding-controls__btn" onClick={onRegenerate}>
        New sample data
      </button>
    </div>
  );
}
