import { useEffect, useMemo } from "react";
import type { EventContextSelection, RiderDirectoryData } from "../types";
import { buildEventContextView } from "../utils/eventContext";
import { PositionLabel } from "./PositionLabel";

type Props = {
  selection: EventContextSelection;
  directory: RiderDirectoryData;
  highlightPodiums?: boolean;
  onClose: () => void;
};

export function EventContextModal({
  selection,
  directory,
  highlightPodiums = false,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const standingsKey = `${selection.eventId}|${selection.category}`;
  const standings = directory.eventStandings[standingsKey] ?? [];

  const view = useMemo(
    () =>
      buildEventContextView(standings, selection.riderId, selection.position),
    [standings, selection.riderId, selection.position],
  );

  let gapInserted = false;

  return (
    <div
      className="rookie-modal-backdrop event-context-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rookie-modal event-context-modal ${
          highlightPodiums ? "rookie-modal--highlight-podiums" : ""
        }`}
        role="dialog"
        aria-labelledby="event-context-title"
        aria-modal="true"
      >
        <header className="rookie-modal__header">
          <div>
            <p className="rookie-modal__eyebrow">
              {selection.seasonLabel} · {selection.categoryLabel}
            </p>
            <h2 id="event-context-title" className="rookie-modal__title">
              {selection.eventName}
            </h2>
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

        <p className="event-context-modal__lead">
          Results around{" "}
          <strong>{selection.riderName}</strong> (P{selection.position})
        </p>

        {view.rows.length === 0 ? (
          <p className="rookie-modal__empty">No full results list for this event.</p>
        ) : (
          <ol className="event-context-list">
            {view.rows.map((row, i) => {
              const prev = view.rows[i - 1];
              const showEllipsis =
                view.showTopGap &&
                !gapInserted &&
                prev &&
                prev.position <= 3 &&
                row.position > prev.position + 1;
              if (showEllipsis) gapInserted = true;

              return (
                <li key={`${row.position}-${row.riderId}`}>
                  {showEllipsis && (
                    <div className="event-context-list__gap" aria-hidden>
                      …
                    </div>
                  )}
                  <div
                    className={`event-context-row ${
                      row.isFocus ? "event-context-row--focus" : ""
                    } ${row.isMuted ? "event-context-row--muted" : ""}`}
                  >
                    <span className="event-context-row__pos">
                      <PositionLabel
                        position={row.position}
                        highlightPodium={highlightPodiums}
                      />
                    </span>
                    <span className="event-context-row__name">
                      {row.name}
                      {row.raceNumber != null && (
                        <span className="event-context-row__num">
                          {" "}
                          #{row.raceNumber}
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
            {view.showBottomGap && (
              <li className="event-context-list__gap" aria-hidden>
                …
              </li>
            )}
          </ol>
        )}
      </div>
    </div>
  );
}
