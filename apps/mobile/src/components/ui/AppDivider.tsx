import { View } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";

export function AppDivider() {
  const { theme } = useThemeMode();

  return (
    <View
      style={{
        height: 1,
        width: "100%",
        backgroundColor: theme.colors.border,
      }}
    />
  );
}