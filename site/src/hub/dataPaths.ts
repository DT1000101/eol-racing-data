/** Static JSON paths (served from `site/public/data/`). */
export const DATA = {
  rankings: {
    main: "/data/rankings/eol-data.json",
    stats: "/data/rankings/stats.html",
  },
  divisions: {
    events: "/data/divisions/events.json",
    event: (id: string) => `/data/divisions/${id}.json`,
  },
} as const;
