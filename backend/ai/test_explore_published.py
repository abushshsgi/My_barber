from pathlib import Path

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

    def test_publish_copies_draft_and_updates_manifest(self):
        draft = self.media_root / "explore_gen" / "britan" / "buzz-cut.webp"
        draft.parent.mkdir(parents=True, exist_ok=True)
        draft.write_bytes(b"fake-webp")

        result = publish_explore_asset(persona_id="britan", slug="buzz-cut")

        self.assertTrue(result["published"])
        self.assertTrue(is_explore_asset_published("britan", "buzz-cut"))
        live = self.media_root / "hairstyles" / "men" / "personas" / "britan" / "buzz-cut.webp"
        self.assertTrue(live.is_file())
        self.assertEqual(
            resolve_explore_asset_url(audience="men", persona_id="britan", slug="buzz-cut"),
            "https://api.test.local/media/hairstyles/men/personas/britan/buzz-cut.webp",
        )
        self.assertTrue(explore_asset_available("britan", "buzz-cut"))
