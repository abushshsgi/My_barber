# Hair Advisor Scanner V2 — implementation plan

**Status (2026-11-21):** Web-first phase 1 in progress. Backend stays on `/api/v1/hair-advisor/*` (no parallel `/scanner/` routes).

## Audit summary

| Layer | Reuse |
|-------|--------|
| API | `POST /hair-advisor/scans/`, confirm-ingredients, analyze, history |
| Backend | `lookup_by_barcode`, `run_ocr_for_scan`, `run_analysis_for_scan`, `HairCareProfile` gate |
| Web routes | `/ai-style/care/ingredient/*` |
| Legacy | Do not wire `HairAdvisorWebScanPage` / `MorphAiIngredientScanPage` |

## Delivered in this wave (web)

- `useHairAdvisorScanner` UI state machine
- Premium overlay (purple corners, scan line, green barcode success)
- Full-bleed camera, dual mode (barcode / product image via `camera_label`)
- Stable barcode reads (2-frame debounce)
- `Mahsulot topilmadi` panel + manual barcode
- Demo result: `/ai-style/care/ingredient/result/demo`

## Next (not in this commit)

- Mobile parity (`HairAdvisor2ScanScreen`)
- Product confirmation UI when OCR returns multiple candidates
- Shared package for FSM between web/mobile
- Playwright scanner smoke tests
- Legacy page removal

## Spec mapping

| Spec | Implementation |
|------|----------------|
| `POST /scanner/barcode/` | `POST /hair-advisor/scans/` `input_method: barcode` |
| `POST /scanner/recognize-image/` | `camera_label` / `gallery` on same endpoint |
| `POST /scanner/analyze/` | `POST /hair-advisor/analyze/` |
| `GET /scanner/history/` | `GET /hair-advisor/history/` |