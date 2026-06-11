import { flushSync } from "react-dom";

type Props = {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  compact?: boolean;
};

export function SortButton({ label, active, asc, onClick, compact }: Props) {
  const handleClick = () => {
    flushSync(() => onClick());
  };

  return (
    <button
      type="button"
      className={`sort-btn ${active ? "sort-btn--active" : ""} ${compact ? "sort-btn--compact" : ""}`}
      onClick={handleClick}
      title={
        active
          ? `Sorted ${asc ? "ascending" : "descending"} — click to reverse`
          : "Click to sort by this column"
      }
    >
      <span className="sort-btn__label">{label}</span>
      <span className="sort-btn__arrow" aria-hidden>
        {active ? (asc ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}
