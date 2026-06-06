import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";
import { AppText } from "./AppText";

type BadgeTone = "default" | "success" | "warning" | "danger" | "primary";

type AppBadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

export function AppBadge({ children, tone = "default" }: AppBadgeProps) {
  const { theme } = useThemeMode();

  const tones = {
    default: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textMuted,
    },
    success: {
      backgroundColor: theme.colors.successSoft,
      color: theme.colors.success,
    },
    warning: {
      backgroundColor: theme.colors.warningSoft,
      color: theme.colors.warning,
    },
    danger: {
      backgroundColor: theme.colors.dangerSoft,
      color: theme.colors.danger,
    },
    primary: {
      backgroundColor: theme.colors.primarySoft,
      color: theme.colors.primary,
    },
  };

  const selected = tones[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: selected.backgroundColor,
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      <AppText variant="caption" color={selected.color}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});