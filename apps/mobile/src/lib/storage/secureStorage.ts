import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const FALLBACK_PREFIX = "storvex_secure_fallback:";

async function canUseSecureStore() {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function fallbackKey(key: string) {
  return `${FALLBACK_PREFIX}${key}`;
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }

  try {
    return await AsyncStorage.getItem(fallbackKey(key));
  } catch {
    return null;
  }
}

export async function setSecureItem(
  key: string,
  value: string,
): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      // Fall through to AsyncStorage fallback.
    }
  }

  await AsyncStorage.setItem(fallbackKey(key), value);
}

export async function removeSecureItem(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Fall through and also clear fallback storage.
    }
  }

  await AsyncStorage.removeItem(fallbackKey(key));
}