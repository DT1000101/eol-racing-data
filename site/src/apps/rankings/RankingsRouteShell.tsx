import { Outlet } from "react-router-dom";
import { RankingsDataProvider, useRankingsData } from "./RankingsDataContext";
import { RankingsModals } from "./RankingsModals";

function RankingsRouteInner() {
  const { error, loading } = useRankingsData();

  if (error) {
    return (
      <div className="app app--error rankings-route">
        <p>{error}</p>
        <p className="hint">Run: bash scripts/rankings/rebuild_all.sh</p>
      </div>
    );
  }

  if (loading) {
    return <div className="app app--loading rankings-route">Loading…</div>;
  }

  return (
    <div className="app rankings-route">
      <Outlet />
      <RankingsModals />
    </div>
  );
}

/** Wraps all rankings data routes with shared provider + modals. */
export function RankingsRouteShell() {
  return (
    <RankingsDataProvider>
      <RankingsRouteInner />
    </RankingsDataProvider>
  );
}
