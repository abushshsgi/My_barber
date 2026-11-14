# MySaloon AI Try-On — Hairstyle Quality (Pruna P-Image-Edit)

## Model

- **Model:** `prunaai:2@1` (Pruna P-Image-Edit)
- **Output:** Documented 1K presets (e.g. `896×1184` for 3:4 portrait; env `768×1024` maps to that preset)
- **References:** `inputs.referenceImages` — `[user selfie, Explore catalog portrait]` (1–4 images)
- **Documented cost (1024² reference edit):** ~$0.0088; business cap `RUNWARE_TRYON_MAX_COST_USD=0.012`
- **No Try-On FLUX fallback:** `RUNWARE_TRYON_FALLBACK_MODELS` empty by default

## Dual reference

`RUNWARE_TRYON_DUAL_REFERENCE=true` (default). P-Image-Edit supports **1–4** reference images. Missing catalog file → 400 (no text-only fallback when dual reference is required).

Reference order:

1. User selfie (identity, scene, original hair color)
2. Selected Explore catalog image (hairstyle silhouette only)

## API compatibility (OpenAPI `prunaai:2@1`, 2025-11)

| Parameter | Supported |
| --- | --- |
| `taskType` `imageInference` | Yes (added by client) |
| `inputs.referenceImages` (1–4, required) | Yes |
| `positivePrompt` (max **2000**) | Yes |
| `width` / `height` (exact pairs only) | Yes — see table below |
| `outputFormat` (JPG/PNG/WEBP), `outputQuality` | Yes |
| `providerSettings.prunaai.turbo` | Optional (`RUNWARE_TRYON_PRUNA_TURBO`) |
| `steps`, `CFGScale`, `negativePrompt`, `scheduler`, request `seed` | **No** — omitted (`additionalProperties: false`) |
| `strength`, mask, `seedImage` | No |

### Allowed width × height (only these reach Runware)

| Label | Width | Height |
| --- | ---: | ---: |
| 1:1 | 1024 | 1024 |
| 4:3 | 1184 | 896 |
| 3:4 | 896 | 1184 |
| 16:9 | 1376 | 768 |
| 9:16 | 768 | 1376 |
| 3:2 | 1248 | 832 |
| 2:3 | 832 | 1248 |

`RUNWARE_TRYON_WIDTH=768` and `HEIGHT=1024` is **not** a valid API pair; backend maps 3:4 intent to **896×1184**.

## Prompts

- **Version:** `TRYON_PROMPT_VERSION=pruna` (compact transfer prompt, ≤2000 chars)
- **Rollback:** `TRYON_PROMPT_VERSION=v2` or `legacy`

## Quality pipeline

- **Catalog ref:** `prepare_catalog_hair_reference` (`RUNWARE_TRYON_CATALOG_DESATURATE`)
- **Scene lock:** `preserve_hair_only_edit` (`TRYON_SCENE_LOCK`)
- **Face:** `tryon_preserve.preserve_face`
- **Hair-echo retry:** `TRYON_HAIR_CHANGE_RETRY`
- **QC:** `tryon_quality.assess_tryon_quality`

## VPS deploy

Update production `.env`:

```env
RUNWARE_TRYON_MODEL=prunaai:2@1
RUNWARE_TRYON_FALLBACK_MODELS=
RUNWARE_TRYON_WIDTH=768
RUNWARE_TRYON_HEIGHT=1024
RUNWARE_TRYON_TIMEOUT=120
RUNWARE_TRYON_MAX_COST_USD=0.012
TRYON_PROMPT_VERSION=pruna
```

Then restart `mysaloon.service` and try-on workers (no auto-deploy from CI).