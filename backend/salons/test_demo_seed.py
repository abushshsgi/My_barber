from django.test import SimpleTestCase

from salons.mock.cover_urls import is_mock_salon, mock_cover_cdn_url
from salons.mock.demo_seed import (
    DEMO_BARBERS,
    DEMO_BARBER_COUNT,
    DEMO_SALON_COUNT,
    DEMO_SALONS,
    demo_barber_email,
)


class DemoSeedDataTests(SimpleTestCase):
    def test_counts(self):
        self.assertEqual(len(DEMO_SALONS), DEMO_SALON_COUNT)
        self.assertEqual(len(DEMO_BARBERS), DEMO_BARBER_COUNT)

    def test_unique_salon_names_and_slugs(self):
        self.assertEqual(len({s["slug"] for s in DEMO_SALONS}), DEMO_SALON_COUNT)
        self.assertEqual(len({s["name"] for s in DEMO_SALONS}), DEMO_SALON_COUNT)

    def test_each_barber_owns_at_least_one_salon(self):
        owners = {s["owner_slug"] for s in DEMO_SALONS}
        self.assertEqual(len(owners), DEMO_BARBER_COUNT)

    def test_demo_barber_emails(self):
        self.assertEqual(demo_barber_email("demo-barber-01"), "demo-barber-01@mysaloon.demo")

    def test_demo_salon_cover_cdn(self):
        salon = type("Salon", (), {"description": "DEMO_MYSALOON: test", "slug": "demo-salon-01", "cover_image": None})()
        self.assertTrue(is_mock_salon(salon))
        self.assertTrue(mock_cover_cdn_url("demo-salon-01").startswith("https://"))
