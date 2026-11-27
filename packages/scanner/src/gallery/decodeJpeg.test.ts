import { BarcodeFormat, EncodeHintType, QRCodeWriter } from "@zxing/library";
import { encode as encodeJpeg } from "jpeg-js";
import { describe, expect, it } from "vitest";
import { decodeJpegRetailBarcode, rotateRgba90 } from "./decodeJpeg";

const EAN_13 = "5901234123457";

const L: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
};
const G: Record<string, string> = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111",
};
const R: Record<string, string> = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100",
};
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** Synthetic EAN-13 modules. ZXing's published package encodes QR only, so tests draw the bars. */
function ean13Modules(code: string): string {
  const first = Number(code[0]);
  const parity = PARITY[first] ?? "LLLLLL";
  let bits = "101";
  for (let i = 0; i < 6; i += 1) {
    const digit = code[i + 1] ?? "0";
    bits += (parity[i] === "G" ? G[digit] : L[digit]) ?? L["0"];
  }
  bits += "01010";
  for (let i = 0; i < 6; i += 1) {
    const digit = code[i + 7] ?? "0";
    bits += R[digit] ?? R["0"];
  }
  bits += "101";
  return bits;
}

function bitsToJpeg(bits: string, degrees: 0 | 90): Uint8Array {
  const quiet = 24;
  const modulePx = 4;
  const modules = quiet + bits.length + quiet;
  const width = modules * modulePx;
  const height = 140;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const moduleIndex = Math.floor(x / modulePx) - quiet;
      const on = moduleIndex >= 0 && moduleIndex < bits.length && bits[moduleIndex] === "1" && y > 12 && y < height - 12;
      const p = (y * width + x) * 4;
      const v = on ? 0 : 255;
      rgba[p] = v;
      rgba[p + 1] = v;
      rgba[p + 2] = v;
      rgba[p + 3] = 255;
    }
  }
  const turned = degrees === 90 ? rotateRgba90(rgba, width, height) : { data: rgba, width, height };
  return encodeJpeg({ data: turned.data, width: turned.width, height: turned.height }, 100).data;
}

function qrJpeg(text: string): Uint8Array {
  const hints = new Map();
  hints.set(EncodeHintType.MARGIN, 4);
  const matrix = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 280, 280, hints);
  const width = matrix.getWidth();
  const height = matrix.getHeight();
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const on = matrix.get(x, y);
      const p = (y * width + x) * 4;
      const v = on ? 0 : 255;
      rgba[p] = v;
      rgba[p + 1] = v;
      rgba[p + 2] = v;
      rgba[p + 3] = 255;
    }
  }
  return encodeJpeg({ data: rgba, width, height }, 100).data;
}

describe("decodeJpegRetailBarcode", () => {
  it("reads a synthetic EAN-13 JPEG", () => {
    const hit = decodeJpegRetailBarcode(bitsToJpeg(ean13Modules(EAN_13), 0));
    expect(hit).toEqual({ text: EAN_13, format: "ean_13" });
  });

  it("reads the same code after a 90 degree pixel rotation", () => {
    const hit = decodeJpegRetailBarcode(bitsToJpeg(ean13Modules(EAN_13), 90));
    expect(hit?.text).toBe(EAN_13);
    expect(hit?.format).toBe("ean_13");
  });

  it("accepts a QR payload that is itself a retail GTIN", () => {
    const hit = decodeJpegRetailBarcode(qrJpeg(EAN_13));
    expect(hit?.text).toBe(EAN_13);
  });

  it("rejects a QR that is only a URL", () => {
    expect(decodeJpegRetailBarcode(qrJpeg("https://example.com/product"))).toBeNull();
  });

  it("returns null for an image with no barcode", () => {
    const rgba = new Uint8Array(80 * 40 * 4);
    rgba.fill(180);
    const jpeg = encodeJpeg({ data: rgba, width: 80, height: 40 }, 90);
    expect(decodeJpegRetailBarcode(jpeg.data)).toBeNull();
  });

  it("returns null for bytes that are not a JPEG", () => {
    expect(decodeJpegRetailBarcode(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});
