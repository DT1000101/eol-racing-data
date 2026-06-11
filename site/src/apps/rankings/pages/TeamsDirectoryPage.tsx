import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { TeamsDirectoryView } from "../components/TeamsDirectoryView";
import { useRankingsData } from "../RankingsDataContext";

export function TeamsDirectoryPage() {
  const page = pageMeta("/teams")!;
  const { data, isMobile, teams2026Count } = useRankingsData();

  if (!data) return null;

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} />
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
