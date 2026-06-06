export type ThemeMode = "light" | "dark";

export const brand = {
  ink: "#07111F",
  navy: "#08111F",
  navySoft: "#101B2E",
  blue: "#20C8FF",
  blueDeep: "#2563EB",
  cyan: "#67E8F9",
  orange: "#F97316",
  green: "#22C55E",
  red: "#EF4444",
  amber: "#F59E0B",
};

type ColorPalette = {
  mode: ThemeMode;

  background: string;
  backgroundStrong: string;

  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;

  text: string;
  textMuted: string;
  textSoft: string;
  textInverse: string;

  border: string;
  borderStrong: string;

  primary: string;
  primaryStrong: string;
  primarySoft: string;

  success: string;
  successSoft: string;

  warning: string;
  warningSoft: string;

  danger: string;
  dangerSoft: string;

  orange: string;
  orangeSoft: string;

  shadow: string;
};

export const lightColors: ColorPalette = {
  mode: "light",

  background: "#F4F7FB",
  backgroundStrong: "#EAF1F8",

  surface: "#FFFFFF",
  surfaceMuted: "#F7FAFC",
  surfaceStrong: "#FFFFFF",

  text: "#07111F",
  textMuted: "#516173",
  textSoft: "#8795A7",
  textInverse: "#FFFFFF",

  border: "rgba(15, 23, 42, 0.10)",
  borderStrong: "rgba(15, 23, 42, 0.18)",

  primary: brand.blueDeep,
  primaryStrong: "#1D4ED8",
  primarySoft: "#E0F2FE",

  success: brand.green,
  successSoft: "#DCFCE7",

  warning: brand.amber,
  warningSoft: "#FEF3C7",

  danger: brand.red,
  dangerSoft: "#FEE2E2",

  orange: brand.orange,
  orangeSoft: "#FFEDD5",

  shadow: "#0F172A",
};

export const darkColors: ColorPalette = {
  mode: "dark",

  background: "#050914",
  backgroundStrong: "#07111F",

  surface: "#0B1424",
  surfaceMuted: "#101B2E",
  surfaceStrong: "#132238",

  text: "#F8FAFC",
  textMuted: "#B9C4D4",
  textSoft: "#7E8CA0",
  textInverse: "#03111F",

  border: "rgba(148, 163, 184, 0.16)",
  borderStrong: "rgba(148, 163, 184, 0.28)",

  primary: "#20C8FF",
  primaryStrong: "#67E8F9",
  primarySoft: "rgba(32, 200, 255, 0.16)",

  success: "#4ADE80",
  successSoft: "rgba(34, 197, 94, 0.16)",

  warning: "#FBBF24",
  warningSoft: "rgba(245, 158, 11, 0.16)",

  danger: "#FB7185",
  dangerSoft: "rgba(239, 68, 68, 0.16)",

  orange: "#FB923C",
  orangeSoft: "rgba(249, 115, 22, 0.16)",

  shadow: "#000000",
};

export type AppColors = ColorPalette;

export function getColors(mode: ThemeMode): AppColors {
  return mode === "dark" ? darkColors : lightColors;
}