import { getActiveUserId, loadFaceProfileHistory } from "@/lib/face-profile";
import { loadSavedAiStyles } from "@/lib/saved-ai-styles";
import { loadMorphAiGenerations } from "@/lib/morph-ai-gallery";

const ONBOARD_KEY_PREFIX = "mysaloon.morphAi.onboarded";

function onboardKey() {
  const userId = getActiveUserId();
  return userId ? `${ONBOARD_KEY_PREFIX}:${userId}` : `${ONBOARD_KEY_PREFIX}:guest`;
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
