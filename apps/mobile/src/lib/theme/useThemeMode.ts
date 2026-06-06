import { useColorScheme } from "react-native";
import { createTheme } from "./theme";
import { useThemeStore } from "../../store/themeStore";

export function useThemeMode() {
  const systemScheme = useColorScheme();
  const { mode } = useThemeStore();

  const resolvedMode =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  return {
    mode,
    resolvedMode,
    theme: createTheme(resolvedMode),
  };
}