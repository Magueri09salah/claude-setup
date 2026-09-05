import { useWindowDimensions } from "react-native";

/**
 * The app rotates freely, so every screen has to cope with a wide viewport.
 * One hook decides what "wide" means, rather than each screen inventing its
 * own threshold and drifting.
 *
 * 600pt is the usual phone-landscape / small-tablet boundary: below it a
 * 2-column grid is right, above it two columns leave absurdly wide cards.
 */
const WIDE = 600;

export interface Responsive {
  width: number;
  height: number;
  /** Landscape phone or tablet — lay content out in columns. */
  isWide: boolean;
  /** Taller than it is wide. */
  isPortrait: boolean;
  /** Sensible column count for a card grid at this width. */
  columns: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isWide = width >= WIDE;
  return {
    width,
    height,
    isWide,
    isPortrait: height >= width,
    columns: width >= 1000 ? 4 : isWide ? 3 : 2,
  };
}

/**
 * Percentage basis for a wrapping flex grid with `columns` per row.
 * Slightly under the exact share so the gap never pushes the last card down.
 */
export function gridBasis(columns: number): `${number}%` {
  return `${Math.floor(100 / columns) - 3}%`;
}
