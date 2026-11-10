import { describe, expect, it } from "vitest";
import {
  assessSelfieQuality,
  parseJpegOrientation,
  presentSelfieError,
  visibleVideoCrop,
} from "@/lib/selfie-normalize";

function jpegWithOrientation(orientation: number): Uint8Array {
  const tiff = new Uint8Array([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00,
    0x00, 0x01, (orientation >> 8) & 0xff, orientation & 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const payloadLength = 2 + 6 + tiff.length;
  const bytes = new Uint8Array(2 + 2 + 2 + 6 + tiff.length + 2);
  bytes.set([0xff, 0xd8, 0xff, 0xe1, (payloadLength >> 8) & 0xff, payloadLength & 0xff]);
  bytes.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6);
  bytes.set(tiff, 12);
  bytes.set([0xff, 0xd9], bytes.length - 2);
  return bytes;
}

describe("selfie normalization", () => {
  it("keeps the full height when the preview only crops the sides", () => {
    const crop = visibleVideoCrop({
      videoWidth: 1280,
      videoHeight: 720,
      viewWidth: 390,
      viewHeight: 844,
    });
    expect(crop.sy).toBe(0);
    expect(crop.sh).toBe(720);
    expect(crop.sw).toBeLessThan(1280);
    expect(crop.sx).toBeGreaterThan(0);
  });

  it("refuses a preview crop that would cut the forehead", () => {
    const crop = visibleVideoCrop({
      videoWidth: 1080,
      videoHeight: 1920,
      viewWidth: 1280,
      viewHeight: 720,
    });
    expect(crop).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 1920 });
  });

  it("rejects very small, blurry, dark, and extremely wide frames", () => {
    const small = assessSelfieQuality({ width: 240, height: 320 });
    const blurry = assessSelfieQuality({ width: 800, height: 1000, laplacianVariance: 4 });
    const dark = assessSelfieQuality({ width: 800, height: 1000, meanLuminance: 10 });
    const wide = assessSelfieQuality({ width: 2400, height: 800 });
    const fine = assessSelfieQuality({
      width: 800,
      height: 1000,
      laplacianVariance: 40,
      meanLuminance: 120,
    });
    expect(small.ok ? "" : small.code).toBe("low_resolution");
    expect(blurry.ok ? "" : blurry.code).toBe("blur");
    expect(dark.ok ? "" : dark.code).toBe("lighting");
    expect(wide.ok ? "" : wide.code).toBe("head_cropped");
    expect(fine.ok).toBe(true);
  });

  it("reads a JPEG orientation tag and leaves a plain file upright", () => {
    expect(parseJpegOrientation(jpegWithOrientation(6))).toBe(6);
    expect(parseJpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe(1);
  });

  it("turns a quality code into a retake sentence", () => {
    expect(presentSelfieError("selfie_quality:blur")).toMatch(/blurry/i);
    expect(presentSelfieError("Rasm yuklanmadi.")).toBe("Rasm yuklanmadi.");
    expect(
      presentSelfieError("selfie_quality:lighting", (key, fallback) =>
        key.endsWith("lighting") ? "Yorug'lik yetarli emas." : fallback,
      ),
    ).toBe("Yorug'lik yetarli emas.");
  });
});
