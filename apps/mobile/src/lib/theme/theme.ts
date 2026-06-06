import { getColors, type AppColors, type ThemeMode } from "./colors";
import { radius } from "./radius";
import { spacing } from "./spacing";
import { typography } from "./typography";

export type AppTheme = {
  colors: AppColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
};

export function createTheme(mode: ThemeMode): AppTheme {
  return {
    colors: getColors(mode),
    spacing,
    radius,
    typography,
    isDark: mode === "dark",
  };
}