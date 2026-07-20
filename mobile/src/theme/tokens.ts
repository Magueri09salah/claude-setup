// Design tokens — single source of truth (see .claude/skills/ui-design).
// Components must use these; no hex literals in screens.

export const colors = {
  // Base — deep navy, layered
  bg: "#0B1B3A",
  bgSoft: "#122650",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F6FB",
  // Brand accents (one accent per feature area)
  exam: "#E64545",
  lessons: "#F5A623",
  series: "#2F80ED",
  success: "#27AE60",
  danger: "#EB5757",
  premium: "#8E5BE8",
  // Text
  textOnDark: "#FFFFFF",
  textOnDarkDim: "rgba(255,255,255,0.64)",
  text: "#101828",
  textDim: "#667085",
  border: "rgba(16,24,40,0.08)",
} as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

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
    shadowColor: "#0B1B3A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
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
