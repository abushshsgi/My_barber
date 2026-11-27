# Scanner V2 — Decoder Capability Matrix

Formats listed as **Live** must be detectable from the camera stream without a shutter.
Formats listed as **Image** are supported via static image / gallery decode or backend OCR.

| Format | Web Live | Web Image | Android Live | iOS Live | Notes |
|--------|----------|-----------|--------------|----------|-------|
| EAN-13 / JAN-13 | Yes | Yes | Yes | Yes | Primary retail |
| EAN-8 / JAN-8 | Yes | Yes | Yes | Yes | Primary retail |
| UPC-A | Yes | Yes | Yes | Yes | Primary retail |
| UPC-E | Yes* | Yes* | Yes* | Yes* | *Expand before lookup |
| Data Matrix | Partial† | Yes† | No | No | †ZXing / BarcodeDetector when available |
| CODE-128 | Partial† | Yes† | Extended‡ | Extended‡ | ‡May enable in extended live set |
| CODE-39 | Partial† | Yes† | Extended‡ | Extended‡ | Logistics risk — validate type |
| CODE-93 | Partial† | Yes† | No | No | Fallback image |
| ITF / ITF-14 | Partial† | Yes† | No | No | Prefer GTIN path when 14 digits |
| Codabar | Partial† | Yes† | No | No | Rare for cosmetics |
| QR Code | Partial† | Yes† | Optional | Optional | Never auto-navigate URLs |
| PDF417 | Partial† | Yes† | No | No | Image / BarcodeDetector |
| Aztec | Partial† | Yes† | No | No | Image / BarcodeDetector |
| GS1-128 | Via CODE-128 | Via CODE-128 | Via CODE-128 | Via CODE-128 | Parse AIs when structured |
| GS1 Digital Link | Parse after decode | Parse after decode | Parse after decode | Parse after decode | Extract GTIN; no URL open |

## Retail-optimized strategy

1. **Primary live:** EAN-13, EAN-8, UPC-A, UPC-E (+ Data Matrix on web when supported).
2. **Extended:** enable for gallery/static or optional live mode to avoid frame thrash.
3. Reject non-product identifiers (URLs, serials, logistics-only) for automatic product lookup unless user confirms.

## Libraries

| Platform | Library |
|----------|---------|
| Web | Native `BarcodeDetector` when available; `@zxing/browser` + `@zxing/library` fallback |
| Mobile | `expo-camera` barcode API; gallery may use server OCR / optional JS decode |

Do not claim universal format support beyond this matrix.
