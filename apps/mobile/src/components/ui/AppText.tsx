import type { ReactNode } from "react";
import { Text, type TextProps, StyleSheet } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";

type AppTextVariant =
  | "display"
  | "hero"
  | "title"
  | "subtitle"
  | "body"
  | "muted"
  | "caption"
  | "label";

type AppTextProps = TextProps & {
  children: ReactNode;
  variant?: AppTextVariant;
  color?: string;
  center?: boolean;
};

export function AppText({
  children,
  variant = "body",
  color,
  center = false,
  style,
  ...props
}: AppTextProps) {
  const { theme } = useThemeMode();

  const variantStyle = {
    display: {
      fontSize: theme.typography.sizes["3xl"],
      lineHeight: theme.typography.lineHeights["3xl"],
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      letterSpacing: -1.2,
    },
    hero: {
      fontSize: theme.typography.sizes["2xl"],
      lineHeight: theme.typography.lineHeights["2xl"],
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      letterSpacing: -0.8,
    },
    title: {
      fontSize: theme.typography.sizes.xl,
      lineHeight: theme.typography.lineHeights.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: theme.typography.sizes.lg,
      lineHeight: theme.typography.lineHeights.lg,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text,
    },
    body: {
      fontSize: theme.typography.sizes.base,
      lineHeight: theme.typography.lineHeights.base,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
    },
    muted: {
      fontSize: theme.typography.sizes.base,
      lineHeight: theme.typography.lineHeights.base,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.textMuted,
    },
    caption: {
      fontSize: theme.typography.sizes.xs,
      lineHeight: theme.typography.lineHeights.xs,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.textSoft,
    },
    label: {
      fontSize: theme.typography.sizes.sm,
      lineHeight: theme.typography.lineHeights.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
    },
  }[variant];

  return (
    <Text
      {...props}
      style={[
        styles.text,
        variantStyle,
        color ? { color } : null,
        center ? styles.center : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
  },
  center: {
    textAlign: "center",
  },
});