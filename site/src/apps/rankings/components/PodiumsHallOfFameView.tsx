import type { PodiumFinish, PodiumsHallOfFameData } from "../types";

type Props = {
  data: PodiumsHallOfFameData;
};

const MEDAL: Record<1 | 2 | 3, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function PodiumBadge({ finish }: { finish: PodiumFinish }) {
  return (
    <li
      className={`podiums-badge podiums-badge--p${finish.position}`}
      title={`P${finish.position} · ${finish.eventName} (${finish.seasonLabel}, ${finish.categoryLabel})`}
    >
      <span className="podiums-badge__medal" aria-hidden>
        {MEDAL[finish.position]}
      </span>
      <span className="podiums-badge__body">
        <span className="podiums-badge__event">{finish.eventName}</span>
        <span className="podiums-badge__meta">
          {finish.seasonLabel}
          <span className="podiums-badge__cat">{finish.categoryLabel}</span>
        </span>
      </span>
    </li>
  );
}

function PodiumTier({
  label,
  finishes,
}: {
  label: string;
  finishes: PodiumFinish[];
}) {
  if (finishes.length === 0) return null;
  return (
    <section className="podiums-tier">
      <h4 className="podiums-tier__label">{label}</h4>
      <ul className="podiums-badges">
        {finishes.map((f) => (
          <PodiumBadge key={`${f.eventId}-${f.category}-${f.position}`} finish={f} />
        ))}
      </ul>
    </section>
  );
}

export function PodiumsHallOfFameView({ data }: Props) {
  const { summary, riders } = data;

  return (
    <div className="podiums-page">
      <header className="podiums-intro">
        <h2 className="podiums-intro__title">Podium Hall of Fame</h2>
        <p className="podiums-intro__lead">
          EOL race podium finishes (1st–3rd), counted once per rider per event and
          category. Includes EOL Finals for each season (2023/24 at Onewheel Algarve).
        </p>
        <p className="podiums-intro__stats">
          {summary.riderCount} riders · {summary.podiumCount} podiums
        </p>
      </header>

      <ol className="podiums-list">
        {riders.map((rider, index) => (
          <li key={rider.riderId} className="podiums-rider">
            <header className="podiums-rider__head">
              <span className="podiums-rider__rank" aria-label={`Rank ${index + 1}`}>
                {index + 1}
              </span>
              <div className="podiums-rider__identity">
                <h3 className="podiums-rider__name">
                  {rider.raceNumber != null && (
                    <span className="podiums-rider__num">#{rider.raceNumber}</span>
                  )}
                  {rider.name}
                </h3>
                <p className="podiums-rider__counts">
                  <strong>{rider.podiumCount}</strong> podiums
                  <span className="podiums-rider__counts-sep">·</span>
                  <span className="podiums-rider__medal-stat" title="1st place">
                    {rider.gold}×🥇
                  </span>
                  <span className="podiums-rider__medal-stat" title="2nd place">
                    {rider.silver}×🥈
                  </span>
                  <span className="podiums-rider__medal-stat" title="3rd place">
                    {rider.bronze}×🥉
                  </span>
                </p>
              </div>
            </header>

            <div className="podiums-rider__tiers">
              <PodiumTier label="1st place" finishes={rider.firsts} />
              <PodiumTier label="2nd place" finishes={rider.seconds} />
              <PodiumTier label="3rd place" finishes={rider.thirds} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
