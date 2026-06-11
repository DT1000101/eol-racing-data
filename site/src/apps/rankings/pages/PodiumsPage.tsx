import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { PodiumsHallOfFameView } from "../components/PodiumsHallOfFameView";
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

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} />
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
