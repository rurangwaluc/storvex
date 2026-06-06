import { Href, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../ui/AppText";
import type { AppShellPalette } from "./AppShell";

type AppBackButtonProps = {
  label?: string;
  to: string;
  palette: AppShellPalette;
};

export function AppBackButton({
  label = "Back",
  to,
  palette,
}: AppBackButtonProps) {
  return (
    <Pressable
      onPress={() => router.replace(to as Href)}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.iconBox}>
        <Ionicons name="arrow-back-outline" size={17} color="#06111F" />
      </View>

      <AppText variant="label" color={palette.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconBox: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },
});