export interface SiteNavItem {
  to: string;
  /** Short main line in the top nav */
  navLabel: string;
  /** Smaller second line in the top nav */
  navSublabel?: string;
  /** Full heading on the page */
  pageTitle: string;
  pageSubtitle?: string;
  description: string;
  help: string;
  badge?: string;
  end?: boolean;
}

export const SITE_NAV: SiteNavItem[] = [
  {
    to: "/",
    navLabel: "Home",
    pageTitle: "EOL Racing Data",
    description: "Overview of all league data tools and visualizers.",
    help: "Start here to pick a tool.",
    end: true,
  },
  {
    to: "/rankings",
    navLabel: "Rankings",
    navSublabel: "Season",
    pageTitle: "Season rankings",
    description:
      "Overall standings by season and category with per-event results, points, and team grouping.",
    help: "The main league table. Pick a season and category to see who’s where.",
  },
  {
    to: "/rider-directory",
    navLabel: "Riders",
    navSublabel: "Directory",
    pageTitle: "Rider directory",
    description:
      "Search all riders, star favourites, and open profiles with full event history.",
    help: "Every rider in the database with searchable profiles.",
  },
  {
    to: "/teams",
    navLabel: "Teams",
    navSublabel: "Directory",
    pageTitle: "Teams directory",
    description: "2026 teams with members, combined points, and podium breakdowns.",
    help: "Split combined team names (e.g. Flyboi / OWA) into separate entries.",
  },
  {
    to: "/roty",
    navLabel: "ROTY",
    navSublabel: "Qualifier",
    pageTitle: "ROTY qualifier",
    pageSubtitle: "Rookie of the Year",
    description:
      "Rookie of the Year watch list and eligibility for the current season.",
    help: "Who might qualify as a rookie based on prior race history.",
  },
  {
    to: "/podiums",
    navLabel: "Podiums",
    navSublabel: "Hall of fame",
    pageTitle: "Podium hall of fame",
    description: "All EOL podium finishes ranked — gold, silver, and bronze counts.",
    help: "Career podium totals across seasons and categories.",
  },
  {
    to: "/attendance",
    navLabel: "Attendance",
    navSublabel: "League growth",
    pageTitle: "Attendance",
    pageSubtitle: "Participation over time",
    description: "Attendance trends and league growth across events and seasons.",
    help: "Charts built from historical participation data.",
  },
  {
    to: "/divisions",
    navLabel: "Divisions",
    navSublabel: "Visualizer",
    pageTitle: "Divisions Visualizer",
    pageSubtitle: "Skill-based groups from time trials",
    description:
      "Split time trials into skill-based divisions with bracket grids and starting gates.",
    help: "Explore how organisers might group riders before knockout racing.",
  },
  {
    to: "/owa-laps",
    navLabel: "OWA",
    navSublabel: "Lap change",
    pageTitle: "How the lap changed",
    pageSubtitle: "OWA 2025 and 2026",
    description:
      "Best OWA lap from 2025 and 2026, and how much that lap changed. A negative change is faster.",
    help: "Spelling differences are treated as the same rider, including Dan Turner / Daniel Turner, Henry Ld / Henry Livingstone Dunn, and Jeffrey Jaffa Gaming / Jaffa Gamon. Dan Turner’s 2026 time is blank: that seeding lap had three crashes, and he broke his collarbone on the next one. 2026 legends short-track times are not included. Rank is the place in that year’s full best-lap list.",
  },
  {
    to: "/seeding",
    navLabel: "Seeding",
    navSublabel: "Visualizer",
    pageTitle: "Seeding visualizer",
    pageSubtitle: "Top 32 bracket placement",
    description:
      "How to place the top 32 into quarters and semis when speeds are known but seed order isn’t fixed yet.",
    help: "F1-style qualifying sessions that set gate positions in the top-32 knockout bracket.",
  },
];

export function pageMeta(path: string): SiteNavItem | undefined {
  return SITE_NAV.find((item) => item.to === path);
}

/** Nav items shown in the header (excludes home). */
export const HEADER_NAV = SITE_NAV.filter((item) => item.to !== "/");

/** Homepage tool cards (excludes home). */
export const HOME_SECTIONS = SITE_NAV.filter((item) => item.to !== "/");
