import type { QualRider } from "./seedingTypes";

const GOLDEN = 137.508;
/** Hue arc: seed 1 → seed 32 spans this many degrees (not full wheel). */
const SEED_HUE_START = 205;
const SEED_HUE_SPAN = 265;

/** Prefer final seed; fall back to R1 position while seeds 1–20 are still TBD. */
export function riderSeedForColor(
  rider: Pick<QualRider, "finalSeed" | "round1Pos">,
): number {
  if (rider.finalSeed != null) return rider.finalSeed;
  if (rider.round1Pos != null) return rider.round1Pos;
  return 17;
}

/**
 * Seed-ordered hue so similar seeds (similar pace) sit near each other on the wheel,
 * with a small golden-ratio jitter so the field stays visually varied.
 */
export function riderHue(
  rider: Pick<QualRider, "finalSeed" | "round1Pos" | "colorIndex">,
): number {
  const seed = riderSeedForColor(rider);
  const t = (seed - 1) / 31;
  const base = SEED_HUE_START + t * SEED_HUE_SPAN;
  const jitter = ((rider.colorIndex * GOLDEN) % 14) - 7;
  return (base + jitter + 360) % 360;
}

export function riderColor(
  rider: Pick<QualRider, "finalSeed" | "round1Pos" | "colorIndex">,
  vivid = false,
): string {
  const seed = riderSeedForColor(rider);
  const hue = riderHue(rider);
  const band = (seed + rider.colorIndex) % 4;
  const sat = vivid ? [92, 86, 88, 90][band]! : [74, 68, 72, 66][band]!;
  const lit = vivid ? [68, 74, 60, 72][band]! : [58, 52, 62, 48][band]!;
  return `hsl(${hue.toFixed(1)} ${sat}% ${lit}%)`;
}

export function riderGlow(
  rider: Pick<QualRider, "finalSeed" | "round1Pos" | "colorIndex">,
): string {
  const hue = riderHue(rider);
  return `0 0 10px 2px hsl(${hue} 95% 58% / 0.8), 0 0 20px 3px hsl(${hue} 90% 50% / 0.35)`;
}

export const PLACEHOLDER_ACCENT = "var(--muted)";
