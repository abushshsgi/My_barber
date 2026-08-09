import AsyncStorage from "@react-native-async-storage/async-storage";

/** v2 — Welcome/Guide faqat birinchi marta. */
const INTRO_KEY = "mysaloon.morph.tryon.intro.v2";

/** Birinchi marta Try-on marketing + carousel ko‘rilganmi. */
export async function hasCompletedMorphTryOnIntro(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(INTRO_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function markMorphTryOnIntroDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* ignore */
  }
}
