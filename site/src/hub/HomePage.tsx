import { Link } from "react-router-dom";
import { HelpTip } from "./HelpTip";

const SECTIONS = [
  {
    to: "/rankings",
    title: "Season rankings",
    description:
      "Overall standings by season and category, rider directory, teams, rookie of the year, and podium hall of fame.",
    help: "Built from official season results. Use this to see who’s where in the league and explore rider histories.",
  },
  {
    to: "/divisions",
    title: "Dynamic divisions",
    description:
      "Split time-trial results into skill-based divisions with bracket-sized groups (4 / 8 / 16 / 32) and visual starting grids.",
    help: "Helps organisers see how riders might be grouped before knockout racing. Adjust thresholds and reference rider to explore scenarios.",
  },
  {
    to: "/seeding",
    title: "Finals seeding",
    description:
      "How to place the top 32 into quarters, semis, and gates when speeds are known but seed order isn’t fixed yet.",
    help: "Focused on OWA finals: you have 32 riders selected but need a fair bracket layout. More content coming soon.",
    badge: "In progress",
  },
] as const;

export function HomePage() {
  return (
    <div className="hub-home">
      <div className="hub-home__hero">
        <h1>EOL Hub</h1>
        <p className="hub-home__lead">
          One place for league rankings, division planning, and finals bracket
          seeding — clear tools for organisers and riders.
        </p>
        <p className="hub-home__note">
          Not the official EOL site, but maintained for the community.{" "}
          <HelpTip text="These tools are built by committee members and serious riders to help explain how competitions are structured. Always check with organisers for final decisions." />
        </p>
      </div>

      <div className="hub-home__grid">
        {SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="hub-card">
            <div className="hub-card__head">
              <h2 className="hub-card__title">{section.title}</h2>
              {"badge" in section && section.badge && (
                <span className="hub-card__badge">{section.badge}</span>
              )}
              <HelpTip text={section.help} />
            </div>
            <p className="hub-card__desc">{section.description}</p>
            <span className="hub-card__cta">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
