# Scanner V2 — Real product QA sheet

Fill this on a physical device. Leave every cell blank until that run happens. Automated tests do not complete this sheet.

Barcode detection and product-database coverage are separate. A valid decode with “product not found” is a catalog miss, not a scanner failure.

There is no country allowlist. Checksum-valid EAN/UPC from any GS1 prefix is accepted. Prefix samples are covered by `packages/scanner` and `backend/hair_advisor/tests/test_scanner_barcode_normalize.py`.

Use the local or staging API from `docs/scanner-v2-qa/staging-preview.md`. Do not write these scans into production.

## Per product

Copy one block per physical item. Do not invent the results.

| Field | Shampoo | Conditioner | Hair mask | Hair serum | Hair oil | Other cosmetic |
| --- | --- | --- | --- | --- | --- | --- |
| Barcode detected (yes/no) | | | | | | |
| Barcode format | | | | | | |
| Barcode validation | | | | | | |
| Detection latency | | | | | | |
| Product found (yes/no) | | | | | | |
| Product identity correct | | | | | | |
| Ingredients available | | | | | | |
| Advisor analysis successful | | | | | | |
| Result UI correct | | | | | | |
| Notes (redact the barcode) | | | | | | |

Identity “correct” means the name and brand on the pack match the screen. Ingredients “available” means the result shows an ingredient list, not that every INCI token was audited.

## Dev diagnostics

In a development build, open the scanner and tap **QA**. Copy the report. It includes platform, permission, decoder, formats, redacted barcode, validation, lock, lookup, provider, advisor, latency, and the error line. It does not include tokens or the full barcode. Production builds hide this panel.
