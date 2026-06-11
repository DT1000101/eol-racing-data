import { useEffect, useMemo, useState } from "react";
import type { EolData, RiderRow } from "../types";
import { parseTeams } from "../utils/teams";
import { PositionLabel } from "./PositionLabel";
import { SortButton } from "./SortButton";

type TeamDirectoryRow = {
  team: string;
  categoryCount: number;
  riderCount: number;
  seasonPoints: number;
  podiumCount: number;
  gold: number;
  silver: number;
  bronze: number;
  members: TeamMemberRow[];
};

type TeamSortKey =
  | "team"
  | "categories"
  | "riders"
  | "points"
  | "podiums"
  | "gold"
  | "silver"
  | "bronze";

type TeamMemberRow = {
  riderId: string;
  name: string;
  raceNumber: number | null;
  points: number;
  podiums: number;
  gold: number;
  silver: number;
  bronze: number;
  raceDetails: TeamMemberRaceDetail[];
};

type TeamMemberRaceDetail = {
  categoryLabel: string;
  eventName: string;
  position: number;
  points: number;
  isFinals: boolean;
};

type Props = {
  data: EolData;
};

export function TeamsDirectoryView({ data }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<TeamSortKey>("points");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const teams = useMemo(() => buildTeamsFor2026(data), [data]);
  const selected = selectedTeam
    ? teams.find((t) => t.team === selectedTeam) ?? null
    : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? teams.filter((t) => t.team.toLowerCase().includes(q))
      : teams;
    return sortTeams(list, sortKey, sortAsc);
  }, [teams, query, sortKey, sortAsc]);

  const onSort = (key: TeamSortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
      return;
    }
    setSortKey(key);
    setSortAsc(key === "team");
  };

  return (
    <div className="directory-page">
      <div className="directory-intro">
        <h2 className="directory-intro__title">Teams Directory</h2>
        <p className="directory-intro__lead">
          2026 season only. Multi-team labels are split into separate teams (for example,
          <strong> Flyboi / OWA</strong> counts for both <strong>Flyboi</strong> and{" "}
          <strong>OWA</strong>). Click a team to view members with points and podium
          breakdown.
        </p>
      </div>

      <div className="directory-toolbar">
        <label className="directory-search">
          <span className="visually-hidden">Search teams</span>
          <input
            type="search"
            className="directory-search__input"
            placeholder="Team name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="table-wrap directory-table-wrap">
        <table className="directory-table directory-table--teams">
          <thead>
            <tr>
              <th className="directory-table__team-name">
                <SortButton
                  label="Team"
                  active={sortKey === "team"}
                  asc={sortAsc}
                  onClick={() => onSort("team")}
                />
              </th>
              <th className="directory-table__stat">
                <SortButton
                  label="Entries"
                  active={sortKey === "categories"}
                  asc={sortAsc}
                  onClick={() => onSort("categories")}
                />
              </th>
              <th className="directory-table__stat">
                <SortButton
                  label="Riders"
                  active={sortKey === "riders"}
                  asc={sortAsc}
                  onClick={() => onSort("riders")}
                />
              </th>
              <th className="directory-table__stat directory-table__stat--podiums">
                <SortButton
                  label="Points"
                  active={sortKey === "points"}
                  asc={sortAsc}
                  onClick={() => onSort("points")}
                />
              </th>
              <th className="directory-table__stat">
                <SortButton
                  label="Podiums"
                  active={sortKey === "podiums"}
                  asc={sortAsc}
                  onClick={() => onSort("podiums")}
                />
              </th>
              <th className="directory-table__stat">
                <SortButton
                  label="🥇"
                  active={sortKey === "gold"}
                  asc={sortAsc}
                  onClick={() => onSort("gold")}
                />
              </th>
              <th className="directory-table__stat">
                <SortButton
                  label="🥈"
                  active={sortKey === "silver"}
                  asc={sortAsc}
                  onClick={() => onSort("silver")}
                />
              </th>
              <th className="directory-table__stat">
                <SortButton
                  label="🥉"
                  active={sortKey === "bronze"}
                  asc={sortAsc}
                  onClick={() => onSort("bronze")}
                />
              </th>
              <th className="directory-table__action" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="directory-table__empty">
                  No teams match your search.
                </td>
              </tr>
            ) : (
              filtered.map((team, i) => (
                <tr
                  key={team.team}
                  className={`directory-table__row directory-table__row--${i % 2 === 0 ? "even" : "odd"}`}
                >
                  <td className="directory-table__team-name">
                    <button
                      type="button"
                      className="directory-name-btn"
                      onClick={() => setSelectedTeam(team.team)}
                    >
                      {team.team}
                    </button>
                  </td>
                  <td className="directory-table__stat rankings__num">{team.categoryCount}</td>
                  <td className="directory-table__stat rankings__num">{team.riderCount}</td>
                  <td className="directory-table__stat rankings__num">{team.seasonPoints}</td>
                  <td className="directory-table__stat directory-table__stat--podiums rankings__num">
                    {team.podiumCount}
                  </td>
                  <td className="directory-table__stat rankings__num">{team.gold}</td>
                  <td className="directory-table__stat rankings__num">{team.silver}</td>
                  <td className="directory-table__stat rankings__num">{team.bronze}</td>
                  <td className="directory-table__action">
                    <button
                      type="button"
                      className="directory-profile-btn"
                      onClick={() => setSelectedTeam(team.team)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="directory-footer">
        {filtered.length} of {teams.length} teams
      </p>

      {selected && (
        <TeamProfileModal
          team={selected}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}

function buildTeamsFor2026(data: EolData): TeamDirectoryRow[] {
  const season2026 = data.seasons.find((s) => s.label === "2026");
  if (!season2026) return [];

  const byTeam = new Map<string, TeamDirectoryRow>();
  const byTeamMembers = new Map<string, Map<string, TeamMemberRow>>();
  const rowsByCategory = data.rowsBySeasonCategory[String(season2026.id)] ?? {};
  const events = data.eventsBySeason[String(season2026.id)] ?? [];
  const eventNameById = new Map(events.map((ev) => [ev.id, ev.name] as const));

  for (const [category, categoryRows] of Object.entries(rowsByCategory)) {
    const categoryLabel = season2026.categoryLabels[category] ?? category;
    for (const rider of categoryRows) {
      const teamNames = parseTeams(rider.team);
      if (teamNames.length === 0) continue;

      for (const teamName of teamNames) {
        const podiumSummary = summarizePodiums(rider);
        const existing = byTeam.get(teamName);
        if (existing) {
          existing.categoryCount += 1;
          existing.seasonPoints += rider.totalPoints;
          existing.podiumCount += podiumSummary.podiums;
          existing.gold += podiumSummary.gold;
          existing.silver += podiumSummary.silver;
          existing.bronze += podiumSummary.bronze;
        } else {
          byTeam.set(teamName, {
            team: teamName,
            categoryCount: 1,
            riderCount: 0,
            seasonPoints: rider.totalPoints,
            podiumCount: podiumSummary.podiums,
            gold: podiumSummary.gold,
            silver: podiumSummary.silver,
            bronze: podiumSummary.bronze,
            members: [],
          });
        }

        let teamMembers = byTeamMembers.get(teamName);
        if (!teamMembers) {
          teamMembers = new Map<string, TeamMemberRow>();
          byTeamMembers.set(teamName, teamMembers);
        }

        const existingMember = teamMembers.get(rider.riderId);
        if (existingMember) {
          existingMember.points += rider.totalPoints;
          existingMember.podiums += podiumSummary.podiums;
          existingMember.gold += podiumSummary.gold;
          existingMember.silver += podiumSummary.silver;
          existingMember.bronze += podiumSummary.bronze;
          existingMember.raceDetails.push(
            ...buildRaceDetails(rider, categoryLabel, eventNameById),
          );
        } else {
          teamMembers.set(rider.riderId, {
            riderId: rider.riderId,
            name: rider.name,
            raceNumber: rider.raceNumber,
            points: rider.totalPoints,
            podiums: podiumSummary.podiums,
            gold: podiumSummary.gold,
            silver: podiumSummary.silver,
            bronze: podiumSummary.bronze,
            raceDetails: buildRaceDetails(rider, categoryLabel, eventNameById),
          });
        }
      }
    }
  }

  for (const team of byTeam.values()) {
    const members = [...(byTeamMembers.get(team.team)?.values() ?? [])];
    members.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.podiums !== b.podiums) return b.podiums - a.podiums;
      return a.name.localeCompare(b.name);
    });
    for (const member of members) {
      member.raceDetails.sort((a, b) => {
        if (a.eventName !== b.eventName) return a.eventName.localeCompare(b.eventName);
        return a.categoryLabel.localeCompare(b.categoryLabel);
      });
    }
    team.members = members;
    team.riderCount = members.length;
  }

  return [...byTeam.values()];
}

function sortTeams(list: TeamDirectoryRow[], key: TeamSortKey, asc: boolean): TeamDirectoryRow[] {
  const mult = asc ? 1 : -1;
  const sorted = [...list];
  sorted.sort((a, b) => {
    if (key === "team") return a.team.localeCompare(b.team) * mult;

    const av = getNumericSortValue(a, key);
    const bv = getNumericSortValue(b, key);
    if (av !== bv) return (av - bv) * mult;
    return a.team.localeCompare(b.team);
  });
  return sorted;
}

function getNumericSortValue(team: TeamDirectoryRow, key: Exclude<TeamSortKey, "team">): number {
  if (key === "categories") return team.categoryCount;
  if (key === "riders") return team.riderCount;
  if (key === "points") return team.seasonPoints;
  if (key === "podiums") return team.podiumCount;
  if (key === "gold") return team.gold;
  if (key === "silver") return team.silver;
  return team.bronze;
}

function summarizePodiums(row: RiderRow): { podiums: number; gold: number; silver: number; bronze: number } {
  let gold = 0;
  let silver = 0;
  let bronze = 0;
  for (const ev of Object.values(row.events)) {
    if (ev.position === 1) gold += 1;
    else if (ev.position === 2) silver += 1;
    else if (ev.position === 3) bronze += 1;
  }
  return { podiums: gold + silver + bronze, gold, silver, bronze };
}

function buildRaceDetails(
  row: RiderRow,
  categoryLabel: string,
  eventNameById: Map<string, string>,
): TeamMemberRaceDetail[] {
  const details: TeamMemberRaceDetail[] = [];
  for (const [eventId, result] of Object.entries(row.events)) {
    if (result.position == null) continue;
    details.push({
      categoryLabel,
      eventName: eventNameById.get(eventId) ?? eventId,
      position: result.position,
      points: result.points ?? 0,
      isFinals: false,
    });
  }
  return details;
}

function TeamProfileModal({ team, onClose }: { team: TeamDirectoryRow; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="rookie-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rookie-modal team-profile-modal" role="dialog" aria-modal="true" aria-labelledby="team-profile-title">
        <header className="rookie-modal__header">
          <div>
            <p className="rookie-modal__eyebrow">Team profile · 2026</p>
            <h2 id="team-profile-title" className="rookie-modal__title">
              {team.team}
            </h2>
          </div>
          <button
            type="button"
            className="rookie-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="rookie-modal__summary">
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">{team.seasonPoints}</span>
            <span className="rookie-modal__stat-l">season points</span>
          </div>
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">{team.riderCount}</span>
            <span className="rookie-modal__stat-l">members</span>
          </div>
          <div className="rookie-modal__stat">
            <span className="rookie-modal__stat-n">{team.podiumCount}</span>
            <span className="rookie-modal__stat-l">podiums</span>
          </div>
        </div>

        <p className="team-profile-modal__socials">
          Social links are not available in the current source data.
        </p>

        <section className="team-profile-modal__members">
          <h3 className="rookie-modal__section-title">Members (condensed)</h3>
          <div className="table-wrap team-profile-modal__table-wrap">
            <table className="directory-table team-members-table">
              <thead>
                <tr>
                  <th>Rider</th>
                  <th className="directory-table__stat">Points</th>
                  <th className="directory-table__stat">Podiums</th>
                  <th className="directory-table__stat">🥇</th>
                  <th className="directory-table__stat">🥈</th>
                  <th className="directory-table__stat">🥉</th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((member, i) => (
                  <tr key={member.riderId} className={`directory-table__row directory-table__row--${i % 2 === 0 ? "even" : "odd"}`}>
                    <td>
                      {member.name}
                      {member.raceNumber != null && (
                        <span className="rookie__num"> #{member.raceNumber}</span>
                      )}
                    </td>
                    <td className="directory-table__stat rankings__num">{member.points}</td>
                    <td className="directory-table__stat rankings__num">{member.podiums}</td>
                    <td className="directory-table__stat rankings__num">{member.gold}</td>
                    <td className="directory-table__stat rankings__num">{member.silver}</td>
                    <td className="directory-table__stat rankings__num">{member.bronze}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="team-profile-modal__details">
          <h3 className="rookie-modal__section-title">Race details by member</h3>
          <div className="team-profile-modal__details-list">
            {team.members.map((member) => (
              <details key={`details-${member.riderId}`} className="team-profile-member" open>
                <summary className="team-profile-member__summary">
                  <span className="team-profile-member__name">
                    {member.name}
                    {member.raceNumber != null && (
                      <span className="rookie__num"> #{member.raceNumber}</span>
                    )}
                  </span>
                  <span className="team-profile-member__meta">
                    {member.points} pts · {member.podiums} podiums
                  </span>
                </summary>
                {member.raceDetails.length === 0 ? (
                  <p className="rookie-modal__empty">No races listed.</p>
                ) : (
                  <div className="table-wrap team-profile-modal__table-wrap">
                    <table className="directory-table team-race-table">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Category</th>
                          <th className="directory-table__stat">Pos</th>
                          <th className="directory-table__stat">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {member.raceDetails.map((race, i) => (
                          <tr
                            key={`${member.riderId}-${race.eventName}-${race.categoryLabel}-${i}`}
                            className={`directory-table__row directory-table__row--${i % 2 === 0 ? "even" : "odd"}`}
                          >
                            <td>
                              {race.eventName}
                              {race.isFinals && (
                                <span className="rider-profile-modal__finals">Finals</span>
                              )}
                            </td>
                            <td>{race.categoryLabel}</td>
                            <td className="directory-table__stat rankings__num">
                              <PositionLabel position={race.position} className="pos-label--inline" />
                            </td>
                            <td className="directory-table__stat rankings__num">{race.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
