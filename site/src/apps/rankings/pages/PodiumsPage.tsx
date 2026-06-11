import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { PodiumsHallOfFameView } from "../components/PodiumsHallOfFameView";
import { RankingsMobileSettings } from "../RankingsMobileSettings";
import { useRankingsData } from "../RankingsDataContext";

export function PodiumsPage() {
  const page = pageMeta("/podiums")!;
  const { data, isMobile, podiums } = useRankingsData();

  if (!data) return null;
  if (!podiums) {
    return (
      <div className="app app--error">
        <p>Podium data not loaded. Run build_site_data.py</p>
      </div>
    );
  }

  const help = (
    <div className="settings-section settings-section--help">
      <p className="settings-help-block">
        Riders ranked by EOL podium finishes (1st–3rd). Season and category on each
        badge — the same rider can appear in multiple categories over time.
      </p>
    </div>
  );

  const settingsMeta = (
    <p className="settings-meta">
      {podiums.summary.riderCount} riders · {podiums.summary.podiumCount} podiums ·
      Updated {new Date(data.meta.generatedAt).toLocaleDateString()}
    </p>
  );

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} />
        <RankingsMobileSettings help={help} meta={settingsMeta} />
      </div>
      <PodiumsHallOfFameView data={podiums} />
      {!isMobile && (
        <footer className="footer">
          {podiums.summary.riderCount} riders · {podiums.summary.podiumCount}{" "}
          podiums · updated {new Date(data.meta.generatedAt).toLocaleDateString()}
        </footer>
      )}
    </div>
  );
}
