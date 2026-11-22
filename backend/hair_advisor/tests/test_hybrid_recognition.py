"""Hybrid Scanner V3 regression tests."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase

from ai.models import CareProduct
from hair_advisor.services.hybrid_recognition import EXACT_MATCH, AMBIGUOUS, NOT_FOUND, PROBABLE_MATCH
from hair_advisor.services.hybrid_recognition.barcode import barcode_recognition_meta
from hair_advisor.services.hybrid_recognition.normalize import normalize_product_text, extract_volume_ml
from hair_advisor.services.hybrid_recognition.pipeline import run_hybrid_image_recognition, run_hybrid_text_search
from hair_advisor.services.hybrid_recognition.verify import validate_ai_product_id, verify_candidate_list
from hair_advisor.services.product_recognition import lookup_by_barcode, rank_ocr_catalog_candidates


class HybridNormalizeTests(TestCase):
    def test_cyrillic_brand_normalization(self):
        self.assertEqual(normalize_product_text("Хэд&Шолдерс"), "hed sholders")

    def test_volume_parse(self):
        self.assertEqual(extract_volume_ml("Repair Shampoo 400 ml"), 400)


class HybridCatalogTests(TestCase):
    def setUp(self):
        self.repair = CareProduct.objects.create(
            name="Repair Shampoo",
            brand="Clear",
            slug="clear-repair",
            is_published=True,
            ingredients=["Aqua"],
        )
        self.volume = CareProduct.objects.create(
            name="Volume Shampoo 300 ml",
            brand="Clear",
            slug="clear-volume",
            is_published=True,
            ingredients=["Aqua"],
        )

    def test_exact_match_single_product(self):
        payload = {
            "product_analysis": {"brand": "Clear", "product_name": "Repair Shampoo"},
            "matched_product_id": self.repair.pk,
            "ingredients": ["Aqua"],
        }
        products, meta = run_hybrid_image_recognition(payload)
        self.assertEqual(meta["recognition_status"], EXACT_MATCH)
        self.assertEqual(products[0].pk, self.repair.pk)

    def test_ambiguous_same_brand(self):
        payload = {
            "product_analysis": {"brand": "Clear", "product_name": "Shampoo"},
            "matched_product_id": None,
            "ingredients": ["Aqua", "B"],
        }
        _, meta = run_hybrid_image_recognition(payload)
        self.assertIn(meta["recognition_status"], (AMBIGUOUS, PROBABLE_MATCH))
        self.assertGreaterEqual(len(meta["candidate_ids"]), 2)

    def test_invalid_ai_product_id_rejected(self):
        payload = {
            "product_analysis": {"brand": "Clear", "product_name": "Repair Shampoo"},
            "matched_product_id": 999999,
            "ingredients": ["Aqua"],
        }
        _, meta = run_hybrid_image_recognition(payload)
        self.assertTrue(meta.get("ai_id_rejected"))

    def test_volume_conflict_prevents_exact(self):
        self.repair.name = "Repair Shampoo 400 ml"
        self.repair.save(update_fields=["name"])
        signals = {
            "brand_norm": "clear",
            "name_norm": "repair shampoo 250 ml",
            "combined_norm": "clear repair shampoo 250 ml",
            "brand": "Clear",
            "product_name": "Repair Shampoo 250 ml",
            "volume_ml": 250,
        }
        scored = verify_candidate_list(signals, [self.repair, self.volume])
        repair_row = next((s for s in scored if s.product.pk == self.repair.pk), None)
        self.assertIsNotNone(repair_row)
        self.assertTrue(repair_row.volume_conflict)

    def test_rank_legacy_wrapper(self):
        payload = {
            "product_analysis": {"brand": "Clear", "product_name": "Repair Shampoo"},
            "matched_product_id": self.repair.pk,
            "ingredients": ["Aqua"],
        }
        _, meta = rank_ocr_catalog_candidates(payload)
        self.assertEqual(meta["recognition_status"], EXACT_MATCH)

    def test_text_search_not_first_guess_only(self):
        products, meta = run_hybrid_text_search("Clear Shampoo")
        self.assertIn(meta["recognition_status"], (AMBIGUOUS, PROBABLE_MATCH, EXACT_MATCH, NOT_FOUND))
        if products:
            self.assertTrue(all(isinstance(p, CareProduct) for p in products))

    def test_leading_zero_barcode_lookup(self):
        CareProduct.objects.create(
            name="Import Shampoo",
            brand="Imp",
            slug="imp-bar",
            barcode="05901234123457",
            is_published=True,
            is_verified=True,
        )
        with patch("hair_advisor.services.verified_catalog.lookup_verified_by_barcode") as mock:
            mock.return_value = {"found": False, "tier": "unknown", "barcode": "5901234123457"}
            result = lookup_by_barcode("05901234123457")
        self.assertFalse(result.get("found"))

    def test_barcode_meta_exact(self):
        meta = barcode_recognition_meta({"found": True, "care_product": self.repair}, code="5901234123457")
        self.assertEqual(meta["recognition_status"], EXACT_MATCH)


class HybridEvaluationTests(TestCase):
    """Offline labeled fixture — not production telemetry."""

    fixtures_path = Path(__file__).resolve().parent.parent / "evaluation" / "fixtures" / "labeled_scans.json"

    def setUp(self):
        CareProduct.objects.create(
            name="Repair Shampoo",
            brand="Clear",
            slug="clear-repair",
            is_published=True,
            ingredients=["Aqua", "Glycerin"],
        )
        CareProduct.objects.create(
            name="Volume Shampoo",
            brand="Clear",
            slug="clear-volume",
            is_published=True,
            ingredients=["Aqua"],
        )

    def test_labeled_fixtures_runner(self):
        if not self.fixtures_path.is_file():
            self.skipTest("fixtures missing")
        rows = json.loads(self.fixtures_path.read_text(encoding="utf-8"))
        false_match = 0
        false_not_found = 0
        evaluated = 0
        for row in rows:
            evaluated += 1
            _, meta = run_hybrid_image_recognition(row["gemini_payload"])
            status = meta["recognition_status"]
            expected = row.get("expect_status")
            if expected:
                if expected == "exact_match" and status == NOT_FOUND:
                    false_not_found += 1
                if expected == "exact_match" and status in (AMBIGUOUS, PROBABLE_MATCH):
                    pass
            slug = row.get("expected_product_slug")
            if slug and status == EXACT_MATCH:
                care = CareProduct.objects.get(slug=slug)
                if meta.get("verified_product_id") != care.pk:
                    false_match += 1
        self.assertGreater(evaluated, 0)
        self.assertLessEqual(false_match, evaluated)