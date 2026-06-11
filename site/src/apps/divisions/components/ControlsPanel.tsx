import type {
  DivisionSettings,
  MinDivisionSize,
  ReferencePosition,
} from "../types";

interface Props {
  settings: DivisionSettings;
  onChange: (settings: DivisionSettings) => void;
  divisionCount: number;
  riderCount: number;
  eventName: string;
  events: { id: string; name: string; riderCount: number }[];
  eventId: string;
  onEventChange: (id: string) => void;
  categories: string[];
  countsByCategory?: Record<string, number>;
  includedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
}

const MIN_SIZES: MinDivisionSize[] = [4, 8, 16];
const REF_POSITIONS: ReferencePosition[] = [1, 2, 3, 4];

export function ControlsPanel({
  settings,
  onChange,
  divisionCount,
  riderCount,
  eventName,
  events,
  eventId,
  onEventChange,
  categories,
  countsByCategory,
  includedCategories,
  onToggleCategory,
}: Props) {
  const set = <K extends keyof DivisionSettings>(
    key: K,
    value: DivisionSettings[K],
  ) => onChange({ ...settings, [key]: value });

  return (
    <header className="controls">
      <div className="controls__title">
        <h1>Dynamic Divisions</h1>
        <p className="controls__subtitle">{eventName}</p>
      </div>

      <div className="controls__grid">
        <label className="control">
          <span className="control__label">Event</span>
          <select
            value={eventId}
            onChange={(e) => onEventChange(e.target.value)}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.riderCount})
              </option>
            ))}
          </select>
        </label>

        <div className="control control--categories">
          <span className="control__label">Categories</span>
          <div className="category-toggles">
            {categories.map((cat) => (
              <label key={cat} className="category-toggle">
                <input
                  type="checkbox"
                  checked={includedCategories.has(cat)}
                  onChange={() => onToggleCategory(cat)}
                />
                {cat}
                {countsByCategory?.[cat] != null && (
                  <span className="category-toggle__count">
                    ({countsByCategory[cat]})
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <label className="control">
          <span className="control__label">Min division size</span>
          <select
            value={settings.minDivisionSize}
            onChange={(e) =>
              set("minDivisionSize", Number(e.target.value) as MinDivisionSize)
            }
          >
            {MIN_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} riders
              </option>
            ))}
          </select>
        </label>

        <label className="control control--wide">
          <span className="control__label">
            Expansion threshold:{" "}
            <strong>{settings.pctThreshold.toFixed(0)}%</strong>
          </span>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={settings.pctThreshold}
            onChange={(e) => set("pctThreshold", Number(e.target.value))}
          />
          <span className="control__hint">
            Expands 4→8→16→32 when the next batch passes. Only the last
            division can be a non-bracket remainder.
          </span>
        </label>

        <label className="control">
          <span className="control__label">Reference rider</span>
          <select
            value={settings.referencePosition}
            onChange={(e) =>
              set(
                "referencePosition",
                Number(e.target.value) as ReferencePosition,
              )
            }
          >
            {REF_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p === 1 ? "1st" : p === 2 ? "2nd" : p === 3 ? "3rd" : "4th"}{" "}
                in division
              </option>
            ))}
          </select>
        </label>

        <label className="control">
          <span className="control__label">Max divisions</span>
          <select
            value={settings.maxDivisions ?? "auto"}
            onChange={(e) => {
              const v = e.target.value;
              set("maxDivisions", v === "auto" ? null : Number(v));
            }}
          >
            <option value="auto">Auto (fill all riders)</option>
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} divisions
              </option>
            ))}
          </select>
        </label>

        <div className="control control--stats">
          <span className="control__label">Result</span>
          <span className="stats">
            <strong>{divisionCount}</strong> divisions ·{" "}
            <strong>{riderCount}</strong> riders
          </span>
        </div>
      </div>
    </header>
  );
}
