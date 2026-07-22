import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Primary = lane-paint yellow #FFD348 from the Tariq "Night Drive" tokens
// (shade 5). autoContrast flips button text to dark ink on the light shades.
const brand: MantineColorsTuple = [
  "#fff9e6",
  "#fff2cc",
  "#ffe9a3",
  "#ffe075",
  "#ffd95c",
  "#FFD348",
  "#e6bb35",
  "#bf9a24",
  "#997a17",
  "#735a0c",
];

export const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  autoContrast: true,
  luminanceThreshold: 0.45,
  defaultRadius: "md",
  fontFamily: "Tajawal, sans-serif",
  headings: { fontFamily: "Tajawal, sans-serif" },
});
