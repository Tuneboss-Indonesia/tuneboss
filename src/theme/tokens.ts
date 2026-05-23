import { Platform } from "react-native";

export const colors = {
  black: "#070707",
  panel: "#111111",
  panelSoft: "#181818",
  white: "#f7f7f2",
  muted: "#98a2b3",
  grey: "#5c5c5c",
  primary: "#ed6c05",
  primarySoft: "#ff8b2e",
  accent: "#fdbd8c",
  border: "rgba(255,255,255,0.08)",
  primaryBorder: "rgba(237,108,5,0.7)",
};

export const fonts = {
  body: Platform.OS === "web" ? "Futura PT" : "System",
  bodyMedium: Platform.OS === "web" ? "Futura PT Medium" : "System",
  display: Platform.OS === "web" ? "SQR721BE" : "System",
};

export const radius = {
  sm: 3,
  md: 8,
  lg: 18,
  xl: 28,
};

export const spacing = {
  xs: 8,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  xxl: 44,
};
