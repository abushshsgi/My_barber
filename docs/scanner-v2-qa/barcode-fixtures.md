# Scanner V2 — barcode fixtures (synthetic)

**Important:** These codes are **checksum-valid synthetic GTINs** for unit/e2e testing and decoder QA.  
They are **NOT** claimed product matches. Do not assert brand/name/SKU identity from these values alone.

## Retail GTIN fixtures

| Label | Digits | Notes |
|-------|--------|-------|
| EAN-13 | `5901234123457` | Classic valid EAN-13 checksum sample |
| EAN-8 | `96385074` | Valid EAN-8 |
| UPC-A | `036000291452` | Leading zero preserved as string |
| UPC-A as EAN-13 | `0036000291452` | Equivalence candidate of UPC-A above |
| GTIN-14 | `00036000291452` | Zero-padded form of UPC-A |
| UPC-E (expand) | `02345673` | Expands to valid UPC-A via GS1 rules |
| Checksum fail | `5901234123450` | Same body as EAN-13 sample, bad check digit |
| Too short | `123` | Must reject |
| GS1 Digital Link | `https://id.gs1.org/01/0036000291452` | Extract GTIN only — **never auto-navigate** |
| Plain URL | `https://example.com/product` | Identifier type `url`, not retail |

## International prefix samples (identifier shape ONLY)

These demonstrate that country/region prefixes are **metadata**, not product gates.  
When used in tests, codes must still pass GS1 checksum; **no verified catalog identity is implied**.

| Prefix flavour | Construction | Claim |
|----------------|--------------|-------|
| DE-like `400…` | Build valid EAN-13 from 12-digit body `400638133393` + check digit | Identifier sample only |
| JP/JAN-like `490…` | Build valid EAN-13 from body `490123456789` + check digit | Identifier sample only |

Product resolution still requires verified DB / configured external providers.  
A valid checksum ≠ a known shampoo in MySaloon.

## Image fixtures

Place optional static barcode PNGs under `docs/scanner-v2-qa/fixtures/` for gallery/decode experiments.  
Label each file with the expected digits and `SIMULATED` in the filename when generated digitally (not photographed from a physical pack).

## Related matrix

See `docs/scanner-v2-capability-matrix.md` for live vs image decoder support by platform.
