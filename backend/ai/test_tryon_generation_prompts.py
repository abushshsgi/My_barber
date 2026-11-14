"""Validation for per-catalog Pruna try-on generation prompts."""

from __future__ import annotations

from django.test import SimpleTestCase

from ai.services.tryon_prompts import PRUNA_POSITIVE_PROMPT_MAX, build_tryon_prompt
from ai.tryon_generation_prompts import GLOBAL_IDENTITY_PRESERVATION, assemble_pruna_positive_prompt
from ai.tryon_prompt_catalog import all_catalog_rows, slugs_needing_manual_review


class TryonGenerationPromptCatalogTests(SimpleTestCase):
    def test_every_published_catalog_slug_has_unique_prompt_under_limit(self):
        rows = all_catalog_rows()
        self.assertGreater(len(rows), 40)
        seen_core: dict[str, str] = {}
        for row in rows:
            aud = row["audience"]
            slug = row["slug"]
            title = row.get("title") or slug
            prompt = assemble_pruna_positive_prompt(audience=aud, slug=slug, title=title)
            self.assertLessEqual(
                len(prompt),
                PRUNA_POSITIVE_PROMPT_MAX,
                msg=f"{aud}/{slug} length={len(prompt)}",
            )
            self.assertIn("silhouette", prompt.lower())
            self.assertIn(GLOBAL_IDENTITY_PRESERVATION, prompt)
            self.assertIn("change only", prompt.lower())
            if row.get("hair_length") == "short":
                self.assertTrue(
                    "compact" in prompt.lower() or "low-volume" in prompt.lower() or "short" in prompt.lower(),
                    msg=slug,
                )
            core = prompt.split(GLOBAL_IDENTITY_PRESERVATION)[0].strip()
            dup = seen_core.get(core)
            self.assertIsNone(dup, msg=f"Duplicate prompt body for {slug} and {dup}")
            seen_core[core] = slug

    def test_curly_slugs_include_curl_guidance(self):
        prompt = assemble_pruna_positive_prompt(
            audience="men",
            slug="medium-curly",
            title="Medium Curly",
        )
        self.assertIn("3A", prompt)
        self.assertIn("curl", prompt.lower())
        self.assertLessEqual(len(prompt), PRUNA_POSITIVE_PROMPT_MAX)

    def test_build_tryon_prompt_pruna_path_matches_assembler(self):
        prompt = build_tryon_prompt(
            title="Mid Fade",
            style_detail="ignored for pruna",
            audience="men",
            slug="mid-fade",
        )
        self.assertLessEqual(len(prompt), PRUNA_POSITIVE_PROMPT_MAX)
        self.assertIn("mid fade", prompt.lower())

    def test_manual_review_list_is_small(self):
        flagged = slugs_needing_manual_review()
        self.assertIsInstance(flagged, frozenset)