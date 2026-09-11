import { Image } from "expo-image";
import { StyleSheet, type StyleProp, type ImageStyle } from "react-native";

const LOGO = require("../../assets/images/logo.png");

interface Props {
  /** Rendered square. 120 suits a launch screen, 88 a header. */
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * The Auto École Boujida badge. One component so the login screen, the
 * first-sync screen and anywhere else it appears can never drift apart.
 */
export function BrandLogo({ size = 120, style }: Props) {
  return (
    <Image
      source={LOGO}
      style={[{ width: size, height: size }, styles.base, style]}
      contentFit="contain"
      // Static asset: no fade-in, and it must not flicker between screens.
      transition={0}
      accessible
      accessibilityLabel="codeboujida"
    />
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: "center" },
});
