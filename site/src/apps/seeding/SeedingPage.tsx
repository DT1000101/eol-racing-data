import { PageHeader } from "../../hub/PageHeader";
import { pageMeta } from "../../hub/navConfig";
import { SeedingExplainer } from "./components/SeedingExplainer";
import { SeedingVisualizer } from "./components/SeedingVisualizer";
import "./seeding.css";

const meta = pageMeta("/seeding")!;

export function SeedingPage() {
  return (
    <div className="seeding-page">
      <PageHeader
        title={meta.pageTitle}
        subtitle={meta.pageSubtitle}
        className="seeding-page__header"
      />

      <details className="seeding-page__section seeding-page__section--intro" open>
        <summary>
          <h2>How seeding works</h2>
        </summary>
        <SeedingExplainer />
      </details>

      <section className="seeding-page__section seeding-page__section--viz">
        <h2>Interactive explorer</h2>
        <p className="seeding-page__viz-lead">
          Hover a rider to see their gate light up in the bracket. Expand the
          qualifying tables for lap detail.
        </p>
        <SeedingVisualizer />
      </section>
    </div>
  );
}
