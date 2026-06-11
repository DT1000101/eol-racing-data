import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { TeamsDirectoryView } from "../components/TeamsDirectoryView";
import { RankingsMobileSettings } from "../RankingsMobileSettings";
import { useRankingsData } from "../RankingsDataContext";

export function TeamsDirectoryPage() {
  const page = pageMeta("/teams")!;
  const { data, isMobile, teams2026Count } = useRankingsData();

  if (!data) return null;

  const help = (
    <div className="settings-section settings-section--help">
      <p className="settings-help-block">
        2026-only team view. Combined team labels are split into separate teams (like
        &quot;Flyboi / OWA&quot; to Flyboi and OWA). Tap a team for members, season
        points, and podium breakdown.
      </p>
    </div>
  );

  const settingsMeta = (
    <p className="settings-meta">
      {teams2026Count} teams in 2026 directory · Updated{" "}
      {new Date(data.meta.generatedAt).toLocaleDateString()}
    </p>
  );

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} />
        <RankingsMobileSettings help={help} meta={settingsMeta} />
      </div>
      <TeamsDirectoryView data={data} />
      {!isMobile && (
        <footer className="footer">
          {teams2026Count} teams (2026 only) · updated{" "}
          {new Date(data.meta.generatedAt).toLocaleDateString()}
        </footer>
      )}
    </div>
  );
}
