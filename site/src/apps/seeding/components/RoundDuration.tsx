import { Clock } from "lucide-react";

interface Props {
  minutes: string;
  className?: string;
}

export function RoundDuration({ minutes, className }: Props) {
  const cls = ["round-duration", className].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      <Clock size={13} strokeWidth={2} aria-hidden />
      {minutes}
    </span>
  );
}

export const QUAL_ROUND_META = {
  1: {
    title: "Round 1",
    racers: "32 racers",
    minutes: "30 minutes",
    blurb: "Fastest single lap counts",
  },
  2: {
    title: "Round 2",
    racers: "20 racers",
    minutes: "~15 minutes",
    blurb: "Fresh session, same rules",
  },
} as const;
