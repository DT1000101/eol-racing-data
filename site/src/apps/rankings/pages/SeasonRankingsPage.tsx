import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { PillBar } from "../components/PillBar";
import { RankingsTable } from "../components/RankingsTable";
import { RankingsMobileSettings } from "../RankingsMobileSettings";
import { useRankingsData } from "../RankingsDataContext";

export function SeasonRankingsPage() {
  const page = pageMeta("/rankings")!;
  const {
    data,
    isMobile,
    seasonId,
    setSeasonId,
    category,
    setCategory,
    season,
    events,
    sortedRows,
    compactEvents,
    setCompactEvents,
    showPosition,
    setShowPosition,
    showPoints,
    setShowPoints,
    showTeams,
    setShowTeams,
    highlightPodiums,
    setHighlightPodiums,
    teamFilter,
    clearTeamFilter,
    onTeamClick,
    sort,
    sortAsc,
    onSort,
    directory,
    isFavourite,
    toggleFavourite,
    openRiderProfile,
    rule,
  } = useRankingsData();

  if (!data || !season || !category || seasonId == null) {
    return <div className="app app--loading">Loading rankings…</div>;
  }

  const help = (
    <div className="settings-section settings-section--help">
      {rule?.notes && (
        <p className="settings-help-block">
          <strong>Season rules:</strong> {rule.notes}
        </p>
      )}
      <p className="settings-help-block">
        {rule?.tier_system && (
          <>
            <span className="season-legend__swatch season-legend__swatch--tier1" />{" "}
            Tier 1
            <span className="season-legend__swatch season-legend__swatch--tier2" />{" "}
            Tier 2 events are marked in column headers.{" "}
          </>
        )}
        <strong>Pts</strong> = season total (best results where noted).{" "}
        <span className="season-legend__eol">new!</span> in a cell = rider number
        first assigned at that event. Tap a team name to group those riders at the
        top.
      </p>
    </div>
  );

  const settingsMeta = (
    <p className="settings-meta">
      {sortedRows.length} riders shown · {data.meta.riderCount} in database · Updated{" "}
      {new Date(data.meta.generatedAt).toLocaleDateString()}
      {(data.meta.namesToReview ?? 0) > 0 && (
        <> · {data.meta.namesToReview} name pairs awaiting review</>
      )}
    </p>
  );

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} />
        <RankingsMobileSettings help={help} meta={settingsMeta} />
      </div>

      {!isMobile && (
        <div className="rankings-page__toggles">
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
            Compact
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={highlightPodiums}
              onChange={(e) => setHighlightPodiums(e.target.checked)}
            />
            Podiums
          </label>
        </div>
      )}

      <PillBar
        label="Season"
        items={data.seasons.map((s) => ({ id: String(s.id), label: s.label }))}
        active={String(seasonId)}
        onSelect={(id) => {
          const sid = Number(id);
          const s = data.seasons.find((x) => x.id === sid)!;
          setSeasonId(sid);
          if (category && !s.categories.includes(category)) {
            setCategory(s.defaultCategory);
          }
        }}
      />

      <PillBar
        label="Category"
        items={season.categories.map((c) => ({
          id: c,
          label: season.categoryLabels[c] ?? c,
        }))}
        active={category}
        onSelect={(c) => {
          setCategory(c);
          clearTeamFilter();
        }}
      />

      {!isMobile && rule?.notes && <p className="season-note">{rule.notes}</p>}

      {!isMobile && (
        <p className="season-legend">
          {rule?.tier_system && (
            <>
              <span className="season-legend__swatch season-legend__swatch--tier1" />
              Tier 1
              <span className="season-legend__swatch season-legend__swatch--tier2" />
              Tier 2
              <span className="season-legend__sep">·</span>
            </>
          )}
          <span className="season-legend__hint">
            Pts = season total (best results where noted).{" "}
            <span className="season-legend__eol">new!</span> in a cell = rider number
            first assigned at that event.
          </span>
        </p>
      )}

      {teamFilter && (
        <p className="team-filter-bar">
          <button
            type="button"
            className="team-filter-bar__clear team-filter-bar__clear--icon"
            onClick={clearTeamFilter}
            aria-label="Clear team grouping"
          >
            ×
          </button>
          <span>
            <strong>{teamFilter}</strong> riders grouped at top
          </span>
          <button
            type="button"
            className="team-filter-bar__clear"
            onClick={clearTeamFilter}
          >
            Clear
          </button>
        </p>
      )}

      <RankingsTable
        key={`${seasonId}-${category}`}
        rows={sortedRows}
        events={events}
        compact={compactEvents}
        showPosition={showPosition}
        showPoints={showPoints}
        showTeams={showTeams}
        highlightPodiums={highlightPodiums}
        teamFilter={teamFilter}
        onTeamClick={onTeamClick}
        sort={sort}
        sortAsc={sortAsc}
        onSort={onSort}
        isFavourite={directory ? isFavourite : undefined}
        onToggleFavourite={directory ? toggleFavourite : undefined}
        onRiderClick={directory ? openRiderProfile : undefined}
      />

      {!isMobile && (
        <footer className="footer">
          {sortedRows.length} riders · {data.meta.riderCount} in database · updated{" "}
          {new Date(data.meta.generatedAt).toLocaleDateString()}
        </footer>
      )}
    </div>
  );
}
