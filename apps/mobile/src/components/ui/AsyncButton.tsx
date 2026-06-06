import type { ReactNode } from "react";
import { useState } from "react";
import type {
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { AppButton } from "./AppButton";

type AsyncButtonProps = Omit<PressableProps, "onPress" | "style"> & {
  children: ReactNode;
  onPress: () => Promise<void> | void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AsyncButton({
  children,
  onPress,
  disabled,
  variant = "primary",
  fullWidth = false,
  style,
  ...props
}: AsyncButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    if (loading) return;

    try {
      setLoading(true);
      await onPress();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppButton
      {...props}
      variant={variant}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      style={style}
      onPress={handlePress}
    >
      {children}
    </AppButton>
  );
}