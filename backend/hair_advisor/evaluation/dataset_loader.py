"""Load and validate labeled evaluation manifests."""

from __future__ import annotations

import json
from pathlib import Path

from ai.models import CareProduct

from .types import LabeledSample


REQUIRED_FIELDS = (
    "sample_id",
    "evaluation_mode",
    "scenario",
    "expected_catalog_presence",
    "annotation_source",
    "annotation_verified",
)


def _default_manifest_dir() -> Path:
    return Path(__file__).resolve().parent / "fixtures"


def load_manifest(path: Path | str | None = None) -> list[LabeledSample]:
    if path is None:
        path = _default_manifest_dir() / "offline_manifest.json"
    manifest_path = Path(path)
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Evaluation manifest not found: {manifest_path}")

    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Manifest must be a JSON array")

    samples: list[LabeledSample] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        for key in REQUIRED_FIELDS:
            if key not in row:
                raise ValueError(f"Sample {row.get('sample_id')} missing required field: {key}")
        samples.append(
            LabeledSample(
                sample_id=str(row["sample_id"]),
                evaluation_mode=row["evaluation_mode"],
                scenario=str(row["scenario"]),
                expected_catalog_presence=bool(row["expected_catalog_presence"]),
                annotation_source=str(row["annotation_source"]),
                annotation_verified=bool(row["annotation_verified"]),
                ground_truth_product_id=row.get("ground_truth_product_id"),
                ground_truth_product_slug=row.get("ground_truth_product_slug"),
                brand=str(row.get("brand") or ""),
                product_name=str(row.get("product_name") or ""),
                variant=str(row.get("variant") or ""),
                volume_ml=row.get("volume_ml"),
                barcode=row.get("barcode"),
                image_path=row.get("image_path"),
                capture_device=row.get("capture_device"),
                lighting_condition=row.get("lighting_condition"),
                capture_angle=row.get("capture_angle"),
                image_quality_label=row.get("image_quality_label"),
                gemini_payload=row.get("gemini_payload"),
                expect_status=row.get("expect_status"),
                notes=str(row.get("notes") or ""),
            )
        )
    return samples


def resolve_ground_truth_ids(samples: list[LabeledSample]) -> tuple[list[LabeledSample], list[str]]:
    """Map slug → pk against current DB; record inconsistencies."""
    issues: list[str] = []
    for sample in samples:
        if sample.ground_truth_product_id:
            exists = CareProduct.objects.filter(pk=sample.ground_truth_product_id, is_published=True).exists()
            if not exists and sample.expected_catalog_presence:
                issues.append(
                    f"{sample.sample_id}: ground_truth_product_id={sample.ground_truth_product_id} missing in catalog"
                )
        if sample.ground_truth_product_slug and not sample.ground_truth_product_id:
            care = CareProduct.objects.filter(slug=sample.ground_truth_product_slug, is_published=True).first()
            if care:
                sample.ground_truth_product_id = care.pk
            elif sample.expected_catalog_presence:
                issues.append(f"{sample.sample_id}: slug {sample.ground_truth_product_slug} not in catalog")
    return samples, issues


def count_manifest_stats(samples: list[LabeledSample]) -> dict[str, int]:
    real_images = sum(
        1 for s in samples if s.evaluation_mode == "image_file" and s.image_path and Path(s.image_path).is_file()
    )
    pending_images = sum(1 for s in samples if s.evaluation_mode == "image_file" and not real_images)
    return {
        "total": len(samples),
        "real_image_files_present": real_images,
        "image_file_samples_without_file": pending_images,
        "ocr_fixture": sum(1 for s in samples if s.evaluation_mode == "ocr_fixture"),
        "barcode_string": sum(1 for s in samples if s.evaluation_mode == "barcode_string"),
    }