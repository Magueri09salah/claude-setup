import { LinearGradient } from "expo-linear-gradient";
import { memo, useMemo, type ReactNode } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "../theme/tokens";
import { Icon, type IconName } from "./Icon";

const SIGNS: IconName[] = [
  "signWarn",
  "signStop",
  "signLight",
  "signRoad",
  "signCone",
  "signDirection",
];

// Sparse and large on purpose (owner decision 2026-08-13): this is a texture,
// not a row of icons. Wide spacing + big soft glyphs + very low opacity read as
// a printed background; anything tighter looks like decoration stuck on top.
const CELL = 170;
const GLYPH = 58;

/**
 * Road-sign wallpaper. Laid out on a deterministic grid — offset on alternate
 * rows and rotated by a value derived from the cell index — so it reads as
 * scattered without random values that would reshuffle on every render.
 */
const SignsBackdrop = memo(function SignsBackdrop() {
  const { width, height } = useWindowDimensions();

  // Rebuilt only when the screen size changes. Without this the ~60 glyphs
  // would be recreated on every parent render — and the quiz screen re-renders
  // once a second while the timer runs.
  const cells = useMemo(() => {
    const cols = Math.ceil(width / CELL) + 1;
    const rows = Math.ceil(height / CELL) + 1;
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        out.push(
          <View
            key={`${r}-${c}`}
            style={{
              position: "absolute",
              // Half-cell offset on odd rows breaks up the grid lines.
              left: c * CELL + (r % 2 ? CELL / 2 : 0) - GLYPH / 2,
              top: r * CELL - GLYPH / 2,
              // Gentle, deterministic tilt so the grid doesn't read as a grid.
              transform: [{ rotate: `${((i * 37) % 24) - 12}deg` }],
            }}
          >
            <Icon
              name={SIGNS[i % SIGNS.length]!}
              size={GLYPH}
              color={colors.pattern}
            />
          </View>,
        );
      }
    }
    return out;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {cells}
    </View>
  );
})

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * The app's standard screen surface: the Night Drive gradient with the road-sign
 * wallpaper behind the content. Every screen uses this instead of a bare
 * LinearGradient, so the texture can be tuned in one place.
 */
export function ScreenBackground({ style, children }: Props) {
  return (
    <LinearGradient colors={[colors.bg, colors.bgSoft]} style={style}>
      <SignsBackdrop />
      {children}
    </LinearGradient>
  );
}
