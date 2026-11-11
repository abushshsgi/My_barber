# MySaloon AI Try-On — Hairstyle Quality (FLUX 3 Image Klein)

## Model

- **Model:** `bfl:flux@3-image-klein` (FLUX 3 Image Klein)
- **Steps:** 16 (default; override `RUNWARE_TRYON_STEPS` within 1–50)
- **Output:** 1024×1024 target via `RUNWARE_TRYON_WIDTH/HEIGHT` (selfie aspect preserved when sizing)
- **References:** `inputs.referenceImages` — `[user selfie, Explore catalog portrait]`
- **Documented cost (1024², 16 steps):** ~$0.006; business cap `RUNWARE_TRYON_MAX_COST_USD=0.009`
- **Rollback:** `RUNWARE_TRYON_FALLBACK_MODELS=runware:400@6` (overflow only; cost-filtered)

## Dual reference

`RUNWARE_TRYON_DUAL_REFERENCE=true` (default). FLUX 3 **requires** two references; missing catalog file → 400 (no text-only fallback).

Reference order:

1. User selfie (identity, scene, original hair color)
2. Selected Explore catalog image (hairstyle silhouette only)

Backend resolves catalog path from the published `Hairstyle` record (`style_id`); client URLs are not trusted.

## Prompts

- **Version:** `TRYON_PROMPT_VERSION=v2` (master transfer + style lock)
- **Legacy:** `TRYON_PROMPT_VERSION=legacy` for long prompt stack rollback
- **Negative prompt:** not sent to FLUX 3 (unsupported); legacy Runware models may still use `negativePrompt` when CFG > 1

## Quality pipeline

- **Pre-flight:** documented cost estimate vs `RUNWARE_TRYON_MAX_COST_USD`
- **Face:** `tryon_preserve.preserve_face` (skin IoU / shift)
- **Optional retry:** `RUNWARE_TRYON_QUALITY_RETRY` (off by default)
- **QC:** `tryon_quality.assess_tryon_quality`

## VPS deploy

See `deploy/vps/deploy-tryon-dual-reference.sh`. Set `RUNWARE_TRYON_MODEL=bfl:flux@3-image-klein` in production env before restart `mysaloon.service`.
