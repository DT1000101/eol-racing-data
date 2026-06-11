import { useCallback, useEffect, useMemo, useState } from "react";
import { DATA } from "../../hub/dataPaths";
import { PageHeader } from "../../hub/PageHeader";
import { pageMeta } from "../../hub/navConfig";
import { ControlsPanel } from "./components/ControlsPanel";
import { RiderList } from "./components/RiderList";
import type {
  DivisionSettings,
  EventData,
  EventsIndex,
  Rider,
} from "./types";
import { rankRiders } from "./types";
import { computeDivisions } from "./utils/divisions";
import "./styles.css";

const DEFAULT_SETTINGS: DivisionSettings = {
  minDivisionSize: 4,
  pctThreshold: 10,
  referencePosition: 3,
  maxDivisions: null,
};

const DEFAULT_CATEGORIES = new Set(["Open", "Women"]);

const PAGE = pageMeta("/divisions")!;

export function DivisionsApp() {
  const [eventsIndex, setEventsIndex] = useState<EventsIndex | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [settings, setSettings] = useState<DivisionSettings>(DEFAULT_SETTINGS);
  const [includedCategories, setIncludedCategories] = useState<Set<string>>(
    () => new Set(DEFAULT_CATEGORIES),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEvent = useCallback(async (id: string) => {
    const res = await fetch(DATA.divisions.event(id));
    if (!res.ok) throw new Error(`Failed to load event (${res.status})`);
    const data: EventData = await res.json();
    setEventData(data);
    setEventId(id);
    const defaults =
      data.defaultCategories ??
      data.categories.filter((c) => DEFAULT_CATEGORIES.has(c));
    setIncludedCategories(new Set(defaults.length > 0 ? defaults : data.categories));
  }, []);

  useEffect(() => {
    fetch(DATA.divisions.events)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load events (${r.status})`);
        return r.json();
      })
      .then(async (idx: EventsIndex) => {
        setEventsIndex(idx);
        await loadEvent(idx.defaultEventId);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Load failed");
        setLoading(false);
      });
  }, [loadEvent]);

  const handleEventChange = async (id: string) => {
    try {
      setLoading(true);
      await loadEvent(id);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const activeRiders = useMemo((): Rider[] => {
    if (!eventData) return [];
    const pool = eventData.categories
      .filter((cat) => includedCategories.has(cat))
      .flatMap((cat) => eventData.ridersByCategory[cat] ?? []);
    return rankRiders(pool);
  }, [eventData, includedCategories]);

  const result = useMemo(() => {
    if (activeRiders.length === 0) return null;
    return computeDivisions(activeRiders, settings);
  }, [activeRiders, settings]);

  const toggleCategory = (cat: string) => {
    setIncludedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  if (loading && !eventData) {
    return (
      <div className="app app--loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (error && !eventData) {
    return (
      <div className="app app--error">
        <p>{error}</p>
        <p className="hint">Run extract script to generate data files.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="rankings-page__toolbar divisions-page__toolbar">
        <PageHeader title={PAGE.pageTitle} subtitle={PAGE.pageSubtitle} />
      </div>
      <ControlsPanel
        settings={settings}
        onChange={setSettings}
        divisionCount={result?.divisions.length ?? 0}
        riderCount={activeRiders.length}
        eventName={eventData?.name ?? ""}
        events={eventsIndex?.events ?? []}
        eventId={eventId}
        onEventChange={handleEventChange}
        categories={eventData?.categories ?? []}
        countsByCategory={
          eventsIndex?.events.find((e) => e.id === eventId)?.countsByCategory ??
          (eventData?.ridersByCategory
            ? Object.fromEntries(
                Object.entries(eventData.ridersByCategory).map(([k, v]) => [
                  k,
                  v.length,
                ]),
              )
            : undefined)
        }
        includedCategories={includedCategories}
        onToggleCategory={toggleCategory}
      />

      {result && (
        <>
          <div className="division-summary">
            {result.divisions.map((d) => (
              <div
                key={d.number}
                className="division-chip"
                style={{
                  borderColor: `color-mix(in srgb, var(--text) 20%, ${getChipColor(d.number)})`,
                  background: getChipColor(d.number),
                }}
              >
                <span className="division-chip__num">D{d.number}</span>
                <span className="division-chip__range">
                  #{d.startRank}–{d.endRank}
                </span>
                <span className="division-chip__size">
                  {d.size} riders{d.isRemainder ? " · remainder" : ""}
                </span>
              </div>
            ))}
          </div>
          <RiderList
            riders={result.riders}
            divisions={result.divisions}
            referencePosition={settings.referencePosition}
          />
        </>
      )}
    </div>
  );
}

function getChipColor(divNum: number): string {
  const colors = [
    "#1e3a5f",
    "#1e4d2b",
    "#4a1e4d",
    "#4d4a1e",
    "#1e4d4d",
    "#4d1e1e",
    "#2a1e4d",
    "#4d3a1e",
  ];
  return colors[(divNum - 1) % colors.length]!;
}
