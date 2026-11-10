from django.test import SimpleTestCase

from media_store.serve_helpers import is_private_media_path, media_etag


class ServeHelpersTests(SimpleTestCase):
    def test_private_tryon_path(self):
        self.assertTrue(is_private_media_path("ai-style/tryon-results/2026/03/abc.jpg"))

    def test_public_salon_cover(self):
        self.assertFalse(is_private_media_path("salons/covers/foo.webp"))

    def test_wallet_receipts_private(self):
        self.assertTrue(is_private_media_path("wallet/card_receipts/x.pdf"))

    def test_etag_stable(self):
        from datetime import datetime, timezone

        ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.assertEqual(media_etag(1024, ts), media_etag(1024, ts))
