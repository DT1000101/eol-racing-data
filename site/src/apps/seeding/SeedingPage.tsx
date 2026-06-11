import { Link } from "react-router-dom";
import { HelpTip } from "../../hub/HelpTip";
import "./seeding.css";

export function SeedingPage() {
  return (
    <div className="seeding-page">
      <header className="seeding-page__header">
        <h1>Finals seeding</h1>
        <p className="seeding-page__lead">
          How to seed quarters, semis, and starting gates when the top 32 are
          known but not yet ordered by speed.
        </p>
      </header>

      <section className="seeding-page__section">
        <h2>
          OWA finals context{" "}
          <HelpTip text="Onewheel Algarve finals use a top-32 knockout format. Riders qualify through the season, but bracket positions still need a seeding method once lap times are in." />
        </h2>
        <p>
          At OWA finals you already know <strong>who</strong> the 32 riders are.
          The open question is <strong>where</strong> they go in the bracket —
          quarters, semis, and gate order — when you have time-trial speeds but
          haven’t locked a seed list yet.
        </p>
        <p>
          This section will walk through proposed seeding methods, show worked
          examples, and explain the trade-offs in plain language.
        </p>
      </section>

      <section className="seeding-page__section seeding-page__section--muted">
        <h2>Coming soon</h2>
        <ul>
          <li>Interactive top-32 bracket explorer</li>
          <li>Comparison of seeding approaches (alignment, fairness, drama)</li>
          <li>Worked examples from real OWA data</li>
        </ul>
        <p>
          Meanwhile, explore{" "}
          <Link to="/divisions">Dynamic divisions</Link> for division splitting
          and bracket grids, or{" "}
          <Link to="/rankings">Season rankings</Link> for overall standings.
        </p>
      </section>
    </div>
  );
}
