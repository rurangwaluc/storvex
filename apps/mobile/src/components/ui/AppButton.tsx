import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type AppButtonProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  children,
  variant = "primary",
  loading = false,
  disabled,
  fullWidth = false,
  style,
  ...props
}: AppButtonProps) {
  const { theme } = useThemeMode();

  const isDisabled = disabled || loading;

  const variants = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      color: theme.colors.textInverse,
    },
    secondary: {
      backgroundColor: theme.isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(255,255,255,0.78)",
      borderColor: theme.colors.borderStrong,
      color: theme.colors.text,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: theme.colors.text,
    },
    danger: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
      color: theme.colors.textInverse,
    },
  };

  const selected = variants[variant];

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: selected.backgroundColor,
          borderColor: selected.borderColor,
          borderRadius: theme.radius.xl,
          opacity: isDisabled ? 0.55 : pressed ? 0.84 : 1,
          width: fullWidth ? "100%" : undefined,
          shadowColor: theme.colors.primary,
          shadowOpacity: variant === "primary" ? 0.22 : 0,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 12 },
          elevation: variant === "primary" ? 6 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={selected.color} />
      ) : (
        <AppText variant="label" color={selected.color} center>
          {children}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
});