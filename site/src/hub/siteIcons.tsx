import type { LucideIcon } from "lucide-react";
import {
  Award,
  GitBranch,
  LayoutGrid,
  ListOrdered,
  Medal,
  TrendingUp,
  UserSearch,
  Users,
} from "lucide-react";

/** Muted stroke icons for each tool — Lucide, MIT license. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  "/rankings": ListOrdered,
  "/rider-directory": UserSearch,
  "/teams": Users,
  "/roty": Award,
  "/podiums": Medal,
  "/attendance": TrendingUp,
  "/divisions": LayoutGrid,
  "/seeding": GitBranch,
};

export function SectionIcon({
  to,
  size = 20,
  className,
}: {
  to: string;
  size?: number;
  className?: string;
}) {
  const Icon = SECTION_ICONS[to];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={className}
      aria-hidden
    />
  );
}
