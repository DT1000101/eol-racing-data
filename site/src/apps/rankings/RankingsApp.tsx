import { useCallback, useEffect, useMemo, useState } from "react";
import { DATA } from "../../hub/dataPaths";
import type { DirectoryRider, EolData, EventContextSelection, RiderRow, SortKey } from "./types";
import { EventContextModal } from "./components/EventContextModal";
import { PodiumsHallOfFameView } from "./components/PodiumsHallOfFameView";
import { RankingsTable } from "./components/RankingsTable";
import { RiderDirectoryView } from "./components/RiderDirectoryView";
import { RiderProfileModal } from "./components/RiderProfileModal";
import { RookieOfYearView } from "./components/RookieOfYearView";
import { TeamsDirectoryView } from "./components/TeamsDirectoryView";
import { PillBar } from "./components/PillBar";
import { SettingsSheet } from "./components/SettingsSheet";
import { useFavourites } from "./hooks/useFavourites";
import { useIsMobile } from "./hooks/useIsMobile";
import { orderSeasonEvents } from "./utils/orderEvents";
import { parseTeams, riderHasTeam } from "./utils/teams";
import "./styles.css";

type AppView = "rankings" | "directory" | "teams" | "rookie" | "podiums";

export default function RankingsApp() {
  const [data, setData] = useState<EolData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [compactEvents, setCompactEvents] = useState(() => isMobile);
  const [showPosition, setShowPosition] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showTeams, setShowTeams] = useState(() => !isMobile);
  const [highlightPodiums, setHighlightPodiums] = useState(false);
  const [sort, setSort] = useState<SortKey>({ type: "season" });
  const [sortAsc, setSortAsc] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("rankings");
  const [profileRiderId, setProfileRiderId] = useState<string | null>(null);
  const [eventContext, setEventContext] = useState<EventContextSelection | null>(null);
  const { favourites, isFavourite, toggleFavourite } = useFavourites();

  useEffect(() => {
    if (!isMobile || !settingsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, settingsOpen]);

  useEffect(() => {
    fetch(DATA.rankings.main)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`);
        return r.json();
      })
      .then((d: EolData) => {
        setData(d);
        const latest = Math.max(...d.seasons.map((s) => s.id));
        const season = d.seasons.find((s) => s.id === latest)!;
        setSeasonId(latest);
        setCategory(season.defaultCategory);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  const season = data?.seasons.find((s) => s.id === seasonId);
  const events = useMemo(() => {
    const raw =
      seasonId != null ? data?.eventsBySeason[String(seasonId)] ?? [] : [];
    return orderSeasonEvents(raw);
  }, [data, seasonId]);
  const rows: RiderRow[] =
    seasonId != null && category && data
      ? data.rowsBySeasonCategory[String(seasonId)]?.[category] ?? []
      : [];

  const sortedRows = useMemo(() => {
    const list = [...rows];
    const mult = sortAsc ? 1 : -1;
    list.sort((a, b) => {
      if (sort.type === "season") {
        return (a.seasonRank - b.seasonRank) * mult;
      }
      const ap = a.events[sort.eventId]?.position ?? 9999;
      const bp = b.events[sort.eventId]?.position ?? 9999;
      if (ap !== bp) return (ap - bp) * mult;
      return (a.seasonRank - b.seasonRank) * mult;
    });

    if (!teamFilter) return list;

    const onTeam = list
      .filter((r) => riderHasTeam(r.team, teamFilter))
      .sort((a, b) => a.seasonRank - b.seasonRank);
    const rest = list.filter((r) => !riderHasTeam(r.team, teamFilter));
    return [...onTeam, ...rest];
  }, [rows, sort, sortAsc, teamFilter]);

  const onTeamClick = (team: string) => {
    setTeamFilter((prev) => (prev === team ? null : team));
  };

  const directory = data?.riderDirectory;
  const teams2026Count = useMemo(() => {
    const season2026 = data?.seasons.find((s) => s.label === "2026");
    if (!season2026 || !data) return 0;
    const byCategory = data.rowsBySeasonCategory[String(season2026.id)] ?? {};
    const teams = new Set<string>();
    for (const rows of Object.values(byCategory)) {
      for (const rider of rows) {
        for (const team of parseTeams(rider.team)) {
          teams.add(team);
        }
      }
    }
    return teams.size;
  }, [data]);
  const ridersById = useMemo(() => {
    const map = new Map<string, DirectoryRider>();
    for (const r of directory?.riders ?? []) {
      map.set(r.riderId, r);
    }
    return map;
  }, [directory]);

  const profileRider = profileRiderId
    ? ridersById.get(profileRiderId) ?? null
    : null;

  const openRiderProfile = useCallback((riderId: string) => {
    if (ridersById.has(riderId)) {
      setEventContext(null);
      setProfileRiderId(riderId);
    }
  }, [ridersById]);

  useEffect(() => {
    if (!profileRiderId || !profileRider) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [profileRiderId, profileRider]);

  useEffect(() => {
    if (!eventContext) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [eventContext]);

  const onSort = (key: SortKey) => {
    const sameCol =
      sort.type === key.type &&
      (key.type === "season" ||
        (sort.type === "event" && key.type === "event" && sort.eventId === key.eventId));
    if (sameCol) setSortAsc((v) => !v);
    else {
      setSort(key);
      setSortAsc(true);
    }
  };

  if (error) {
    return (
      <div className="app app--error">
        <p>{error}</p>
        <p className="hint">Run: python3 scripts/build_site_data.py</p>
      </div>
    );
  }

  if (!data) {
    return <div className="app app--loading">Loading rankings…</div>;
  }

  if (view === "rankings" && (seasonId == null || !season || !category)) {
    return <div className="app app--loading">Loading rankings…</div>;
  }

  const rule =
    view === "rankings" && seasonId != null
      ? data.leagueRules?.seasons?.[String(seasonId)]
      : undefined;
  const rookie = data.rookieOfYear;
  const podiums = data.podiumsHallOfFame;

  const profileModals =
    directory && profileRider ? (
      <RiderProfileModal
        rider={profileRider}
        directory={directory}
        isFavourite={isFavourite(profileRider.riderId)}
        onToggleFavourite={() => toggleFavourite(profileRider.riderId)}
        highlightPodiums={highlightPodiums}
        onEventSelect={(ctx) => setEventContext(ctx)}
        onClose={() => setProfileRiderId(null)}
      />
    ) : null;

  const eventContextModal =
    directory && eventContext ? (
      <EventContextModal
        selection={eventContext}
        directory={directory}
        highlightPodiums={highlightPodiums}
        onClose={() => setEventContext(null)}
      />
    ) : null;

  const directoryHelp = view === "directory" && directory && (
    <div className="settings-section settings-section--help">
      <p className="settings-help-block">
        Search and sort all riders. Star favourites (saved in this browser). Open a
        profile for season-by-season results; tap an event for nearby finishers.
      </p>
    </div>
  );

  const teamsHelp = view === "teams" && directory && (
    <div className="settings-section settings-section--help">
      <p className="settings-help-block">
        2026-only team view. Combined team labels are split into separate teams (like
        "Flyboi / OWA" to Flyboi and OWA). Tap a team to open details: members, season
        points, and podium/medal breakdown.
      </p>
    </div>
  );

  const displayToggles = view !== "podiums" && view !== "directory" && view !== "teams" && (
    <div className="settings-section">
      <p className="settings-section__label">Display</p>
      <div className="settings-toggles">
        {view === "rankings" && (
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
        {(view === "rankings" || view === "rookie") && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={highlightPodiums}
              onChange={(e) => setHighlightPodiums(e.target.checked)}
            />
            Highlight podiums
          </label>
        )}
      </div>
    </div>
  );

  const podiumsHelp = view === "podiums" && podiums && (
    <div className="settings-section settings-section--help">
      <p className="settings-help-block">
        Riders ranked by EOL podium finishes (1st–3rd). Season and category on each
        badge — the same rider can appear in multiple categories over time.
      </p>
    </div>
  );

  const helpContent = view === "rankings" && (
    <div className="settings-section settings-section--help">
      {rule?.notes && (
        <p className="settings-help-block">
          <strong>Season rules:</strong> {rule.notes}
        </p>
      )}
      <p className="settings-help-block">
        {rule?.tier_system && (
          <>
            <span className="season-legend__swatch season-legend__swatch--tier1" /> Tier 1
            <span className="season-legend__swatch season-legend__swatch--tier2" /> Tier 2
            events are marked in column headers.{" "}
          </>
        )}
        <strong>Pts</strong> = season total (best results where noted).{" "}
        <span className="season-legend__eol">new!</span> in a cell = rider number first assigned
        at that event. Tap a team name to group those riders at the top.
      </p>
      <p className="settings-help-block settings-help-block--muted">
        Tap <strong>Rider</strong> or <strong>Team</strong> column headers in the table to
        expand or compact those columns.
      </p>
    </div>
  );

  const rookieHelp = view === "rookie" && rookie && (
    <div className="settings-section settings-section--help">
      <p className="settings-help-block">
        <strong>Rookie of the Year {rookie.targetSeasonLabel}</strong>
      </p>
      <ul className="settings-rules">
        {rookie.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="settings-help-block settings-help-block--accent">
        {rookie.summary.poolCount} on watch list · {rookie.summary.eligibleCount} eligible
      </p>
      <p className="settings-help-block">
        Tap <strong>More details</strong> on a rider for full race history and qualification
        breakdown.
      </p>
    </div>
  );

  const metaFooter = (
    <p className="settings-meta">
      {view === "rankings" ? (
        <>
          {sortedRows.length} riders shown · {data.meta.riderCount} in database
        </>
      ) : view === "directory" && directory ? (
        <>
          {directory.riders.length} riders in directory
        </>
      ) : view === "teams" && directory ? (
        <>
          {teams2026Count} teams in 2026 directory
        </>
      ) : view === "rookie" && rookie ? (
        <>
          {rookie.summary.poolCount} on watch list · {rookie.summary.eligibleCount} eligible
        </>
      ) : view === "podiums" && podiums ? (
        <>
          {podiums.summary.riderCount} riders · {podiums.summary.podiumCount} podiums
        </>
      ) : null}
      {" · "}
      Updated {new Date(data.meta.generatedAt).toLocaleDateString()}
      {(data.meta.namesToReview ?? 0) > 0 && view === "rankings" && (
        <> · {data.meta.namesToReview} name pairs awaiting review</>
      )}
    </p>
  );

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="header__title">EOL Rankings</span>
          <span className="header__sub">European Onewheel League</span>
        </div>

        {!isMobile && (
          <>
            <nav className="header__nav" aria-label="Main">
              <button
                type="button"
                className={`header__tab ${view === "rankings" ? "header__tab--active" : ""}`}
                onClick={() => setView("rankings")}
              >
                Rankings
              </button>
              <button
                type="button"
                className={`header__tab ${view === "directory" ? "header__tab--active" : ""}`}
                onClick={() => setView("directory")}
              >
                Rider Directory
              </button>
              <button
                type="button"
                className={`header__tab ${view === "teams" ? "header__tab--active" : ""}`}
                onClick={() => setView("teams")}
              >
                Teams Directory
              </button>
              <button
                type="button"
                className={`header__tab ${view === "rookie" ? "header__tab--active" : ""}`}
                onClick={() => setView("rookie")}
              >
                Rookie of the Year
              </button>
              <button
                type="button"
                className={`header__tab ${view === "podiums" ? "header__tab--active" : ""}`}
                onClick={() => setView("podiums")}
              >
                Podium Hall of Fame
              </button>
              <a className="header__tab header__tab--link" href={DATA.rankings.stats}>
                Stats
              </a>
            </nav>
            <div className="header__tools">
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
              {view === "rankings" && (
                <>
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
                </>
              )}
            </div>
          </>
        )}

        {isMobile && (
          <>
            <nav className="mobile-view-nav" aria-label="Main">
              <button
                type="button"
                className={`mobile-view-tab ${view === "rankings" ? "mobile-view-tab--active" : ""}`}
                onClick={() => setView("rankings")}
              >
                Rank
              </button>
              <button
                type="button"
                className={`mobile-view-tab ${view === "directory" ? "mobile-view-tab--active" : ""}`}
                onClick={() => setView("directory")}
              >
                Riders
              </button>
              <button
                type="button"
                className={`mobile-view-tab ${view === "teams" ? "mobile-view-tab--active" : ""}`}
                onClick={() => setView("teams")}
              >
                Teams
              </button>
              <button
                type="button"
                className={`mobile-view-tab ${view === "rookie" ? "mobile-view-tab--active" : ""}`}
                onClick={() => setView("rookie")}
              >
                ROTY
              </button>
              <button
                type="button"
                className={`mobile-view-tab ${view === "podiums" ? "mobile-view-tab--active" : ""}`}
                onClick={() => setView("podiums")}
              >
                Podiums
              </button>
            </nav>
            <button
              type="button"
              className="header__settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
            >
              ⚙
            </button>
          </>
        )}
      </header>

      {isMobile && (
        <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          {displayToggles}
          {helpContent}
          {directoryHelp}
          {teamsHelp}
          {rookieHelp}
          {podiumsHelp}
          {metaFooter}
        </SettingsSheet>
      )}

      {view === "rankings" && season && category ? (
        <>
          <PillBar
            label="Season"
            items={data.seasons.map((s) => ({
              id: String(s.id),
              label: s.label,
            }))}
            active={String(seasonId)}
            onSelect={(id) => {
              const sid = Number(id);
              const s = data.seasons.find((x) => x.id === sid)!;
              setSeasonId(sid);
              if (category && !s.categories.includes(category)) {
                setCategory(s.defaultCategory);
              }
              setSort({ type: "season" });
              setSortAsc(true);
              setTeamFilter(null);
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
              setTeamFilter(null);
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
                <span className="season-legend__eol">new!</span> in a cell = rider number first
                assigned at that event. Click a team name to group riders at the top.
              </span>
            </p>
          )}

          {teamFilter && (
            <p className="team-filter-bar">
              <button
                type="button"
                className="team-filter-bar__clear team-filter-bar__clear--icon"
                onClick={() => setTeamFilter(null)}
                aria-label="Clear team grouping"
                title="Clear team grouping"
              >
                ×
              </button>
              <span>
                <strong>{teamFilter}</strong> riders grouped at top
              </span>
              <button
                type="button"
                className="team-filter-bar__clear"
                onClick={() => setTeamFilter(null)}
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
              {(data.meta.namesToReview ?? 0) > 0 && (
                <span className="footer__muted">
                  {" "}
                  · {data.meta.namesToReview} name pairs awaiting review in source data
                </span>
              )}
            </footer>
          )}
        </>
      ) : view === "directory" ? (
        directory ? (
          <>
            <RiderDirectoryView
              directory={directory}
              favourites={favourites}
              isFavourite={isFavourite}
              onToggleFavourite={toggleFavourite}
              onOpenRider={openRiderProfile}
            />
            {!isMobile && (
              <footer className="footer">
                {directory.riders.length} riders · updated{" "}
                {new Date(data.meta.generatedAt).toLocaleDateString()}
              </footer>
            )}
          </>
        ) : (
          <div className="app app--error">
            <p>Rider directory not loaded. Run build_site_data.py</p>
          </div>
        )
      ) : view === "teams" ? (
        data ? (
          <>
            <TeamsDirectoryView data={data} />
            {!isMobile && (
              <footer className="footer">
                {teams2026Count} teams (2026 only) · updated{" "}
                {new Date(data.meta.generatedAt).toLocaleDateString()}
              </footer>
            )}
          </>
        ) : (
          <div className="app app--error">
            <p>Teams directory not loaded. Run build_site_data.py</p>
          </div>
        )
      ) : view === "rookie" ? (
        rookie ? (
          <>
            <RookieOfYearView data={rookie} highlightPodiums={highlightPodiums} />
            {!isMobile && (
              <footer className="footer">
                {rookie.summary.poolCount} on watch list · {rookie.summary.eligibleCount}{" "}
                eligible · updated {new Date(data.meta.generatedAt).toLocaleDateString()}
              </footer>
            )}
          </>
        ) : (
          <div className="app app--error">
            <p>Rookie data not loaded. Run build_site_data.py</p>
          </div>
        )
      ) : view === "podiums" ? (
        podiums ? (
          <>
            <PodiumsHallOfFameView data={podiums} />
            {!isMobile && (
              <footer className="footer">
                {podiums.summary.riderCount} riders · {podiums.summary.podiumCount} podiums
                · updated {new Date(data.meta.generatedAt).toLocaleDateString()}
              </footer>
            )}
          </>
        ) : (
          <div className="app app--error">
            <p>Podium data not loaded. Run build_site_data.py</p>
          </div>
        )
      ) : null}

      {profileModals}
      {eventContextModal}
    </div>
  );
}
