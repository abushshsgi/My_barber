# Duplicate Matching Algorithm

## Stages

| Stage | Signal | Rule |
|-------|--------|------|
| A | Barcode | Exact digit match |
| B | Metadata | Brand + name similarity ≥ 0.82 |
| C | INCI | Jaccard ≥ 0.88 on normalized INCI |
| D | Image | Reserved (not enabled) |
| E | Conflict | Same barcode + INCI Jaccard < 0.65 |
| F | Grouping | Attach to best open candidate or create new |

## Conflict example

Same barcode with INCI list A vs B → `ProductConflict(inci_mismatch)`; candidate `status=conflict`.

## Spam control

Per-user content fingerprint deduplication; submission counts are evidence, not truth.