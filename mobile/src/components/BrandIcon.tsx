import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import type { StyleProp, TextStyle } from "react-native";
import type { LivePlatform } from "../api/lives";

// WhatsApp is not a live platform, but it is a brand mark and belongs to the
// same family — the unlock screen's contact button uses it.
export type BrandName = LivePlatform | "WHATSAPP";

// Brand marks are NOT UI icons: they must look like the platform's own logo, so
// they come from FontAwesome6's brand set rather than the app's single UI family
// (MaterialCommunityIcons, see Icon.tsx — which has no TikTok mark at all).
// This is the only place brand glyphs are allowed.
type BrandGlyph = React.ComponentProps<typeof FontAwesome6>["name"];

const BRAND: Record<
  BrandName,
  { glyph: BrandGlyph; color: string; label: string }
> = {
  WHATSAPP: { glyph: "whatsapp", color: "#25D366", label: "واتساب" },
  YOUTUBE: { glyph: "youtube", color: "#FF0000", label: "يوتيوب" },
  FACEBOOK: { glyph: "facebook", color: "#1877F2", label: "فيسبوك" },
  INSTAGRAM: { glyph: "instagram", color: "#E1306C", label: "إنستغرام" },
  TIKTOK: { glyph: "tiktok", color: "#25F4EE", label: "تيك توك" },
};

export function brandColor(platform: BrandName): string {
  return BRAND[platform].color;
}

export function brandLabel(platform: BrandName): string {
  return BRAND[platform].label;
}

interface Props {
  platform: BrandName;
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
