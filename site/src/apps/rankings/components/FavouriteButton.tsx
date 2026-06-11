type Props = {
  active: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
};

export function FavouriteButton({
  active,
  onToggle,
  label = "Favourite",
  className = "",
}: Props) {
  return (
    <button
      type="button"
      className={`fav-btn ${active ? "fav-btn--on" : ""} ${className}`.trim()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      title={active ? "Remove from favourites" : "Add to favourites"}
      aria-label={active ? `Unfavourite ${label}` : `Favourite ${label}`}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
