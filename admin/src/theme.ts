import { createTheme, type MantineColorsTuple } from "@mantine/core";

// shadcn/ui aesthetic: neutral zinc scale, near-black primary, hairline borders
// (separation by border, not shadow), 8px radius. Monochrome and calm.
const zinc: MantineColorsTuple = [
  "#fafafa", // 50
  "#f4f4f5", // 100
  "#e4e4e7", // 200  ← borders
  "#d4d4d8", // 300
  "#a1a1aa", // 400
  "#71717a", // 500  ← muted foreground
  "#52525b", // 600
  "#3f3f46", // 700
  "#27272a", // 800
  "#18181b", // 900  ← primary / foreground
];

export const theme = createTheme({
  primaryColor: "zinc",
  primaryShade: { light: 9 },
  colors: { zinc, gray: zinc },
  white: "#ffffff",
  black: "#09090b",
  autoContrast: true,
  luminanceThreshold: 0.4,
  defaultRadius: "md",
  radius: { xs: "4px", sm: "6px", md: "8px", lg: "10px", xl: "14px" },
  fontFamily: "Tajawal, sans-serif",
  headings: { fontFamily: "Tajawal, sans-serif", fontWeight: "600" },
  // shadcn separates with borders — shadows stay whisper-light.
  shadows: {
    xs: "0 1px 2px rgba(0,0,0,0.04)",
    sm: "0 1px 3px rgba(0,0,0,0.06)",
    md: "0 4px 12px rgba(0,0,0,0.06)",
    lg: "0 10px 24px rgba(0,0,0,0.08)",
  },
  components: {
    // Cards: border only, no shadow.
    Card: { defaultProps: { radius: "lg", withBorder: true } },
    Button: { defaultProps: { radius: "md" } },
    Modal: { defaultProps: { radius: "lg", shadow: "lg" } },
    Badge: { defaultProps: { radius: "sm" } },
    TextInput: { defaultProps: { radius: "md" } },
    Textarea: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md" } },
  },
});
