import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from "@expo-google-fonts/quicksand";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "../src/lib/api/queryClient";
import { useAuthStore } from "../src/store/authStore";
import { useThemeMode } from "../src/lib/theme/useThemeMode";
import { useThemeStore } from "../src/store/themeStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrateToken = useAuthStore((state) => state.hydrateToken);
  const hydrateMode = useThemeStore((state) => state.hydrateMode);
  const { resolvedMode, theme } = useThemeMode();

  const [fontsLoaded, fontError] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  useEffect(() => {
    void hydrateToken();
    void hydrateMode();
  }, [hydrateToken, hydrateMode]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});