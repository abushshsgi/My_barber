# Scanner V2 — Decoder Capability Matrix

Formats listed as **Live** must be detectable from the camera stream without a shutter.
Formats listed as **Image** are supported via static image / gallery decode or backend OCR.

**Code truth (RC):**

- Web native detector formats = `ean_13`, `ean_8`, `upc_a`, `upc_e`, `code_128`
  (`HairAdvisorBarcodeCamera.tsx` `NATIVE_FORMATS`).
- Web gallery ZXing retail hints = EAN-13/8 + UPC-A/E only.
- Mobile live = `EXPO_PRIMARY_BARCODE_TYPES` (`ean13`, `ean8`, `upc_a`, `upc_e`).
- Mobile gallery = **server image/OCR upload** (no client barcode-from-image decode).

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
2. **Gallery:** Web barcode mode tries ZXing first; mobile always uploads image for server path.
3. Reject non-product identifiers (URLs without GTIN) for automatic product lookup.

## Libraries

| Platform | Library |
|----------|---------|
| Web | Native `BarcodeDetector` when available; `@zxing/browser` + `@zxing/library` fallback |
| Mobile | `expo-camera` barcode API; gallery → server OCR / hybrid recognition |

Do not claim universal format support beyond this matrix.
