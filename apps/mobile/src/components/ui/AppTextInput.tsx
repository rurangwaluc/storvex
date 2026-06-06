import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useThemeMode } from "../../lib/theme/useThemeMode";
import { AppText } from "./AppText";

type AppTextInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function AppTextInput({ label, error, style, ...props }: AppTextInputProps) {
  const { theme } = useThemeMode();

  return (
    <View style={styles.wrapper}>
      {label ? <AppText variant="label">{label}</AppText> : null}

      <TextInput
        {...props}
        placeholderTextColor={theme.colors.textSoft}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            color: theme.colors.text,
            borderRadius: theme.radius.lg,
          },
          style,
        ]}
      />

      {error ? (
        <AppText variant="caption" color={theme.colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
});