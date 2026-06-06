import { create } from "zustand";
import {
  getPreferenceItem,
  setPreferenceItem,
} from "../lib/storage/preferenceStorage";

export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "storvex_theme_mode";

type ThemeStore = {
  mode: ThemePreference;
  hasHydrated: boolean;

  hydrateMode: () => Promise<void>;
  setMode: (mode: ThemePreference) => Promise<void>;
  toggleMode: () => Promise<void>;
};

function getNextMode(mode: ThemePreference): ThemePreference {
  if (mode === "system") return "dark";
  if (mode === "dark") return "light";
  return "system";
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "system",
  hasHydrated: false,

  hydrateMode: async () => {
    const saved = await getPreferenceItem(THEME_KEY);

    set({
      mode: isThemePreference(saved) ? saved : "system",
      hasHydrated: true,
    });
  },

  setMode: async (mode) => {
    await setPreferenceItem(THEME_KEY, mode);
    set({ mode });
  },

  toggleMode: async () => {
    const next = getNextMode(get().mode);
    await setPreferenceItem(THEME_KEY, next);
    set({ mode: next });
  },
}));