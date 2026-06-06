import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";
import { cardShadow } from "../../lib/theme/shadows";

type AppCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  muted?: boolean;
};

export function AppCard({ children, style, muted = false }: AppCardProps) {
  const { theme } = useThemeMode();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: muted ? theme.colors.surfaceMuted : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.xl,
          padding: theme.spacing[5],
        },
        cardShadow(theme.isDark),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});