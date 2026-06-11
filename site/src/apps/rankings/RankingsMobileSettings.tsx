import { SettingsSheet } from "./components/SettingsSheet";
import { useRankingsData } from "./RankingsDataContext";

interface Props {
  variant?: "rankings" | "roty";
  help?: React.ReactNode;
  meta?: React.ReactNode;
}

export function RankingsMobileSettings({
  variant,
  help,
  meta,
}: Props) {
  const {
    isMobile,
    settingsOpen,
    setSettingsOpen,
    showPosition,
    setShowPosition,
    showPoints,
    setShowPoints,
    showTeams,
    setShowTeams,
    compactEvents,
    setCompactEvents,
    highlightPodiums,
    setHighlightPodiums,
  } = useRankingsData();

  if (!isMobile) return null;

  return (
    <>
      <button
        type="button"
        className="rankings-page__settings-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        {(variant === "rankings" || variant === "roty") && (
          <div className="settings-section">
            <p className="settings-section__label">Display</p>
            <div className="settings-toggles">
              {variant === "rankings" && (
                <>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={showPosition}
                      onChange={(e) => setShowPosition(e.target.checked)}
                    />
                    Position
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={showPoints}
                      onChange={(e) => setShowPoints(e.target.checked)}
                    />
                    Points
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={showTeams}
                      onChange={(e) => setShowTeams(e.target.checked)}
                    />
                    Teams
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={compactEvents}
                      onChange={(e) => setCompactEvents(e.target.checked)}
                    />
                    Compact events
                  </label>
                </>
              )}
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={highlightPodiums}
                  onChange={(e) => setHighlightPodiums(e.target.checked)}
                />
                Highlight podiums
              </label>
            </div>
          </div>
        )}
        {help}
        {meta}
      </SettingsSheet>
    </>
  );
}
