"""Style lock and v2 prompt tests."""

from __future__ import annotations

from django.test import SimpleTestCase, override_settings

from ai.services.tryon_prompts import build_tryon_prompt
from ai.services.tryon_style_lock import resolve_style_lock


class TryOnStyleLockTests(SimpleTestCase):
    def test_pompadour_lock_has_signature_volume(self):
        lock = resolve_style_lock(audience="men", slug="pompadour", title="Pompadour")
        self.assertIn("volume", lock.top_volume.lower())
        self.assertIn("back", lock.hair_direction.lower())
        self.assertNotIn("stacked", lock.curl_pattern.lower())

    def test_curly_slick_back_avoids_forehead_curls(self):
        lock = resolve_style_lock(audience="men", slug="curly-slick-back", title="Curly Slick Back")
        self.assertIn("back", lock.hair_direction.lower())
        self.assertIn("forehead", lock.fringe_type.lower())

    def test_buzz_cut_even_length(self):
        lock = resolve_style_lock(audience="men", slug="buzz-cut", title="Buzz Cut")
        self.assertEqual(lock.hair_texture, "clipper-short")
        self.assertIn("uniform", lock.silhouette.lower())

    @override_settings(TRYON_PROMPT_VERSION="v2")
    def test_v2_prompt_uses_style_lock_not_legacy_stack(self):
        detail = "mid fade haircut, clean taper"
        prompt = build_tryon_prompt(
            title="Mid Fade",
            style_detail=detail,
            audience="men",
            slug="mid-fade",
        )
        self.assertIn("SELECTED HAIRSTYLE LOCK", prompt)
        self.assertIn("IDENTITY PRESERVATION (layer A)", prompt)
        self.assertNotIn("CRITICAL IDENTITY PRESERVATION", prompt)
        self.assertNotIn("PROFESSIONAL HAIRSTYLE TRANSFORMATION", prompt)
        self.assertLessEqual(len(prompt), 10000)

    @override_settings(TRYON_PROMPT_VERSION="v2")
    def test_v2_dual_reference_uses_master_transfer_block(self):
        prompt = build_tryon_prompt(
            title="Pompadour",
            style_detail="pompadour volume",
            audience="men",
            slug="pompadour",
            include_catalog_image=True,
        )
        self.assertIn("IMAGE 2 — TARGET HAIRSTYLE", prompt)
        self.assertIn("If the selected style is Pompadour", prompt)
        self.assertNotIn("No catalog model photograph is attached", prompt)

    @override_settings(TRYON_PROMPT_VERSION="legacy")
    def test_legacy_rollback_still_available(self):
        prompt = build_tryon_prompt(
            title="Mid Fade",
            style_detail="mid fade",
            audience="men",
            slug="mid-fade",
        )
        self.assertIn("CRITICAL IDENTITY PRESERVATION", prompt)
        self.assertIn("PROFESSIONAL HAIRSTYLE TRANSFORMATION", prompt)
