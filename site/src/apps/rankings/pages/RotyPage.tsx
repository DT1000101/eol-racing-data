import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { RookieOfYearView } from "../components/RookieOfYearView";
import { RankingsMobileSettings } from "../RankingsMobileSettings";
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

  const help = (
    <>
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
          {rookie.summary.poolCount} on watch list · {rookie.summary.eligibleCount}{" "}
          eligible
        </p>
      </div>
    </>
  );

  const settingsMeta = (
    <p className="settings-meta">
      {rookie.summary.poolCount} on watch list · {rookie.summary.eligibleCount}{" "}
      eligible · Updated {new Date(data.meta.generatedAt).toLocaleDateString()}
    </p>
  );

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} subtitle={page.pageSubtitle} />
        <RankingsMobileSettings variant="roty" help={help} meta={settingsMeta} />
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
