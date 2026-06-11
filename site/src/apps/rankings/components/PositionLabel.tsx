type Props = {
  position: number;
  className?: string;
  highlightPodium?: boolean;
};

const PODIUM_CLASS: Record<number, string> = {
  1: "pos-label--p1",
  2: "pos-label--p2",
  3: "pos-label--p3",
};

/** Finish position, e.g. P·14 — mark and number visually distinct */
export function PositionLabel({
  position,
  className = "",
  highlightPodium = false,
}: Props) {
  const podium = highlightPodium ? (PODIUM_CLASS[position] ?? "") : "";
  return (
    <span
      className={`pos-label ${podium} ${className}`.trim()}
      title={`Position ${position}`}
    >
      <span className="pos-label__mark">P</span>
      <span className="pos-label__sep" aria-hidden>
        ·
      </span>
      <span className="pos-label__num">{position}</span>
    </span>
  );
}
