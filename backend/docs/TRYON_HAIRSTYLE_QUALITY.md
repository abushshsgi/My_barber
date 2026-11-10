# MySaloon AI Try-On — Hairstyle Quality (runware:400@6)

## Root cause analysis

| Issue | Likely cause |
| --- | --- |
| Artificial / wig-like hair | Generic “match volume and curl” text without per-style locks; model invents texture |
| Exaggerated curls | Curly marker block applied to all curl slugs plus no backward/forward direction lock |
| Forehead / hairline drift | Competing instructions (“believable hairline” vs fixed anatomy); no post-QC in diagnostics |
| Inconsistent same style | `style_detail_for` varies widely (short classic vs long curly batch prompts); no structured lock |
| Wrong hairstyle invented | Single reference image + long redundant prompt; catalog photo intentionally omitted (face bleed) |
| Camera vs gallery variance | Previously divergent paths; now unified `prepare_selfie_bytes` (mirror still client-side for camera) |

## Prompt audit (production path)

- **Model:** `runware:400@6` (FLUX.2 klein 9B KV), steps=4, CFG=3.5, `inputs.referenceImages` (selfie first, catalog second when enabled).
- **Catalog reference image:** Sent when `RUNWARE_TRYON_DUAL_REFERENCE=true` (default). Master prompt + style lock instruct the model to use image 2 for hair only. Missing catalog file → controlled 400 error (no silent fallback).
- **Negative prompt:** Up to 3000 chars; omitted when CFG ≤ 1 or disabled.
- **Unsupported (never sent):** `strength`, `seedImage`, masks, inpaint fields.

### Versions

- **`TRYON_PROMPT_VERSION=v2` (default):** Layers A identity → anatomy → B style lock → color → reference → C quality.
- **`TRYON_PROMPT_VERSION=legacy`:** Previous long stack (rollback).

## Style Lock (layer B)

Implemented in `ai/services/tryon_style_lock.py`. Fields come from seed metadata + `style_detail_for`; hand-tuned overrides for buzz, crew, crop, curly fringe/slick back, pompadour, undercut, fades, side part.

## Reference conditioning

`runware:400@6` supports up to 4 `referenceImages` without per-image roles. Production uses **two references** when dual-reference is on: `[user selfie, selected Explore portrait]`. Set `RUNWARE_TRYON_DUAL_REFERENCE=false` to roll back to text + selfie only.

## Reproducibility

- Set `RUNWARE_TRYON_SEED_MODE=fixed` and `RUNWARE_TRYON_TEST_SEED` for controlled repeats (provider may still vary).
- Cross-person consistency is validated with human review + `benchmark_tryon` prompt diff, not seed alone.

## Quality control

- **Face:** `tryon_preserve.preserve_face` (skin IoU / shift); optional one retry via `RUNWARE_TRYON_QUALITY_RETRY`.
- **Diagnostics:** `tryon_quality.assess_tryon_quality` (hair-band change ratio, forehead stability) logged when `TRYON_DIAGNOSTICS` is on.

## Benchmark

```bash
python manage.py benchmark_tryon
python manage.py benchmark_tryon --output /tmp/tryon-prompt-report.json
```

Paid live matrix: requires `--execute --approve-spend` (placeholder guard — add authorized selfies before spend).

## Remaining limitations

- Without per-image roles, identity bleed from reference 2 is mitigated by prompts and `tryon_preserve`; monitor quality after enabling dual reference.
- Identity preservation is best-effort; FLUX edit models may still drift on difficult curls or low-light selfies.
- QC metrics are heuristic — not a substitute for human review or embedding “proof”.
