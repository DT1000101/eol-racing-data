import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { HelpTip } from "./HelpTip";
import { HOME_SECTIONS } from "./navConfig";
import { SectionIcon } from "./siteIcons";

export function HomePage() {
  return (
    <div className="hub-home">
      <div className="hub-home__hero">
        <h1>EOL Racing Data</h1>
        <p className="hub-home__lead">
          Rankings, rider profiles, division planning, and finals bracket tools —
          clear data for organisers and riders.
        </p>
        <p className="hub-home__note">
          Not the official EOL site, but maintained for the community.{" "}
          <HelpTip text="Built by committee members and serious riders to help explain how competitions are structured. Always check with organisers for final decisions." />
        </p>
      </div>

      <div className="hub-home__grid">
        {HOME_SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="hub-card">
            <div className="hub-card__icon" aria-hidden>
              <SectionIcon to={section.to} size={22} />
            </div>
            <div className="hub-card__body">
              <div className="hub-card__head">
                <div className="hub-card__titles">
                  <h2 className="hub-card__title">{section.pageTitle}</h2>
                  {section.pageSubtitle && (
                    <span className="hub-card__subtitle">
                      {section.pageSubtitle}
                    </span>
                  )}
                </div>
                {section.badge && (
                  <span className="hub-card__badge">{section.badge}</span>
                )}
                <HelpTip text={section.help} />
              </div>
              <p className="hub-card__desc">{section.description}</p>
              <span className="hub-card__cta">
                Open <ArrowRight size={14} strokeWidth={2} aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
