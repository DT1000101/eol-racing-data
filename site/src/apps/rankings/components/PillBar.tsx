type Item = { id: string; label: string };

type Props = {
  label: string;
  items: Item[];
  active: string;
  onSelect: (id: string) => void;
};

export function PillBar({ label, items, active, onSelect }: Props) {
  return (
    <div className="pill-bar" role="toolbar" aria-label={label}>
      <span className="pill-bar__label">{label}</span>
      <div className="pill-bar__items">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`pill ${active === item.id ? "pill--active" : ""}`}
            onClick={() => onSelect(item.id)}
            aria-pressed={active === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
