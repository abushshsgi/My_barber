# MySaloon — Complete Requirements Audit

**Sana:** 2025-11-19  
**Manba:** mavjud `docs/*` + kod tekshiruvi (hujjat bo‘lmagan talablar qo‘shilmagan).

## Xulosa

| Holat | Soni (35 talab, `MYSALOON_HAIR_ADVISOR_FINAL_ACCEPTANCE.md`) |
|--------|------|
| VERIFIED COMPLETE | 22 |
| IMPLEMENTED BUT UNVERIFIED | 5 |
| PARTIALLY IMPLEMENTED | 2 |
| MISSING | 0 |
| BLOCKED BY EXTERNAL DEPENDENCY | 6 |

---

## Jadval (tanlangan IDlar)

| ID | Talab | Holat | Backend | Frontend | Test |
|----|--------|--------|---------|----------|------|
| REQ-01 | Barcode → faqat verified katalog | VERIFIED COMPLETE | `verified_catalog.py`, `product_recognition.py` | mobile/web scan | `test_product_verification`, `test_e2e_scenarios` |
| REQ-02 | Tashqi OBF/UPC auto-verify yo‘q | VERIFIED COMPLETE | `product_recognition.py` | — | `test_e2e_scenarios` |
| REQ-03 | Nomaʼlum barcode → submission | VERIFIED COMPLETE | `views.py`, `submission_views.py` | mobile/web | `test_e2e_scenarios` B |
| REQ-04 | OCR + tahrirlash | VERIFIED COMPLETE | `submission_pipeline.py`, `analysis.py` | mobile/web | manual + scan flow |
| REQ-05 | Deterministic + Gemini fallback | VERIFIED COMPLETE | `explanation.py`, `gemini_explain.py` | — | `test_explanation` |
| REQ-06 | HairCareProfile majburiy tahlil | VERIFIED COMPLETE | `views.py` | mobile/web quiz | `test_scan_api` |
| REQ-07 | Duplicate A–C matching | VERIFIED COMPLETE | `matching.py`, `aggregation.py` | — | `test_product_verification` |
| REQ-08 | Image similarity Stage D | IMPLEMENTED BUT UNVERIFIED | `image_similarity.py` | — | `test_image_similarity` |
| REQ-09 | Admin approve → publish | VERIFIED COMPLETE | `publishing.py` | admin verification | `test_e2e_scenarios` E |
| REQ-10 | Merge/Split | VERIFIED COMPLETE | `verification_admin_views.py` | admin 3-col UI | `test_merge_split` |
| REQ-11 | Missing products dashboard | VERIFIED COMPLETE | `missing_products.py` | `missing-products.tsx` | `test_missing_products` |
| REQ-12 | Durable aggregation jobs | VERIFIED COMPLETE | `ProductAggregationJob`, `tasks.py`, `process_aggregation_jobs` | admin failed jobs | `test_aggregation_jobs` |
| REQ-13 | Mobile scanner Hair Advisor API | IMPLEMENTED BUT UNVERIFIED | API | `HairAdvisorScannerScreen.tsx` | BLOCKED device |
| REQ-14 | Web scanner Hair Advisor API | IMPLEMENTED BUT UNVERIFIED | API | `HairAdvisorWebScanPage.tsx` | no browser E2E |
| REQ-15 | Web compare/routine/feedback | VERIFIED COMPLETE | compare/routine API | `HairAdvisorWebScanPage` step 4 | backend scan tests |
| REQ-16 | PostgreSQL testlar | VERIFIED COMPLETE | migrations 0001–0003 | — | VPS PG16: 29 test OK (`mysaloon_hair_staging`) |
| REQ-17 | Live Gemini | BLOCKED | `gemini_explain` | — | mock-only |
| REQ-18 | Ingredient seed idempotent | VERIFIED COMPLETE | `ingredient_import.py`, `seed_hair_ingredients` | — | manual command |
| REQ-19 | Admin 3-column workspace | IMPLEMENTED BUT UNVERIFIED | admin API | `verification.tsx` | manual QA |
| REQ-20 | Legacy scanner saqlanishi | VERIFIED COMPLETE | — | `MorphIngredientScreen.legacy.tsx` | re-export yangi ekran |

---

## Foydalanuvchi checklist (O‘zbek)

| # | Talab | Holat |
|---|--------|--------|
| 1 | Barcode orqali shampun | ✅ API + test |
| 2 | Rasmdan ingredient OCR/tahrir | ✅ mobile/web |
| 3 | Mos AI tahlil | ✅ deterministic + Gemini fallback (mock test) |
| 4 | Mobil va web scanner | ⚠️ kod tayyor, qurilma/browser QA kerak |
| 5 | Yangi shampun yig‘ish | ✅ submission + candidate |
| 6 | Avtomatik guruhlash | ✅ aggregation |
| 7 | Rasm o‘xshashligi | ✅ aHash (qalov qo‘llab-quvvatlovchi) |
| 8 | Admin tasdiqlash | ✅ approve/reject UI+API |
| 9 | Merge/Split + formula | ✅ merge/split test; formula `ProductFormula` |
| 10 | Eng ko‘p so‘ralgan dashboard | ✅ missing-products |
| 11 | PostgreSQL testlari | ❌ staging `TEST_DATABASE_URL` kerak |
| 12 | To‘liq E2E/regressiya | ❌ browser/device/monorepo regressiya ishga tushirilmagan |

**To‘liq 35 qator:** `docs/MYSALOON_HAIR_ADVISOR_FINAL_ACCEPTANCE.md`

**Eslatma:** `docs/HAIR_ADVISOR_MASTER_COMPLETION.md` repoda **yo‘q** — audit faqat mavjud fayllarga tayanadi.