import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Primary = series blue #2F80ED from the Tariq design tokens (shade index 5).
const brand: MantineColorsTuple = [
  "#e9f1fd",
  "#d3e3fb",
  "#a5c7f7",
  "#77aaf3",
  "#4f92f0",
  "#2F80ED",
  "#2371d6",
  "#1b60b8",
  "#144f99",
  "#0c3d78",
];

export const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  defaultRadius: "md",
  fontFamily: "Tajawal, sans-serif",
  headings: { fontFamily: "Tajawal, sans-serif" },
});
