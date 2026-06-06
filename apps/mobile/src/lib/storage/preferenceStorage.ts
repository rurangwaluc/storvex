import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getPreferenceItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setPreferenceItem(
  key: string,
  value: string,
): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function removePreferenceItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}