import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeMode } from "../../lib/theme/useThemeMode";

type AppScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  contentStyle?: ViewStyle;
};

export function AppScreen({
  children,
  scroll = true,
  padded = true,
  keyboardAvoiding = true,
  contentStyle,
}: AppScreenProps) {
  const { theme } = useThemeMode();

  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scrollContent,
        padded ? { padding: theme.spacing[5] } : null,
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.fixedContent,
        padded ? { padding: theme.spacing[5] } : null,
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
  },
});