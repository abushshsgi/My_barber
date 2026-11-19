# Hair Advisor — Final Architecture

See also `PRODUCT_VERIFICATION_ARCHITECTURE.md` and `HAIR_ADVISOR_ARCHITECTURE.md`.

## Flow

```
Mobile / Web Scanner
  → /api/v1/hair-advisor/scans/
  → verified_catalog | product_not_found | OCR
  → confirm-ingredients → analysis (care_match + gemini_explain fallback)
  → submissions → aggregation (sync in tests, async thread in prod)
  → admin verification → publish → CareProduct + HairProduct + ProductFormula
```

## Trust boundaries

- LLM explains only; never writes verified catalog.
- User submissions stay in `ProductSubmission` until admin approve.
- External barcode APIs: hints only.