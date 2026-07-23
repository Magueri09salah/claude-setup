import { colors } from "./tokens";

// Per-category accent: distinct icon-chip color per category (reference app has
// a different color per top-level category), cycled deterministically by order.
const CYCLE = [colors.exam, colors.lessons, colors.series, colors.danger] as const;

export function accentFor(orderNum: number): string {
  return CYCLE[(Math.max(1, orderNum) - 1) % CYCLE.length]!;
}
