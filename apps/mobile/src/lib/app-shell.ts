import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppShell = "mysaloon" | "morph";

const SHELL_KEY = "mysaloon.appShell";
const LAST_MYSALOON_KEY = "mysaloon.appShell.last.mysaloon";
const LAST_MORPH_KEY = "mysaloon.appShell.last.morph";

export const APP_SHELL_DEFAULT_MYSALOON = "Home" as const;
export const APP_SHELL_DEFAULT_MORPH = "MorphTryOn" as const;

const MYSALOON_TABS = new Set(["Home", "Map", "Explore", "Profile"]);
const MORPH_TABS = new Set([
  "MorphChat",
  "MorphCare",
  "MorphIngredient",
  "MorphTryOn",
  "Profile",
]);

export async function readAppShell(): Promise<AppShell> {
  try {
    const raw = await AsyncStorage.getItem(SHELL_KEY);
    return raw === "morph" ? "morph" : "mysaloon";
  } catch {
    return "mysaloon";
  }
}

export async function writeAppShell(shell: AppShell): Promise<void> {
  try {
    await AsyncStorage.setItem(SHELL_KEY, shell);
  } catch {
    /* ignore */
  }
}

export async function readLastShellTab(shell: AppShell): Promise<string> {
  const fallback = shell === "morph" ? APP_SHELL_DEFAULT_MORPH : APP_SHELL_DEFAULT_MYSALOON;
  try {
    const key = shell === "morph" ? LAST_MORPH_KEY : LAST_MYSALOON_KEY;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const allowed = shell === "morph" ? MORPH_TABS : MYSALOON_TABS;
    return allowed.has(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export async function writeLastShellTab(shell: AppShell, tab: string): Promise<void> {
  const allowed = shell === "morph" ? MORPH_TABS : MYSALOON_TABS;
  if (!allowed.has(tab)) return;
  try {
    const key = shell === "morph" ? LAST_MORPH_KEY : LAST_MYSALOON_KEY;
    await AsyncStorage.setItem(key, tab);
  } catch {
    /* ignore */
  }
}

/** Morph shellga o‘tganda Profile emas, oxirgi AI tab. */
export async function readLastMorphContentTab(): Promise<string> {
  const last = await readLastShellTab("morph");
  if (last === "Profile" || last === "MorphStudio") return APP_SHELL_DEFAULT_MORPH;
  return last;
}
