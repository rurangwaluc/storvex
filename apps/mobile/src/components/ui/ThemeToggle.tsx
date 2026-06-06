import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { useThemeStore } from "../../store/themeStore";
import { useThemeMode } from "../../lib/theme/useThemeMode";

function getThemeLabel(mode: "system" | "light" | "dark") {
  if (mode === "system") return "System";
  if (mode === "dark") return "Dark";
  return "Light";
}

function getThemeSymbol(mode: "system" | "light" | "dark") {
  if (mode === "system") return "A";
  if (mode === "dark") return "D";
  return "L";
}

export function ThemeToggle() {
  const { mode, toggleMode } = useThemeStore();
  const { theme } = useThemeMode();

  return (
    <Pressable
      onPress={() => {
        void toggleMode();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: "rgba(125, 211, 252, 0.22)",
          backgroundColor: theme.isDark
            ? "rgba(14, 165, 233, 0.10)"
            : "rgba(2, 6, 23, 0.06)",
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.symbol,
          {
            backgroundColor: theme.isDark ? "#67E8F9" : "#06111F",
          },
        ]}
      >
        <AppText
          variant="caption"
          color={theme.isDark ? "#06111F" : "#FFFFFF"}
        >
          {getThemeSymbol(mode)}
        </AppText>
      </View>

      <AppText
        variant="caption"
        color={theme.isDark ? "#D7F8FF" : "#06111F"}
        numberOfLines={1}
      >
        {getThemeLabel(mode)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  symbol: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});