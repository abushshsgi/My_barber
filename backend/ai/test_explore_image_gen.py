from unittest.mock import patch

from django.test import SimpleTestCase

from ai.services.explore_image_gen import (
    DEV_EXPLORE_PERSONA_IDS,
    _assert_dev_explore_job,
    _build_view_rotation_prompt,
    _collect_view_rotation_anchors,
    _style_side_consistency_hint,
    generate_explore_asset,
    list_explore_gen_jobs,
)
from ai.services.errors import AiStyleError

ACTIVE_SLUG = "curly-top-fade"


class ExploreImageGenPromptTests(SimpleTestCase):
    def test_irland_right_prompt_mentions_ginger_stubble(self):
        prompt = _build_view_rotation_prompt(
            persona_id="irland",
            slug=ACTIVE_SLUG,
            view="right",
            anchor_views=("front", "left", "reference"),
        )
        self.assertIn("light ginger stubble", prompt)
        self.assertIn("curl/wave", prompt.lower())

    def test_slavyan_prompt_is_clean_shaven(self):
        prompt = _build_view_rotation_prompt(
            persona_id="slavyan",
            slug="curly-top-fade",
            view="left",
            anchor_views=("front", "reference"),
        )
        self.assertIn("clean-shaven", prompt)

    def test_fade_style_gets_side_symmetry_hint(self):
        hint = _style_side_consistency_hint(slug="skin-fade", view="right")
        self.assertIn("RIGHT temple", hint)

    def test_curl_style_gets_back_hint(self):
        hint = _style_side_consistency_hint(slug=ACTIVE_SLUG, view="back")
        self.assertIn("back-of-head", hint)

    def test_non_fade_style_has_no_side_hint(self):
        hint = _style_side_consistency_hint(slug="buzz-cut", view="right")
        self.assertEqual(hint, "")

    def test_rejects_niki_persona(self):
        with self.assertRaises(AiStyleError) as ctx:
            _assert_dev_explore_job(persona_id="niki", slug=ACTIVE_SLUG, view="right")
        self.assertIn("Irland va Slavyan", ctx.exception.message)

    def test_rejects_unknown_persona(self):
        with self.assertRaises(AiStyleError):
            _assert_dev_explore_job(persona_id="unknown-persona", slug=ACTIVE_SLUG, view="front")

    def test_accepts_irland_and_slavyan(self):
        for pid in ("irland", "slavyan"):
            persona_id, view = _assert_dev_explore_job(
                persona_id=pid,
                slug=ACTIVE_SLUG,
                view="left",
            )
            self.assertEqual(persona_id, pid)
            self.assertEqual(view, "left")

    def test_list_jobs_only_irland_slavyan_all_views(self):
        jobs = list_explore_gen_jobs()
        self.assertTrue(jobs)
        persona_ids = {job["persona_id"] for job in jobs}
        self.assertEqual(persona_ids, DEV_EXPLORE_PERSONA_IDS)
        views = {job["view"] for job in jobs}
        self.assertEqual(views, {"front", "left", "right", "back"})
        # 2 personas × 12 styles × 4 views
        self.assertEqual(len(jobs), 96)

    def test_list_jobs_does_not_download_anchor_bodies(self):
        """Status polli to'liq webp yuklamasligi kerak (Railway stderr INFO spam)."""
        with patch(
            "ai.services.explore_image_gen._fetch_remote_static_image",
        ) as fetch_mock, patch(
            "ai.services.explore_image_gen._remote_static_image_exists",
            return_value=True,
        ), patch(
            "ai.services.explore_image_gen._load_public_image",
            return_value=None,
        ):
            jobs = list_explore_gen_jobs()
        self.assertEqual(len(jobs), 96)
        fetch_mock.assert_not_called()
        sample = next(j for j in jobs if j["slug"] != "reference" and j["view"] == "right")
        self.assertEqual(sample["explore_anchors"], {"front": True, "reference": True})

    def test_slavyan_collects_front_anchor_from_public(self):
        # Arxivdagi mid-fade fayli hali diskda — anchor yuklashni tekshirish uchun.
        anchors = _collect_view_rotation_anchors(
            persona_id="slavyan",
            slug="mid-fade",
            target_view="right",
        )
        self.assertGreaterEqual(len(anchors), 1)
        self.assertIn("PRIMARY ANCHOR", anchors[0][0])

    def test_collects_anchors_from_remote_when_public_missing(self):
        fake = b"RIFF" + b"\x00" * 200

        def fake_fetch(rel: str):
            if rel.endswith("mid-fade.webp"):
                return ("image/webp", fake)
            return None

        with patch(
            "ai.services.explore_image_gen._load_public_image",
            return_value=None,
        ), patch(
            "ai.services.explore_image_gen._fetch_remote_static_image",
            side_effect=fake_fetch,
        ):
            anchors = _collect_view_rotation_anchors(
                persona_id="irland",
                slug="mid-fade",
                target_view="right",
            )
        self.assertGreaterEqual(len(anchors), 1)
        self.assertIn("PRIMARY ANCHOR", anchors[0][0])

    def test_missing_front_raises_clear_error(self):
        with patch(
            "ai.services.explore_image_gen._collect_view_rotation_anchors",
            return_value=[],
        ):
            with self.assertRaises(AiStyleError) as ctx:
                generate_explore_asset(
                    persona_id="irland",
                    slug=ACTIVE_SLUG,
                    view="right",
                    force=True,
                )
        self.assertIn("OLD (front)", ctx.exception.message)
