# MySaloon — AI Hair Care Advisor 2.0 Codebase Audit

**Date:** 2025-11-19  
**Scope:** Barcode/INGI scanning, parvarish (care), hair profiles, navigation, booking shell.

## Executive summary

The repository (`Mybarber/`) already implements a substantial **Parvarish / Care** stack under `backend/ai/` plus mobile `MorphIngredientScreen` and web `MorphAiIngredientScanPage`. The new **Hair Advisor 2.0** layer extends this with versioned `/api/v1/hair-advisor/` endpoints, normalized scan/analysis models, deterministic-first ingredient evaluation, and premium Scan-centric navigation—without removing production `CareProduct` data or breaking Try-On / Chat / Auth.

---

## Backend (`backend/ai/`)

| Path | Responsibility | Dependencies | Used? | Reuse | Action |
|------|----------------|--------------|-------|-------|--------|
| `ai/models.py` — `CareProduct` | Admin catalog, barcode, ingredients | migrations, care APIs | **Yes** | High | **KEEP** — canonical product record |
| `ai/models.py` — `HairCareProfile` | User hair profile | care views, scans | **Yes** | High | **KEEP** |
| `ai/models.py` — `CareUserProduct` | Saved user products | care views | **Yes** | High | **KEEP** — routines reuse |
| `ai/models.py` — `IngredientScanEntry` | Legacy scan audit | ingredient scan | **Yes** | Medium | **KEEP** — link from HairScan |
| `ai/product_barcode_views.py` | Barcode lookup DB→OBF→UPC | care_match, subscriptions | **Yes** | High | **KEEP** — wrapped by hair_advisor |
| `ai/views.py` — `AiIngredientScanView` | POST image INCI (Gemini) | morph_care subscription | **Yes** | High | **KEEP** — OCR path for hair_advisor |
| `ai/services/care_match.py` | Deterministic fit scoring | ingredient_facts | **Yes** | High | **KEEP** — ingredient engine core |
| `ai/services/product_barcode_lookup.py` | External catalog adapters | HTTP APIs | **Yes** | High | **KEEP** |
| `ai/services/barcode_country.py` | Normalize barcode, GS1 country | barcode views | **Yes** | Medium | **REFACTOR** — checksum moved to hair_advisor |
| `ai/services/gemini_ingredient.py` | Vision OCR + JSON | Gemini | **Yes** | High | **KEEP** — explanation/OCR |
| `ai/services/ingredient_facts.py` | INCI fact dictionary | care_match | **Yes** | High | **KEEP** |
| `ai/care_views.py` | Profile, products, plan | HairCareProfile | **Yes** | High | **KEEP** |
| `ai/services/tryon_queue.py` | Try-On Redis queue | morph AI | **Yes** | High | **KEEP** — separate concurrency |

**Classification:** No duplicate product DB to delete. New `hair_advisor` app **ADDS** scan workflow models; does not drop `CareProduct`.

---

## Backend (`backend/hair_advisor/`) — NEW

| Module | Responsibility | Action |
|--------|----------------|--------|
| `models.py` | HairScan, HairAnalysis, Ingredient*, routines, comparisons | **REPLACE** (greenfield models) |
| `services/*` | Barcode validation, recognition, analysis pipeline | **NEW** |
| `views.py` | `/api/v1/hair-advisor/*` | **NEW** |

---

## Mobile (`apps/mobile/`)

| Path | Responsibility | Action |
|------|----------------|--------|
| `navigation/RootTabs.tsx` | Bottom nav + MySaloon↔Morph center switch | **REFACTOR** — Morph center → **Scan** |
| `navigation/MorphIngredientStack.tsx` | Scanner stack | **KEEP** — wire to hair-advisor API |
| `screens/morph/MorphIngredientScreen.tsx` | Barcode + label scan UI (~1700 LOC) | **REFACTOR** — premium UI + new API |
| `api/care.ts` | Barcode + ingredient APIs | **KEEP** — add `hair-advisor.ts` |
| `lib/barcode-beep.ts`, `lib/product-label.ts` | Camera/gallery helpers | **KEEP** |

**Booking/Bron navigation switch:** No dedicated Booking/Bron tab switch found in mobile nav. The obsolete pattern is the **center shell toggle** (MySaloon icon in Morph dock) used to exit Morph—replaced by Scan; MySaloon entry remains from Home profile paths. Booking screens (`BookingScreen.tsx`) remain **KEEP** (backend bookings active).

---

## Web user app (`apps/user/`)

| Path | Responsibility | Action |
|------|----------------|--------|
| `components/mobile/MobileDockNav.tsx` | Morph center MySaloon button | **REFACTOR** → Scan link |
| `components/ai-style/MorphAiIngredientScanPage.tsx` | Web scanner | **REFACTOR** — hair-advisor API |
| `routes/ai-style_.care_.ingredient.tsx` | Scan route | **KEEP** |
| `hooks/use-hair-care-profile.ts` | Profile | **KEEP** |

---

## Admin

| Path | Responsibility | Action |
|------|----------------|--------|
| `admin_parvarish_*`, `admin_baza_*` | Catalog, GS1, profiles | **KEEP** |
| `hair_advisor/admin.py` | Scan metrics | **NEW** |

---

## Conflicts / removals

| Item | Verdict |
|------|---------|
| Second scanner demo app | **None found** — do not create parallel project |
| Duplicate HairCareProfile | **None** — single model |
| Mock-only scan responses in production | **Forbidden** — hair_advisor uses real DB + Gemini/OCR |
| Voice AI Advisor | **Not present** — not implemented per requirements |

---

## Data preservation

- All `CareProduct`, `IngredientScanEntry`, and `HairCareProfile` rows preserved.
- `HairScan` may reference `care_product` FK and legacy `ingredient_scan_entry`.
- No `DROP TABLE` migrations planned.

---

## Environment / infra

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | OCR + explanation (existing) |
| Redis (`REDIS_URL`) | Scan state cache, rate limits (existing) |
| PostgreSQL | Persistent hair_advisor models |

---

## Test inventory (existing)

- `ai/test_barcode_country.py`, `ai/test_care_catalog_ai.py`, subscription morph_care tests — **KEEP**; run regression suite after changes.

---

## Implementation priority

1. `hair_advisor` models + migrations  
2. API `/api/v1/hair-advisor/`  
3. Mobile/web nav Scan center  
4. UI polish on existing scanner screens  
5. Admin metrics + documentation deliverables  