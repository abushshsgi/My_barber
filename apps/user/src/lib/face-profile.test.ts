import { beforeEach, describe, expect, it } from "vitest";
import {
  loadFaceProfileHistory,
  migrateFaceProfileOnLogout,
  prepareFaceProfileStorageForUser,
} from "@/lib/face-profile";

const LEGACY_HISTORY = "mysaloon.ai.faceHistory";
const SCOPED_HISTORY = (userId: number) => `mysaloon.ai.faceHistory:${userId}`;

const SAMPLE_HISTORY = JSON.stringify([
  {
    id: "1",
    photoDataUrl: "data:image/jpeg;base64,abc",
    scannedAt: "2026-01-01T00:00:00.000Z",
    source: "gallery",
  },
]);

describe("face-profile legacy migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("discards orphan legacy on fresh login", () => {
    localStorage.setItem(LEGACY_HISTORY, SAMPLE_HISTORY);
    prepareFaceProfileStorageForUser(99);
    expect(localStorage.getItem(LEGACY_HISTORY)).toBeNull();
    expect(loadFaceProfileHistory(99)).toEqual([]);
  });

  it("claims orphan legacy on session restore", () => {
    localStorage.setItem(LEGACY_HISTORY, SAMPLE_HISTORY);
    prepareFaceProfileStorageForUser(42, { allowLegacyClaim: true });
    expect(localStorage.getItem(LEGACY_HISTORY)).toBeNull();
    expect(loadFaceProfileHistory(42)).toHaveLength(1);
  });

  it("does not assign legacy to a different user on fresh login", () => {
    localStorage.setItem(LEGACY_HISTORY, SAMPLE_HISTORY);
    prepareFaceProfileStorageForUser(2);
    expect(loadFaceProfileHistory(1)).toEqual([]);
    expect(localStorage.getItem(SCOPED_HISTORY(1))).toBeNull();
  });

  it("migrates legacy to scoped storage on logout", () => {
    localStorage.setItem(LEGACY_HISTORY, SAMPLE_HISTORY);
    migrateFaceProfileOnLogout(7);
    expect(localStorage.getItem(LEGACY_HISTORY)).toBeNull();
    expect(localStorage.getItem(SCOPED_HISTORY(7))).toBe(SAMPLE_HISTORY);
  });
});
