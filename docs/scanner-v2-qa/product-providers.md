# Scanner V2 — Product providers

The lookup chain is `default_providers()` in `backend/hair_advisor/services/scanner/product_providers/chain.py`.

Order:

1. Verified MySaloon catalog (`VerifiedCatalogProvider`)
2. Open Beauty Facts
3. UPCitemdb trial

Paid Barcode Lookup and GS1 are not in the chain. No paid credential is read. The scanner still resolves products from the verified database and the two free/trial sources when those respond. A missing paid key changes nothing, because there is nothing to configure.

## Verified catalog

| Item | Value |
| --- | --- |
| Code | `hair_advisor.services.scanner.product_providers.verified` |
| Credentials | None. Uses the app database. |
| When data is missing | Returns no hit. The chain continues. |
| Writes | Reads the catalog. A scan row is stored only after an authenticated `POST /api/v1/hair-advisor/scans/`. |

## Open Beauty Facts

| Item | Value |
| --- | --- |
| Code | `fetch_open_beauty_facts` in `backend/ai/services/product_barcode_lookup.py` |
| URL | `https://world.openbeautyfacts.org/api/v2/product/{barcode}` |
| Authentication | None. Request header `User-Agent: MyBarber-MorphAI/1.0`. |
| License | Open Beauty Facts product data is under the Open Database License. Do not treat an OBF hit as a verified MySaloon product. The provider returns `found=False` and an external hint. |
| When the request fails | The provider returns nothing. Lookup continues. |

## UPCitemdb trial

| Item | Value |
| --- | --- |
| Code | `fetch_upcitemdb` |
| URL | `https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}` |
| Authentication | None in this codebase. The trial endpoint is used, not a paid key. |
| License | Trial access is rate limited and not a full catalog license. Hits stay unverified hints. |
| When the trial errors or is empty | The provider returns nothing. The scanner UI still runs. |

## Paid providers (not enabled)

| Provider | Status |
| --- | --- |
| Barcode Lookup | Not implemented. No environment variable is read. |
| GS1 | Not implemented. No environment variable is read. |

Do not buy a subscription for this release. Adding a key to the server environment does not turn these providers on.

## Required environment variables

None for barcode providers. Django still needs its existing database settings for the verified catalog. Those are the app’s normal settings, not scanner-specific secrets, and they are not listed here.

QA must use a local or staging database. Do not point a test client at `https://api.mysaloon.uz` if the session will create scans.
