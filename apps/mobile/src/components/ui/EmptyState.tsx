import { View } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";
import { AppButton } from "./AppButton";
import { AppText } from "./AppText";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useThemeMode();

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[10],
      }}
    >
      <AppText variant="subtitle" center>
        {title}
      </AppText>

      <AppText variant="muted" center>
        {message}
      </AppText>

      {actionLabel && onAction ? (
        <AppButton onPress={onAction}>{actionLabel}</AppButton>
      ) : null}
    </View>
  );
}