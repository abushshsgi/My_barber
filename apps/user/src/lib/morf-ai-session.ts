import { getActiveUserId, loadFaceProfileHistory } from "@/lib/face-profile";
import { loadSavedAiStyles } from "@/lib/saved-ai-styles";
import { loadMorphAiGenerations } from "@/lib/morf-ai-gallery";

const ONBOARD_KEY_PREFIX = "mysaloon.morphAi.onboarded";

function scopedKey(prefix: string) {
  const userId = getActiveUserId();
  return userId ? `${prefix}:${userId}` : `${prefix}:guest`;
}

function onboardKey() {
  return scopedKey(ONBOARD_KEY_PREFIX);
}

export function markMorphAiOnboarded() {
  try {
    localStorage.setItem(onboardKey(), "1");
  } catch {
    /* noop */
  }
}

export function hasMorphAiOnboarded(): boolean {
  try {
    if (localStorage.getItem(onboardKey()) === "1") return true;
  } catch {
    /* noop */
  }
  if (loadFaceProfileHistory().length > 0) return true;
  if (loadSavedAiStyles().length > 0) return true;
  if (loadMorphAiGenerations().length > 0) return true;
  return false;
}
