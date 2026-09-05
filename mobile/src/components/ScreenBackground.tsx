import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/tokens";

// The hand-drawn road-sign wallpaper the owner supplied (2026-08-26), replacing
// the glyph grid this component used to draw itself.
const PATTERN = require("../../assets/images/sign-pattern.jpg");

/**
 * How strongly the wallpaper shows through.
 *
 * Deliberately low: the artwork's own field is lighter than `colors.bg`, so at
 * full strength it washes the Night Drive palette out to flat grey. Held down
 * here, only the pale sign strokes come through and the app stays dark behind
 * Arabic text. This is the one number to tune if it reads too strong or too
 * faint on a real screen.
 */
const PATTERN_OPACITY = 0.35;

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
      {/* cover, not repeat: the artwork is a screen-shaped picture rather than a
          seamless tile, so repeating it would show its edges. Cropping keeps it
          clean when the phone rotates or the app runs on a tablet. */}
      <Image
        source={PATTERN}
        style={[StyleSheet.absoluteFill, { opacity: PATTERN_OPACITY }]}
        contentFit="cover"
        // Static asset: no fade, and it must not re-decode between screens.
        transition={0}
        cachePolicy="memory-disk"
        pointerEvents="none"
        accessible={false}
      />
      {children}
    </LinearGradient>
  );
}
