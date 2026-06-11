import { HelpTip } from "../../../hub/HelpTip";
import { Clock } from "lucide-react";

const STEPS = [
  {
    title: "Who's racing?",
    body: "32 finals riders — qualifying sets starting order.",
  },
  {
    title: "Round 1",
    time: "30 min · 32 riders",
    body: "Full-track session. Only your fastest single lap counts.",
  },
  {
    title: "Round 1 results",
    body: "Top 20 → Round 2. Bottom 12 take seeds 21–32.",
  },
  {
    title: "Round 2",
    time: "~15 min · 20 riders",
    body: "Same rules for the 20 fastest from Round 1.",
  },
  {
    title: "Round 2 results",
    body: "Top 8 → seeds 1–8. Positions 9–20 → seeds 9–20.",
  },
  {
    title: "Mass-start?",
    body: "Optional race for top 8 to set seeds 1–8. TBD.",
    muted: true,
  },
  {
    title: "Race day",
    body: "Seed sets your gate and path through the knockouts.",
  },
] as const;

export function SeedingExplainer() {
  return (
    <div className="seeding-explainer">
      <div className="seeding-explainer__flow">
        {STEPS.map((step) => (
          <div
            key={step.title}
            className={
              "muted" in step && step.muted
                ? "seeding-explainer__box seeding-explainer__box--muted"
                : "seeding-explainer__box"
            }
          >
            <strong className="seeding-explainer__title">{step.title}</strong>
            {"time" in step && step.time && (
              <span className="seeding-explainer__time">
                <Clock size={11} strokeWidth={2} aria-hidden />
                {step.time}
              </span>
            )}
            <p>{step.body}</p>
          </div>
        ))}
      </div>
      <p className="seeding-explainer__foot">
        Timings may change.
        <HelpTip text="Work in progress — round lengths and the optional mass-start for the top 8 may change after organiser feedback." />
      </p>
    </div>
  );
}
