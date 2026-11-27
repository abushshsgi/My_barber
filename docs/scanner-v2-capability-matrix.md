# Scanner V2 — Decoder Capability Matrix

Formats listed as **Live** must be detectable from the camera stream without a shutter.
Formats listed as **Image** are supported via static image / gallery decode or backend OCR.

**Code truth (RC):**

- Web native detector formats = `ean_13`, `ean_8`, `upc_a`, `upc_e`, `code_128`
  (`HairAdvisorBarcodeCamera.tsx` `NATIVE_FORMATS`).
- Web gallery ZXing retail hints = EAN-13/8 + UPC-A/E only.
- Mobile live = `EXPO_PRIMARY_BARCODE_TYPES` (`ean13`, `ean8`, `upc_a`, `upc_e`).
- Mobile gallery still image:
  - Android `scanFromURLAsync` = ML Kit (`ean13`, `ean8`, `upc_a`, `upc_e`, `code128`, `code39`, `qr`, `datamatrix`) when Play Services are present. Not PDF417/Aztec.
  - iOS `scanFromURLAsync` = **QR only** (`CIDetectorTypeQRCode` in `expo-camera` `CameraViewModule.swift`). The requested type list is ignored.
  - Both platforms then try a JPEG ZXing decode for EAN-13/8, UPC-A/E, CODE-128, and QR (rotations 0/90/180/270). EXIF is baked with `expo-image-manipulator` before decode.
  - If no checksum-valid retail GTIN is found, the existing authenticated `createHairScan` image path runs. No second scanner pipeline.

| Format | Web Live | Web Image | Android Live | iOS Live | Notes |
|--------|----------|-----------|--------------|----------|-------|
| EAN-13 / JAN-13 | Yes | Yes (ZXing) | Yes | Yes | Primary retail |
| EAN-8 / JAN-8 | Yes | Yes (ZXing) | Yes | Yes | Primary retail |
| UPC-A | Yes | Yes (ZXing) | Yes | Yes | Primary retail |
| UPC-E | Yes* | Yes* (ZXing) | Yes* | Yes* | *Expand before lookup |
| CODE-128 | Yes (native BD) | Partial† | No (primary set) | No (primary set) | Not in web ZXing retail hints |
| Data Matrix | Partial† | Partial† | No | No | Only if browser BD exposes it |
| CODE-39 / 93 / ITF / Codabar / PDF417 / Aztec | Partial† | Partial† | No | No | Not in primary live sets |
| QR Code | Rejected for retail auto-lookup | Rejected | No auto-nav | No auto-nav | URL / non-GTIN → invalid retail |
| GS1 Digital Link | Parse after decode | Parse after decode | Parse after decode | Parse after decode | Extract GTIN; never open URL |

† “Partial” = depends on browser `BarcodeDetector` / ZXing availability; **not** claimed as verified on all devices.

## Retail-optimized strategy

1. **Primary live:** EAN-13, EAN-8, UPC-A, UPC-E (+ CODE-128 on web native detector).
2. **Gallery:** Web barcode mode tries ZXing first. Mobile tries native still-image decode, then JPEG ZXing, then the existing server image path.
3. Reject non-product identifiers (URLs without GTIN) for automatic product lookup.

## Libraries

| Platform | Library |
|----------|---------|
| Web | Native `BarcodeDetector` when available; `@zxing/browser` + `@zxing/library` fallback |
| Mobile live | `expo-camera` `CameraView` barcode API |
| Mobile gallery | `scanFromURLAsync` (Android ML Kit; iOS QR only) + `@zxing/library` JPEG + existing server image fallback |

Do not claim universal format support beyond this matrix.
