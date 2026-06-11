import { useState } from "react";
import type { RiderRow, SeasonEvent, SortKey } from "../types";
import { useIsMobile } from "../hooks/useIsMobile";
import { shortRiderName, shortTeamLabel } from "../utils/formatName";
import { parseTeams, riderHasTeam } from "../utils/teams";
import { FavouriteButton } from "./FavouriteButton";
import { PositionLabel } from "./PositionLabel";
import { SortButton } from "./SortButton";

type Props = {
  rows: RiderRow[];
  events: SeasonEvent[];
  compact: boolean;
  showPosition: boolean;
  showPoints: boolean;
  showTeams: boolean;
  highlightPodiums: boolean;
  teamFilter: string | null;
  onTeamClick: (team: string) => void;
  sort: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  isFavourite?: (riderId: string) => boolean;
  onToggleFavourite?: (riderId: string) => void;
  onRiderClick?: (riderId: string) => void;
};

type RowFlags = {
  rowClass: string;
  displayName: string;
};

function rowFlags(
  row: RiderRow,
  i: number,
  rows: RiderRow[],
  teamFilter: string | null,
  nameExpanded: boolean,
  isMobile: boolean,
): RowFlags {
  const isTeamGroup = teamFilter != null && riderHasTeam(row.team, teamFilter);
  const isTeamGroupEnd =
    isTeamGroup &&
    (i === rows.length - 1 || !riderHasTeam(rows[i + 1]?.team, teamFilter));
  const displayName =
    isMobile && !nameExpanded ? shortRiderName(row.name) : row.name;
  const rowClass = [
    i % 2 === 0 ? "rankings__row--even" : "rankings__row--odd",
    isTeamGroup ? "rankings__row--team-group" : "",
    isTeamGroupEnd ? "rankings__row--team-group-end" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { rowClass, displayName };
}

function PinHeader({
  isMobile,
  showEol,
  nameExpanded,
  onToggleName,
  sort,
  sortAsc,
  onSort,
}: {
  isMobile: boolean;
  showEol: boolean;
  nameExpanded: boolean;
  onToggleName: () => void;
  sort: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <>
      <th className="rankings__pin-col rankings__pin-col--rank">
        <SortButton
          label="Rk"
          active={sort.type === "season"}
          asc={sortAsc}
          onClick={() => onSort({ type: "season" })}
        />
      </th>
      {showEol && (
        <th className="rankings__pin-col rankings__pin-col--eol">
          <span className="sticky-header-label">EOL#</span>
        </th>
      )}
      <th className="rankings__pin-col rankings__pin-col--name">
        {isMobile ? (
          <button
            type="button"
            className={`col-toggle ${nameExpanded ? "col-toggle--on" : ""}`}
            onClick={onToggleName}
            title={nameExpanded ? "Use compact names" : "Show full names"}
          >
            Rider {nameExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="rankings__pin-heading">Rider</span>
        )}
      </th>
    </>
  );
}

function PinRowContent({
  row,
  displayName,
  fullName,
  showEol,
  asTableCells,
  isFavourite,
  onToggleFavourite,
  onRiderClick,
}: {
  row: RiderRow;
  displayName: string;
  fullName: string;
  showEol: boolean;
  asTableCells: boolean;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  onRiderClick?: () => void;
}) {
  const rank = (
    <>{row.seasonRank}</>
  );
  const eol =
    row.raceNumber != null ? (
      <span
        className="eol-num"
        title="EOL rider number (assigned once, permanent)"
      >
        {row.raceNumber}
      </span>
    ) : (
      <span className="cell-empty">—</span>
    );
  const nameInner = (
    <>
      {onToggleFavourite && (
        <FavouriteButton
          active={!!isFavourite}
          onToggle={onToggleFavourite}
          label={fullName}
          className="fav-btn--inline"
        />
      )}
      {onRiderClick ? (
        <button
          type="button"
          className="rider-name rider-name-btn"
          title={displayName !== fullName ? fullName : undefined}
          onClick={onRiderClick}
        >
          {displayName}
        </button>
      ) : (
        <span
          className="rider-name"
          title={displayName !== fullName ? fullName : undefined}
        >
          {displayName}
        </span>
      )}
    </>
  );

  const name = <span className="rankings__name-cell">{nameInner}</span>;

  if (asTableCells) {
    return (
      <>
        <td className="rankings__pin-col rankings__pin-col--rank rankings__num">
          {rank}
        </td>
        {showEol && (
          <td className="rankings__pin-col rankings__pin-col--eol">{eol}</td>
        )}
        <td className="rankings__pin-col rankings__pin-col--name">{name}</td>
      </>
    );
  }

  return (
    <>
      <div className="rankings__pin-col rankings__pin-col--rank rankings__num">
        {rank}
      </div>
      {showEol && (
        <div className="rankings__pin-col rankings__pin-col--eol">{eol}</div>
      )}
      <div className="rankings__pin-col rankings__pin-col--name">{name}</div>
    </>
  );
}

function ScrollHeader({
  events,
  compact,
  hasTeams,
  isMobile,
  teamExpanded,
  onToggleTeam,
  sort,
  sortAsc,
  onSort,
}: {
  events: SeasonEvent[];
  compact: boolean;
  hasTeams: boolean;
  isMobile: boolean;
  teamExpanded: boolean;
  onToggleTeam: () => void;
  sort: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const compactEventLabel = (ev: SeasonEvent) => {
    if (!compact) return ev.name;
    if (ev.isFinals) return "FINALS";
    const name = ev.name.toLowerCase();
    const short = ev.short.toLowerCase();
    if (name.includes("owar") || short.includes("owar") || short === "ef2oar") {
      return "OWA";
    }
    return ev.short;
  };

  return (
    <>
      {hasTeams && (
        <th
          className={`rankings__scroll-header rankings__team ${
            isMobile ? "rankings__team--toggle" : ""
          }`}
        >
          {isMobile ? (
            <button
              type="button"
              className={`col-toggle ${teamExpanded ? "col-toggle--on" : ""}`}
              onClick={onToggleTeam}
              title={teamExpanded ? "Use compact teams" : "Show full team names"}
            >
              Team {teamExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="sticky-header-label">Team</span>
          )}
        </th>
      )}
      <th className="rankings__scroll-header rankings__pts">
        <SortButton
          label="Pts"
          active={sort.type === "season"}
          asc={sortAsc}
          onClick={() => onSort({ type: "season" })}
        />
      </th>
      {events.map((ev) => (
        <th
          key={ev.id}
          className={`rankings__scroll-header rankings__event ${
            ev.tier ? `rankings__event--${ev.tier}` : ""
          } ${ev.isFinals ? "rankings__event--finals" : ""}`}
          title={
            ev.name +
            (ev.tier === "tier1" ? " (Tier 1)" : ev.tier === "tier2" ? " (Tier 2)" : "")
          }
        >
          <SortButton
            label={compactEventLabel(ev)}
            active={sort.type === "event" && sort.eventId === ev.id}
            asc={sortAsc}
            onClick={() => onSort({ type: "event", eventId: ev.id })}
            compact={compact}
          />
        </th>
      ))}
    </>
  );
}

function ScrollCells({
  row,
  events,
  hasTeams,
  isMobile,
  teamExpanded,
  teamFilter,
  onTeamClick,
  showPosition,
  showPoints,
  highlightPodiums,
}: {
  row: RiderRow;
  events: SeasonEvent[];
  hasTeams: boolean;
  isMobile: boolean;
  teamExpanded: boolean;
  teamFilter: string | null;
  onTeamClick: (team: string) => void;
  showPosition: boolean;
  showPoints: boolean;
  highlightPodiums: boolean;
}) {
  return (
    <>
      {hasTeams && (
        <td className="rankings__team">
          <TeamLinks
            team={row.team}
            teamFilter={teamFilter}
            onTeamClick={onTeamClick}
            compact={isMobile && !teamExpanded}
          />
        </td>
      )}
      <td className="rankings__pts rankings__num">{row.totalPoints}</td>
      {events.map((ev) => {
        const cell = row.events[ev.id];
        return (
          <td key={ev.id} className="rankings__event-cell">
            {cell ? (
              <EventCellView
                cell={cell}
                showPosition={showPosition}
                showPoints={showPoints}
                highlightPodiums={highlightPodiums}
                eolAssignedHere={cell.eolNumberAssignedHere}
              />
            ) : (
              <span className="cell-empty">—</span>
            )}
          </td>
        );
      })}
    </>
  );
}

export function RankingsTable({
  rows,
  events,
  compact,
  showPosition,
  showPoints,
  showTeams,
  highlightPodiums,
  teamFilter,
  onTeamClick,
  sort,
  sortAsc,
  onSort,
  isFavourite,
  onToggleFavourite,
  onRiderClick,
}: Props) {
  const isMobile = useIsMobile();
  const [nameExpanded, setNameExpanded] = useState(false);
  const [teamExpanded, setTeamExpanded] = useState(false);
  const hasTeams = showTeams && rows.some((r) => r.team);

  const pinExtras = (row: RiderRow) => ({
    isFavourite: isFavourite?.(row.riderId),
    onToggleFavourite: onToggleFavourite
      ? () => onToggleFavourite(row.riderId)
      : undefined,
    onRiderClick: onRiderClick ? () => onRiderClick(row.riderId) : undefined,
  });

  const rowClassName = (rowClass: string, row: RiderRow) =>
    [rowClass, isFavourite?.(row.riderId) ? "rankings__row--fav" : ""]
      .filter(Boolean)
      .join(" ");

  const tableClass = [
    "rankings",
    compact ? "rankings--compact" : "",
    isMobile ? "rankings--mobile" : "",
    isMobile ? "rankings--hide-eol" : "",
    isMobile && nameExpanded ? "rankings--name-expanded" : "",
    isMobile && teamExpanded ? "rankings--team-expanded" : "",
    highlightPodiums ? "rankings--highlight-podiums" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const pinHeaderProps = {
    isMobile,
    showEol: !isMobile,
    nameExpanded,
    onToggleName: () => setNameExpanded((v) => !v),
    sort,
    sortAsc,
    onSort,
  };

  const scrollHeaderProps = {
    events,
    compact,
    hasTeams,
    isMobile,
    teamExpanded,
    onToggleTeam: () => setTeamExpanded((v) => !v),
    sort,
    sortAsc,
    onSort,
  };

  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <p className="table-empty">No riders in this category for this season.</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="table-wrap">
        <div className="rankings-duo">
          <div className="rankings-duo__pin">
            <table className={`${tableClass} rankings--pin-panel`}>
              <thead>
                <tr>
                  <PinHeader {...pinHeaderProps} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const { rowClass, displayName } = rowFlags(
                    row,
                    i,
                    rows,
                    teamFilter,
                    nameExpanded,
                    isMobile,
                  );
                  return (
                    <tr key={row.riderId} className={rowClassName(rowClass, row)}>
                      <PinRowContent
                        row={row}
                        displayName={displayName}
                        fullName={row.name}
                        showEol={!isMobile}
                        asTableCells
                        {...pinExtras(row)}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="rankings-duo__scroll">
            <table className={`${tableClass} rankings--scroll-panel`}>
              <thead>
                <tr>
                  <ScrollHeader {...scrollHeaderProps} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const { rowClass } = rowFlags(
                    row,
                    i,
                    rows,
                    teamFilter,
                    nameExpanded,
                    isMobile,
                  );
                  return (
                    <tr key={row.riderId} className={rowClassName(rowClass, row)}>
                      <ScrollCells
                        row={row}
                        events={events}
                        hasTeams={hasTeams}
                        isMobile={isMobile}
                        teamExpanded={teamExpanded}
                        teamFilter={teamFilter}
                        onTeamClick={onTeamClick}
                        showPosition={showPosition}
                        showPoints={showPoints}
                        highlightPodiums={highlightPodiums}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className={tableClass}>
        <thead>
          <tr>
            <th colSpan={3} className="rankings__pin-head">
              <div className="rankings__pin">
                <div className="rankings__pin-col rankings__pin-col--rank">
                  <SortButton
                    label="Rk"
                    active={sort.type === "season"}
                    asc={sortAsc}
                    onClick={() => onSort({ type: "season" })}
                  />
                </div>
                <div className="rankings__pin-col rankings__pin-col--eol">
                  <span className="sticky-header-label">EOL#</span>
                </div>
                <div className="rankings__pin-col rankings__pin-col--name">
                  <span className="rankings__pin-heading">Rider</span>
                </div>
              </div>
            </th>
            <ScrollHeader {...scrollHeaderProps} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const { rowClass, displayName } = rowFlags(
              row,
              i,
              rows,
              teamFilter,
              nameExpanded,
              isMobile,
            );
            return (
              <tr key={row.riderId} className={rowClassName(rowClass, row)}>
                <td colSpan={3} className="rankings__pin-body">
                  <div className="rankings__pin">
                    <PinRowContent
                      row={row}
                      displayName={displayName}
                      fullName={row.name}
                      showEol
                      asTableCells={false}
                      {...pinExtras(row)}
                    />
                  </div>
                </td>
                <ScrollCells
                  row={row}
                  events={events}
                  hasTeams={hasTeams}
                  isMobile={isMobile}
                  teamExpanded={teamExpanded}
                  teamFilter={teamFilter}
                  onTeamClick={onTeamClick}
                  showPosition={showPosition}
                  showPoints={showPoints}
                  highlightPodiums={highlightPodiums}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamLinks({
  team,
  teamFilter,
  onTeamClick,
  compact,
}: {
  team?: string;
  teamFilter: string | null;
  onTeamClick: (crew: string) => void;
  compact?: boolean;
}) {
  const crews = parseTeams(team);
  if (crews.length === 0) return null;

  return (
    <span className="team-links">
      {crews.map((crew, i) => (
        <span key={crew} className="team-links__item">
          {i > 0 && <span className="team-links__sep">/</span>}
          <button
            type="button"
            className={`team-link ${
              teamFilter === crew ? "team-link--active" : ""
            }`}
            onClick={() => onTeamClick(crew)}
            title={
              teamFilter === crew
                ? "Clear team grouping"
                : `Group ${crew} riders at top by season rank`
            }
          >
            {compact ? shortTeamLabel(crew) : crew}
          </button>
        </span>
      ))}
    </span>
  );
}

function EventCellView({
  cell,
  showPosition,
  showPoints,
  highlightPodiums,
  eolAssignedHere,
}: {
  cell: { position: number | null; points: number | null };
  showPosition: boolean;
  showPoints: boolean;
  highlightPodiums: boolean;
  eolAssignedHere?: boolean;
}) {
  const pos = cell.position;
  const pts = cell.points;
  if (!showPosition && !showPoints) {
    return <span className="cell-empty">—</span>;
  }

  if (!showPosition && showPoints) {
    return (
      <span className="cell cell--pts-only">
        {pts != null && pts > 0 ? pts : "—"}
      </span>
    );
  }

  if (showPosition && !showPoints) {
    return (
      <span className="cell cell--pos-only">
        {pos != null ? (
          <PositionLabel position={pos} highlightPodium={highlightPodiums} />
        ) : (
          "—"
        )}
      </span>
    );
  }

  return (
    <span className={`cell ${eolAssignedHere ? "cell--eol-new" : ""}`}>
      <span className="cell__pos">
        {pos != null ? (
          <PositionLabel position={pos} highlightPodium={highlightPodiums} />
        ) : (
          "—"
        )}
      </span>
      {pts != null && pts > 0 && <span className="cell__pts">{pts}</span>}
      {eolAssignedHere && (
        <span
          className="cell__eol-tag"
          title="EOL rider number first assigned at this event"
        >
          new!
        </span>
      )}
    </span>
  );
}
