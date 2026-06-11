import { useEffect } from "react";
import { EventContextModal } from "./components/EventContextModal";
import { RiderProfileModal } from "./components/RiderProfileModal";
import { useRankingsData } from "./RankingsDataContext";

export function RankingsModals() {
  const {
    directory,
    profileRider,
    closeRiderProfile,
    eventContext,
    setEventContext,
    isFavourite,
    toggleFavourite,
    highlightPodiums,
  } = useRankingsData();

  useEffect(() => {
    if (!profileRider) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [profileRider]);

  useEffect(() => {
    if (!eventContext) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [eventContext]);

  if (!directory) return null;

  return (
    <>
      {profileRider && (
        <RiderProfileModal
          rider={profileRider}
          directory={directory}
          isFavourite={isFavourite(profileRider.riderId)}
          onToggleFavourite={() => toggleFavourite(profileRider.riderId)}
          highlightPodiums={highlightPodiums}
          onEventSelect={(ctx) => setEventContext(ctx)}
          onClose={closeRiderProfile}
        />
      )}
      {eventContext && (
        <EventContextModal
          selection={eventContext}
          directory={directory}
          highlightPodiums={highlightPodiums}
          onClose={() => setEventContext(null)}
        />
      )}
    </>
  );
}
