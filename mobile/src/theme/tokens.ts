// Design tokens — single source of truth (see .claude/skills/ui-design).
// Identity: "Night Drive" (owner decision, 2026-07-22) — the app is named
// طريق ("road"), so the design IS the road: asphalt ground, lane-paint yellow
// as the single hero accent, signal green/red doing semantic work only.
// Components must use these; no hex literals in screens.

export const colors = {
  // Base — asphalt
  bg: "#141519", // screen background
  bgSoft: "#1B1D23", // gradient partner / elevated sections
  surface: "#22242B", // cards
  surfaceAlt: "#2A2D35", // inputs / secondary rows / placeholders
  chipBg: "rgba(255,255,255,0.10)", // subtle control fill (pills, chips)
  // Feature-area accents (used as card EDGE + icon tint, not full backgrounds)
  exam: "#4FA8F0", // سلاسل الامتحان — headlight blue
  lessons: "#FFD348", // الدروس النظرية — lane-paint yellow (hero accent)
  series: "#2FBF71", // سلاسل الدروس — signal green
  success: "#2FBF71", // ✓ / pass / correct
  danger: "#E5484D", // ✗ / fail / wrong
  premium: "#FFD348", // 🔒 premium — painted gold
  // Ink on light accent fills (yellow/green/blue buttons)
  onAccent: "#141519",
  onAccentDim: "rgba(20,21,25,0.65)",
  // Text on asphalt / dark surfaces
  text: "#F2F3F5",
  textDim: "rgba(242,243,245,0.55)",
  border: "rgba(255,255,255,0.07)",
  // Decorative road-sign wallpaper behind every screen: grey, barely there.
  // Anything stronger competes with the content — these screens are dense.
  pattern: "rgba(242,243,245,0.022)",
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export const font = {
  regular: "Tajawal_400Regular",
  medium: "Tajawal_500Medium",
  bold: "Tajawal_700Bold",
  extraBold: "Tajawal_800ExtraBold",
} as const;

// Typography scale — Arabic needs generous line height on body text.
export const type = {
  display: { fontFamily: font.extraBold, fontSize: 28, lineHeight: 38 },
  title: { fontFamily: font.bold, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 26 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
  numeral: { fontFamily: font.extraBold, fontSize: 34, lineHeight: 40 },
} as const;
