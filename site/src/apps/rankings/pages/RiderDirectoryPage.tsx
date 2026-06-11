import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { RiderDirectoryView } from "../components/RiderDirectoryView";
import { useRankingsData } from "../RankingsDataContext";

export function RiderDirectoryPage() {
  const page = pageMeta("/rider-directory")!;
  const {
    data,
    isMobile,
    directory,
    favourites,
    isFavourite,
    toggleFavourite,
    openRiderProfile,
  } = useRankingsData();

  if (!data) return null;
  if (!directory) {
    return (
      <div className="app app--error">
        <p>Rider directory not loaded. Run build_site_data.py</p>
      </div>
    );
  }

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} />
      </div>
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
    </div>
  );
}
