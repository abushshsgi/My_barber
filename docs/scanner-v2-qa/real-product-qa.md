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

## Device acceptance (2026-11-27)

No phone or emulator run produced these results. Local browser screenshots and unit tests do not count. Every row stays **NOT VERIFIED** until a physical device pass is written down with evidence.

| Check | Status |
| --- | --- |
| Kamera avtomatik ochildi | NOT VERIFIED |
| Shampun barcode'i tugmasiz o‘qildi | NOT VERIFIED |
| Koreya mahsuloti o‘qildi | NOT VERIFIED |
| AQSH mahsuloti o‘qildi | NOT VERIFIED |
| Mahsulot nomi to‘g‘ri topildi | NOT VERIFIED |
| Mahsulot rasmi to‘g‘ri chiqdi | NOT VERIFIED |
| Tarkibi to‘g‘ri olindi | NOT VERIFIED |
| Hair Advisor tahlil qildi | NOT VERIFIED |
| Natija UI to‘g‘ri ko‘rindi | NOT VERIFIED |
| Galereyadan barcode o‘qildi | NOT VERIFIED |
| Internet o‘chirilganda scanner ishladi | NOT VERIFIED |
| Qayta skanerlash ishladi | NOT VERIFIED |
| Scan history saqlandi | NOT VERIFIED |

## Dev diagnostics

In a development build, open the scanner and tap **QA**. Copy the report. It includes platform, permission, decoder, formats, redacted barcode, validation, lock, lookup, provider, advisor, latency, and the error line. It does not include tokens or the full barcode. Production builds hide this panel.
