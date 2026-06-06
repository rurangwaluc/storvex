import { View } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";
import { AppButton } from "./AppButton";
import { AppText } from "./AppText";

type ErrorStateProps = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
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

      {onRetry ? <AppButton onPress={onRetry}>{retryLabel}</AppButton> : null}
    </View>
  );
}