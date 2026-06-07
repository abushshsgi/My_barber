import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";

const FACE_PROFILE_KEY = "mysaloon.ai.faceProfile";

export type SavedFaceProfile = {
  faceShapeKey: FaceShapeKey;
  hairTypeKey?: HairTypeKey;
  ratios: {
    widthToHeight: number;
    jawToForehead: number;
  };
  scannedAt: string;
  source: "camera_scan" | "ai_analysis";
};

export function saveFaceProfile(profile: SavedFaceProfile) {
  try {
    localStorage.setItem(FACE_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* noop */
  }
}

export function loadFaceProfile(): SavedFaceProfile | null {
  try {
    const raw = localStorage.getItem(FACE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedFaceProfile;
  } catch {
    return null;
  }
}

export function clearFaceProfile() {
  try {
    localStorage.removeItem(FACE_PROFILE_KEY);
  } catch {
    /* noop */
  }
}
