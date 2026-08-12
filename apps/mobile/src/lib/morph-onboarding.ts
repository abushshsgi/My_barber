import AsyncStorage from "@react-native-async-storage/async-storage";

/** v2 — Welcome/Guide bir marta tugagach Capture ochiladi. */
const INTRO_KEY = "mysaloon.morph.tryon.intro.v2";
const STEP_KEY = "mysaloon.morph.tryon.intro.step";

const LAST_SLIDE = 2;

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
    await AsyncStorage.multiSet([
      [INTRO_KEY, "1"],
      [STEP_KEY, ""],
    ]);
    await AsyncStorage.removeItem(STEP_KEY);
  } catch {
    /* ignore */
  }
}

/** Carousel qayerda qolgani — login/onboardingdan keyin shu slayddan davom. */
export async function readMorphIntroStep(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STEP_KEY);
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.min(LAST_SLIDE, Math.max(0, Math.floor(n)));
  } catch {
    return 0;
  }
}

export async function writeMorphIntroStep(step: number): Promise<void> {
  try {
    const n = Math.min(LAST_SLIDE, Math.max(0, Math.floor(step)));
    await AsyncStorage.setItem(STEP_KEY, String(n));
  } catch {
    /* ignore */
  }
}
