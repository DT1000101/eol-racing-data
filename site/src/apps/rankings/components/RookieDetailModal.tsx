import { useEffect } from "react";
import type { RookieContender } from "../types";
import { getRookieStatus } from "../utils/rookieSort";
import { PositionLabel } from "./PositionLabel";

type Props = {
  contender: RookieContender;
  targetSeasonLabel: string;
  highlightPodiums?: boolean;
  onClose: () => void;
};

function statusLabel(row: RookieContender): string {
  if (row.eligible) return "Eligible";
  if (row.checks.minSeasonRaces.pending) return "In progress";
  return "Not eligible";
}

function RaceList({
  title,
  races,
  empty,
  highlightPodiums,
}: {
  title: string;
  races: RookieContender["priorRaces"];
  empty: string;
  highlightPodiums: boolean;
}) {
  return (
    <section className="rookie-modal__section">
      <h3 className="rookie-modal__section-title">{title}</h3>
      {races.length === 0 ? (
        <p className="rookie-modal__empty">{empty}</p>
      ) : (
        <ul className="rookie-modal__race-list">
          {races.map((r) => (
            <li key={`${r.season}-${r.eventId}-${r.category}`} className="rookie-modal__race">
              <span className="rookie-modal__race-name">{r.eventName}</span>
              <span className="rookie-modal__race-meta">
                {r.seasonLabel} · {r.categoryLabel}
                {r.position != null && (
                  <>
                    {" · "}
                    <PositionLabel
                      position={r.position}
                      className="pos-label--inline"
                      highlightPodium={highlightPodiums}
                    />
                  </>
                )}
                {r.points != null && r.points > 0 && ` · ${r.points} pts`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RookieDetailModal({
  contender,
  targetSeasonLabel,
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

  const checks = contender.checks;
  const status = getRookieStatus(contender);

  return (
    <div
      className="rookie-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rookie-modal ${highlightPodiums ? "rookie-modal--highlight-podiums" : ""}`}
        role="dialog"
        aria-labelledby="rookie-modal-title"
        aria-modal="true"
      >
        <header className="rookie-modal__header">
          <div>
            <p className="rookie-modal__eyebrow">{contender.viewCategoryLabel}</p>
            <h2 id="rookie-modal-title" className="rookie-modal__title">
              {contender.name}
              {contender.raceNumber != null && (
                <span className="rookie-modal__num"> #{contender.raceNumber}</span>
              )}
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

        <p className={`rookie-modal__status rookie-modal__status--${status}`}>
          {statusLabel(contender)}
        </p>

        <div className="rookie-modal__summary">
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">{contender.priorRaceCount}</span>
            <span className="rookie-modal__stat-l">prior EOL races</span>
          </div>
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">{contender.seasonRaceCount}</span>
            <span className="rookie-modal__stat-l">in {targetSeasonLabel}</span>
          </div>
        </div>

        <p className="rookie-modal__context">
          Watch list: has {targetSeasonLabel} results in {contender.viewCategoryLabel}.
          Prior races count across all categories and name variants.
        </p>

        <section className="rookie-modal__section">
          <h3 className="rookie-modal__section-title">Qualification</h3>
          <ul className="rookie-modal__checks">
            {(
              [
                checks.rookieExperience,
                checks.minSeasonRaces,
                checks.finalsEligible,
              ] as const
            ).map((c) => (
              <li
                key={c.label}
                className={`rookie-modal__check rookie-modal__check--${
                  c.met ? "met" : c.pending ? "pending" : "failed"
                }`}
              >
                <span className="rookie-modal__check-icon" aria-hidden>
                  {c.met ? "✓" : c.pending ? "…" : "✕"}
                </span>
                <div>
                  <span className="rookie-modal__check-label">{c.label}</span>
                  <span className="rookie-modal__check-detail">{c.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <RaceList
          title={`Before ${targetSeasonLabel}`}
          races={contender.priorRaces}
          empty="No prior EOL races on record."
          highlightPodiums={highlightPodiums}
        />
        <RaceList
          title={`${targetSeasonLabel} season`}
          races={contender.seasonRaces}
          empty={`No ${targetSeasonLabel} EOL races on record yet.`}
          highlightPodiums={highlightPodiums}
        />

        {contender.qualificationNote && (
          <p className="rookie-modal__qual">
            <strong>Sheet note:</strong> {contender.qualificationNote}
          </p>
        )}
      </div>
    </div>
  );
}
