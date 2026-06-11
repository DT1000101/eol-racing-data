/** Split spreadsheet team cells like "Flyboi / OWA" into separate crew names. */
export function parseTeams(team: string | undefined | null): string[] {
  if (!team?.trim()) return [];
  return team
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function riderHasTeam(
  teamField: string | undefined,
  crew: string,
): boolean {
  return parseTeams(teamField).some((t) => t === crew);
}
