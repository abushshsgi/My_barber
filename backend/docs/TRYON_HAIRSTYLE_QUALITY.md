# MySaloon AI Try-On — Hairstyle Quality (Pruna P-Image-Edit)

## Model verification (Runware docs)

- **Model:** `prunaai:2@1` — **P-Image-Edit** (image editing / image-to-image), **not** text-to-image-only.
- **Task:** `imageInference` (set by `runware_client`).
- **Inputs:** `inputs.referenceImages` — **1–4** images; production uses **one** user selfie.
- **Prompt:** `positivePrompt` max **2000** characters.
- **Dimensions:** fixed 1K presets only (e.g. `896×1184` for 3:4).
- **Unsupported on this model:** `steps`, `CFGScale`, `negativePrompt`, `scheduler`, `seed`, `strength`, masks.

## Production workflow

```text
USER PHOTO → SELECTED HAIRSTYLE TEXT PROMPT → prunaai:2@1 → RESULT
```

Explore catalog PNG/WebP paths are **frontend preview only** — never attached to Runware for Pruna.

Prompt assembly: `ai/tryon_prompt_catalog.py` (per-slug structure, volume, silhouette) → `ai/tryon_generation_prompts.py` + identity block → `build_pruna_tryon_prompt`. Validated by `ai/test_tryon_generation_prompts.py` for every seeded catalog slug (<2000 chars).

## API compatibility

| Parameter | Supported |
| --- | --- |
| `inputs.referenceImages` (1+) | Yes — **user selfie only** (default) |
| `positivePrompt` (max **2000**) | Yes |
| `width` / `height` (exact pairs) | Yes |
| `outputFormat` / `outputQuality` | Yes |
| Catalog model photo as 2nd reference | **No** (disabled for Pruna) |

## Legacy dual reference

`RUNWARE_TRYON_DUAL_REFERENCE=false` (default). When `true` and model is **not** Pruna, a second catalog image may be sent for FLUX-style edit models only.

## Quality pipeline

- **Scene lock:** `preserve_hair_only_edit` locks **lower** frame (clothing/background), not a band through the jaw (`TRYON_SCENE_LOCK`).
- **Face:** `tryon_preserve.preserve_face`
- **Hair-echo retry:** `TRYON_HAIR_CHANGE_RETRY`
- **QC:** `tryon_quality.assess_tryon_quality`

## Environment

```env
TRYON_PROVIDER=runware
RUNWARE_TRYON_MODEL=prunaai:2@1
RUNWARE_TRYON_WIDTH=896
RUNWARE_TRYON_HEIGHT=1184
RUNWARE_TRYON_TIMEOUT=120
RUNWARE_TRYON_DUAL_REFERENCE=false
RUNWARE_TRYON_INCLUDE_COST=false
TRYON_RAW_OUTPUT=true
TRYON_SCENE_LOCK=false
TRYON_FACE_RESTORE=false
TRYON_HAIR_CHANGE_RETRY=false
TRYON_PROMPT_VERSION=pruna
```