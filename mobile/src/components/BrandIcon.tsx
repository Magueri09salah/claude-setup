import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import type { StyleProp, TextStyle } from "react-native";
import type { LivePlatform } from "../api/lives";

// Brand marks are NOT UI icons: they must look like the platform's own logo, so
// they come from FontAwesome6's brand set rather than the app's single UI family
// (MaterialCommunityIcons, see Icon.tsx — which has no TikTok mark at all).
// This is the only place brand glyphs are allowed.
type BrandGlyph = React.ComponentProps<typeof FontAwesome6>["name"];

const BRAND: Record<
  LivePlatform,
  { glyph: BrandGlyph; color: string; label: string }
> = {
  YOUTUBE: { glyph: "youtube", color: "#FF0000", label: "يوتيوب" },
  FACEBOOK: { glyph: "facebook", color: "#1877F2", label: "فيسبوك" },
  INSTAGRAM: { glyph: "instagram", color: "#E1306C", label: "إنستغرام" },
  TIKTOK: { glyph: "tiktok", color: "#25F4EE", label: "تيك توك" },
};

export function brandColor(platform: LivePlatform): string {
  return BRAND[platform].color;
}

export function brandLabel(platform: LivePlatform): string {
  return BRAND[platform].label;
}

interface Props {
  platform: LivePlatform;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function BrandIcon({ platform, size = 24, color, style }: Props) {
  const brand = BRAND[platform];
  return (
    <FontAwesome6
      name={brand.glyph}
      iconStyle="brand"
      size={size}
      color={color ?? brand.color}
      style={style}
    />
  );
}
