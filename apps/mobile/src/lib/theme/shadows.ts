import type { ViewStyle } from "react-native";

export function cardShadow(isDark: boolean): ViewStyle {
  if (isDark) {
    return {
      shadowColor: "#000000",
      shadowOpacity: 0.22,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    };
  }

  return {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  };
}

export function softShadow(isDark: boolean): ViewStyle {
  if (isDark) {
    return {
      shadowColor: "#000000",
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    };
  }

  return {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  };
}