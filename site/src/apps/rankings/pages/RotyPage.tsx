import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { RookieOfYearView } from "../components/RookieOfYearView";
import { useRankingsData } from "../RankingsDataContext";

export function RotyPage() {
  const page = pageMeta("/roty")!;
  const {
    data,
    isMobile,
    rookie,
    highlightPodiums,
    setHighlightPodiums,
  } = useRankingsData();

  if (!data) return null;
  if (!rookie) {
    return (
      <div className="app app--error">
        <p>Rookie data not loaded. Run build_site_data.py</p>
      </div>
    );
  }

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} subtitle={page.pageSubtitle} />
      </div>
      {!isMobile && (
        <div className="rankings-page__toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={highlightPodiums}
              onChange={(e) => setHighlightPodiums(e.target.checked)}
            />
            Highlight podiums
          </label>
        </div>
      )}
      <RookieOfYearView data={rookie} highlightPodiums={highlightPodiums} />
      {!isMobile && (
        <footer className="footer">
          {rookie.summary.poolCount} on watch list · {rookie.summary.eligibleCount}{" "}
          eligible · updated {new Date(data.meta.generatedAt).toLocaleDateString()}
        </footer>
      )}
    </div>
  );
}
