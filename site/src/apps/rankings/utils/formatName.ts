/** "James Grant" → "J Grant" for compact mobile columns */
export function shortRiderName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return fullName;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = first.charAt(0).toUpperCase();
  return `${initial} ${last}`;
}

/** First team segment only, truncated */
export function shortTeamLabel(team: string, maxLen = 12): string {
  const first = team.split("/").map((s) => s.trim()).filter(Boolean)[0] ?? team;
  const lower = first.toLowerCase();
  if (lower === "whacky wheels" || lower === "wacky wheels") return "WW";
  if (lower.includes("wanyi")) return "WOW";
  if (lower === "balaton karika") return "BK";
  if (first.length <= maxLen) return first;
  return `${first.slice(0, maxLen - 1)}…`;
}
