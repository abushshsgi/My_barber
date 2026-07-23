from pathlib import Path
from unittest.mock import patch

from django.test import TestCase, override_settings

from ai.explore_published import (
    explore_asset_available,
    is_explore_asset_published,
    publish_explore_asset,
    resolve_explore_asset_url,
)


@override_settings(
    MEDIA_ROOT="/tmp/mybarber-explore-test-media",
    API_PUBLIC_BASE_URL="https://api.test.local",
)
class ExplorePublishedTests(TestCase):
    def setUp(self):
        self.media_root = Path("/tmp/mybarber-explore-test-media")
        if self.media_root.exists():
            for path in sorted(self.media_root.rglob("*"), reverse=True):
                if path.is_file():
                    path.unlink()
                elif path.is_dir():
                    path.rmdir()
        self.media_root.mkdir(parents=True, exist_ok=True)

    def test_resolve_url_does_not_recurse(self):
        url = resolve_explore_asset_url(audience="men", persona_id="irland", slug="reference")
        self.assertEqual(url, "/hairstyles/men/personas/irland/reference.webp")

    def test_publish_copies_draft_and_updates_manifest(self):
        draft = self.media_root / "explore_gen" / "irland" / "old-money-loose-curl.webp"
        draft.parent.mkdir(parents=True, exist_ok=True)
        draft.write_bytes(b"fake-webp")

        # PUBLIC_ROOT mavjud bo'lsa live shu yerga yoziladi — test uchun MEDIA ga majburan.
        live_under_media = self.media_root / "hairstyles" / "men" / "personas" / "irland" / "old-money-loose-curl.webp"
        with patch("ai.explore_published.PUBLIC_ROOT", Path("/tmp/mybarber-explore-missing-public")):
            result = publish_explore_asset(persona_id="irland", slug="old-money-loose-curl")

            self.assertTrue(result["published"])
            self.assertTrue(is_explore_asset_published("irland", "old-money-loose-curl"))
            self.assertTrue(live_under_media.is_file())
            # Front view — DB/media da bo'lsa /media URL
            self.assertEqual(
                resolve_explore_asset_url(
                    audience="men", persona_id="irland", slug="old-money-loose-curl"
                ),
                "https://api.test.local/media/hairstyles/men/personas/irland/old-money-loose-curl.webp",
            )
            self.assertTrue(explore_asset_available("irland", "old-money-loose-curl"))

    def test_gallery_includes_multiple_published_views(self):
        with patch("ai.explore_published.PUBLIC_ROOT", Path("/tmp/mybarber-explore-missing-public")):
            for view, name in [
                ("front", "old-money-loose-curl.webp"),
                ("right", "old-money-loose-curl__right.webp"),
            ]:
                draft = self.media_root / "explore_gen" / "irland" / name
                draft.parent.mkdir(parents=True, exist_ok=True)
                draft.write_bytes(b"fake-webp")
                publish_explore_asset(persona_id="irland", slug="old-money-loose-curl", view=view)

            from ai.explore_personas import list_persona_style_gallery

            with patch("ai.explore_published.PUBLIC_ROOT", Path("/tmp/mybarber-explore-missing-public")):
                gallery = list_persona_style_gallery(
                    audience="men", persona_id="irland", slug="old-money-loose-curl"
                )
        views = [item["view"] for item in gallery]
        self.assertEqual(views, ["front", "right"])
