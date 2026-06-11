import { PageHeader } from "../../../hub/PageHeader";
import { pageMeta } from "../../../hub/navConfig";
import { RiderDirectoryView } from "../components/RiderDirectoryView";
import { RankingsMobileSettings } from "../RankingsMobileSettings";
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

  const help = (
    <div className="settings-section settings-section--help">
      <p className="settings-help-block">
        Search and sort all riders. Star favourites (saved in this browser). Open a
        profile for season-by-season results; tap an event for nearby finishers.
      </p>
    </div>
  );

  const settingsMeta = (
    <p className="settings-meta">
      {directory.riders.length} riders in directory · Updated{" "}
      {new Date(data.meta.generatedAt).toLocaleDateString()}
    </p>
  );

  return (
    <div className="rankings-page">
      <div className="rankings-page__toolbar">
        <PageHeader title={page.pageTitle} />
        <RankingsMobileSettings help={help} meta={settingsMeta} />
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
