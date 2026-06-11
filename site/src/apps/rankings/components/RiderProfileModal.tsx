import { useEffect } from "react";
import type {
  DirectoryRider,
  EventContextSelection,
  RiderDirectoryData,
} from "../types";
import { isFinalsEvent } from "../utils/orderEvents";
import { parseTeams } from "../utils/teams";
import { FavouriteButton } from "./FavouriteButton";
import { PositionLabel } from "./PositionLabel";

type Props = {
  rider: DirectoryRider;
  directory: RiderDirectoryData;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  highlightPodiums?: boolean;
  onEventSelect: (ctx: EventContextSelection) => void;
  onClose: () => void;
};

export function RiderProfileModal({
  rider,
  directory,
  isFavourite,
  onToggleFavourite,
  highlightPodiums = false,
  onEventSelect,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const teams =
    rider.teams.length > 0 ? rider.teams : parseTeams(rider.team);

  return (
    <div
      className="rookie-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rookie-modal rider-profile-modal ${
          highlightPodiums ? "rookie-modal--highlight-podiums" : ""
        }`}
        role="dialog"
        aria-labelledby="rider-profile-title"
        aria-modal="true"
      >
        <header className="rookie-modal__header">
          <div className="rider-profile-modal__title-row">
            <div>
              <p className="rookie-modal__eyebrow">Rider profile</p>
              <h2 id="rider-profile-title" className="rookie-modal__title">
                {rider.name}
                {rider.raceNumber != null && (
                  <span className="rookie-modal__num"> #{rider.raceNumber}</span>
                )}
              </h2>
            </div>
            <FavouriteButton
              active={isFavourite}
              onToggle={onToggleFavourite}
              label={rider.name}
              className="fav-btn--lg"
            />
          </div>
          <button
            type="button"
            className="rookie-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {teams.length > 0 && (
          <p className="rider-profile-modal__teams">
            <span className="rider-profile-modal__teams-label">Team</span>
            {teams.join(" / ")}
          </p>
        )}

        <div className="rookie-modal__summary">
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">{rider.eventCount}</span>
            <span className="rookie-modal__stat-l">EOL events</span>
          </div>
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">{rider.podiumCount}</span>
            <span className="rookie-modal__stat-l">podiums</span>
          </div>
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">
              {rider.gold}/{rider.silver}/{rider.bronze}
            </span>
            <span className="rookie-modal__stat-l">🥇🥈🥉</span>
          </div>
        </div>

        {rider.seasons.length === 0 ? (
          <p className="rookie-modal__empty">No season results on record.</p>
        ) : (
          rider.seasons.map((season) => (
            <section key={season.seasonId} className="rider-profile-modal__season">
              <h3 className="rookie-modal__section-title">{season.seasonLabel}</h3>
              {season.categories.map((cat) => (
                <div key={cat.category} className="rider-profile-modal__cat">
                  <p className="rider-profile-modal__cat-head">
                    <span>{cat.categoryLabel}</span>
                    {cat.seasonRank != null && (
                      <span className="rider-profile-modal__cat-rank">
                        Season rank #{cat.seasonRank}
                        {cat.totalPoints != null && ` · ${cat.totalPoints} pts`}
                      </span>
                    )}
                  </p>
                  <p className="rider-profile-modal__hint">
                    Tap an event to view riders around this finish.
                  </p>
                  {cat.events.length === 0 ? (
                    <p className="rookie-modal__empty">No event results listed.</p>
                  ) : (
                    <ul className="rider-profile-modal__events">
                      {cat.events.map((ev) => {
                        const finals = isFinalsEvent({
                          id: ev.eventId,
                          name: ev.eventName,
                          short: "",
                          sortKey: ev.sortKey,
                          isFinals: ev.isFinals,
                        });
                        const hasStandings =
                          directory.eventStandings[
                            `${ev.eventId}|${cat.category}`
                          ] != null;
                        return (
                          <li key={`${ev.eventId}-${cat.category}`}>
                            <button
                              type="button"
                              className={`rider-profile-modal__event-btn ${
                                hasStandings
                                  ? ""
                                  : "rider-profile-modal__event-btn--plain"
                              }`}
                              disabled={!hasStandings}
                              onClick={() =>
                                onEventSelect({
                                  eventId: ev.eventId,
                                  eventName: ev.eventName,
                                  category: cat.category,
                                  categoryLabel: cat.categoryLabel,
                                  seasonLabel: season.seasonLabel,
                                  riderId: rider.riderId,
                                  riderName: rider.name,
                                  position: ev.position,
                                })
                              }
                              title={
                                hasStandings
                                  ? "View results around this finish"
                                  : undefined
                              }
                            >
                              <span className="rider-profile-modal__event-name">
                                {ev.eventName}
                                {finals && (
                                  <span className="rider-profile-modal__finals">
                                    Finals
                                  </span>
                                )}
                              </span>
                              <span className="rider-profile-modal__event-result">
                                {ev.position != null && (
                                  <PositionLabel
                                    position={ev.position}
                                    highlightPodium={highlightPodiums}
                                    className="pos-label--inline"
                                  />
                                )}
                                {ev.points != null && ev.points > 0 && (
                                  <span className="rider-profile-modal__event-pts">
                                    {ev.points} pts
                                  </span>
                                )}
                                {hasStandings && (
                                  <span
                                    className="rider-profile-modal__event-ctx"
                                    aria-hidden
                                  >
                                    ↗
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
