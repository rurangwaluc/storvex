import { StyleSheet, View, type ViewStyle } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = "100%",
  height = 16,
  radius,
  style,
}: SkeletonProps) {
  const { theme } = useThemeMode();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.md,
          backgroundColor: theme.isDark ? "#1E293B" : "#E2E8F0",
        },
        style,
      ]}
    />
  );
}

export function LandingSkeleton() {
  const { theme } = useThemeMode();

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <Skeleton height={32} width="70%" />
      <Skeleton height={18} width="90%" />
      <Skeleton height={18} width="78%" />
      <Skeleton height={180} radius={theme.radius.xl} />
      <Skeleton height={54} radius={theme.radius.lg} />
      <Skeleton height={54} radius={theme.radius.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});